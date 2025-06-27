<?php

namespace Jasontorres\CloudView\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CloudviewController extends Controller
{
    public function index()
    {
        return view('cloudview::index');
    }

    private function configureDynamicDbConnection(Request $request)
    {
        // 1. Try session-stored encrypted credentials
        if (session()->has('cloudview_encrypted')) {
            try {
                $decrypted = Crypt::decrypt(session('cloudview_encrypted'));
                if (is_array($decrypted)) {
                    return $this->setDbConfig($decrypted);
                }
            } catch (\Exception $e) {
                \Log::warning('Invalid session config: ' . $e->getMessage());
            }
        }

        // 2. Try .env values if enabled
        if (config('cloudview.use_env', true)) {
            $envConfig = [
                'driver' => env('CLOUDVIEW_DB_CONNECTION'),
                'host' => env('CLOUDVIEW_DB_HOST'),
                'port' => env('CLOUDVIEW_DB_PORT'),
                'database' => env('CLOUDVIEW_DB_DATABASE'),
                'username' => env('CLOUDVIEW_DB_USERNAME'),
                'password' => env('CLOUDVIEW_DB_PASSWORD'),
            ];
            if (!in_array(null, $envConfig, true)) {
                return $this->setDbConfig($envConfig);
            }
        }

        // 3. Try local config file
        $file = base_path('cloudview.local.json');
        if (file_exists($file)) {
            $json = json_decode(file_get_contents($file), true);
            if (is_array($json) && !in_array(null, array_values($json), true)) {
                return $this->setDbConfig($json);
            }
        }

        // 4. Manual input via request (used when user enters manually)
        $manual = $request->only(['db_connection', 'db_host', 'db_port', 'db_database', 'db_username', 'db_password']);
        if (!in_array(null, $manual, true)) {
            session(['cloudview_encrypted' => Crypt::encrypt($manual)]); // Save encrypted for future
            return $this->setDbConfig($manual);
        }

        // fallback to default connection
        DB::setDefaultConnection(Config::get('database.default'));
        DB::purge(Config::get('database.default'));
        DB::reconnect(Config::get('database.default'));
    }

    private function setDbConfig(array $config)
    {
        $connection = [
            'driver' => $config['driver'] ?? 'pgsql',
            'host' => $config['host'],
            'port' => $config['port'],
            'database' => $config['database'],
            'username' => $config['username'],
            'password' => $config['password'],
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => true,
            'engine' => null,
        ];

        if ($connection['driver'] === 'pgsql') {
            $connection['sslmode'] = 'prefer';
        }

        Config::set('database.connections.dynamic_db', $connection);
        DB::purge('dynamic_db');
        DB::reconnect('dynamic_db');
        DB::setDefaultConnection('dynamic_db');
    }

    public function getTables(Request $request)
    {
        $this->configureDynamicDbConnection($request);

        try {
            $db = DB::connection();
            $tables = [];

            switch ($db->getDriverName()) {
                case 'sqlite':
                    $results = $db->select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
                    foreach ($results as $table) {
                        $tables[] = $table->name;
                    }
                    break;
                case 'mysql':
                    $results = $db->select('SHOW TABLES');
                    $tables = array_map('current', json_decode(json_encode($results), true));
                    break;
                case 'pgsql':
                    $results = $db->select("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
                    foreach ($results as $table) {
                        $tables[] = $table->tablename;
                    }
                    break;
                case 'sqlsrv':
                    $results = $db->select("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
                    foreach ($results as $table) {
                        $tables[] = $table->TABLE_NAME;
                    }
                    break;
                default:
                    $tables = $db->getDoctrineSchemaManager()->listTableNames();
            }

            $filtered = array_filter($tables, fn($t) => !Str::startsWith($t, [
                'migrations', 'failed_jobs', 'password_reset_tokens',
                'personal_access_tokens', 'sessions', 'telescope_', 'horizon_', 'cache', 'jobs', 'job_batches'
            ]));

            return response()->json(array_values($filtered));
        } catch (\Exception $e) {
            \Log::error("Error fetching tables: " . $e->getMessage());
            return response()->json(['error' => 'Could not retrieve tables'], 500);
        }
    }

    public function getTableData($tableName, Request $request)
    {
        $this->configureDynamicDbConnection($request);

        try {
            if (!Schema::hasTable($tableName)) {
                return response()->json(['error' => 'Table not found.'], 404);
            }

            $data = DB::table($tableName)->get();
            return response()->json($data);
        } catch (\Exception $e) {
            \Log::error("Error fetching data for $tableName: " . $e->getMessage());
            return response()->json(['error' => 'Could not retrieve table data.'], 500);
        }
    }

    public function exportTableToCsv($tableName, Request $request)
    {
        $this->configureDynamicDbConnection($request);

        try {
            if (!Schema::hasTable($tableName)) {
                abort(404, 'Table not found.');
            }

            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"$tableName.csv\"",
            ];

            $callback = function () use ($tableName) {
                $file = fopen('php://output', 'w');
                $data = DB::table($tableName)->cursor();

                $first = true;
                foreach ($data as $row) {
                    $rowArray = (array) $row;
                    if ($first) {
                        fputcsv($file, array_keys($rowArray));
                        $first = false;
                    }
                    fputcsv($file, $rowArray);
                }

                fclose($file);
            };

            return Response::stream($callback, 200, $headers);
        } catch (\Exception $e) {
            \Log::error("Error exporting CSV for $tableName: " . $e->getMessage());
            abort(500, 'Error exporting CSV');
        }
    }
}
