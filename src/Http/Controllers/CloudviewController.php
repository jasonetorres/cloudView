<?php

namespace Jasontorres\CloudView\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class CloudviewController extends Controller
{
    public function index()
    {
        return view('cloudview::index');
    }

    private function configureDynamicDbConnection(Request $request)
    {
        $dbConnection = $request->input('db_connection');
        $dbHost = $request->input('db_host');
        $dbPort = $request->input('db_port');
        $dbDatabase = $request->input('db_database');
        $dbUsername = $request->input('db_username');
        $dbPassword = $request->input('db_password');

        if ($dbConnection && $dbHost && $dbPort && $dbDatabase && $dbUsername && $dbPassword) {
            // Store to session securely
            $this->storeConnectionInSession($request);

        } else {
            // Attempt to load from session
            $dbConnection = session('cloudview.db_connection');
            $dbHost = session('cloudview.db_host');
            $dbPort = session('cloudview.db_port');
            $dbDatabase = session('cloudview.db_database');
            $dbUsername = session('cloudview.db_username');
            $dbPassword = session('cloudview.db_password') ? Crypt::decrypt(session('cloudview.db_password')) : null;
        }

        if ($dbConnection && $dbHost && $dbPort && $dbDatabase && $dbUsername && $dbPassword) {
            $config = [
                'driver' => $dbConnection,
                'host' => $dbHost,
                'port' => $dbPort,
                'database' => $dbDatabase,
                'username' => $dbUsername,
                'password' => $dbPassword,
                'charset' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
                'prefix' => '',
                'strict' => true,
                'engine' => null,
            ];

            if ($dbConnection === 'pgsql') {
                $config['sslmode'] = 'prefer';
            }

            Config::set('database.connections.dynamic_db', $config);
            DB::purge('dynamic_db');
            DB::reconnect('dynamic_db');
            DB::setDefaultConnection('dynamic_db');

            \Log::info("Connected using dynamic config: $dbConnection@$dbHost:$dbPort/$dbDatabase");
        } else {
            DB::setDefaultConnection(Config::get('database.default'));
            DB::purge(Config::get('database.default'));
            DB::reconnect(Config::get('database.default'));

            \Log::info("Using default DB connection (fallback).");
        }
    }

    private function storeConnectionInSession(Request $request)
    {
        session([
            'cloudview.db_connection' => $request->input('db_connection'),
            'cloudview.db_host' => $request->input('db_host'),
            'cloudview.db_port' => $request->input('db_port'),
            'cloudview.db_database' => $request->input('db_database'),
            'cloudview.db_username' => $request->input('db_username'),
            'cloudview.db_password' => Crypt::encrypt($request->input('db_password')),
        ]);
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
                    break;
            }

            $filtered = array_filter($tables, fn($t) => !Str::startsWith($t, [
                'migrations', 'failed_jobs', 'personal_access_tokens', 'sessions',
                'telescope_', 'horizon_', 'jobs', 'job_batches', 'cache'
            ]));

            return response()->json(array_values($filtered));
        } catch (\Exception $e) {
            \Log::error("Table fetch error: " . $e->getMessage());
            return response()->json(['error' => 'Could not retrieve table list.'], 500);
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
            \Log::error("Data fetch error for $tableName: " . $e->getMessage());
            return response()->json(['error' => 'Error fetching table data.'], 500);
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
                'Content-Disposition' => "attachment; filename={$tableName}.csv",
            ];

            $callback = function () use ($tableName) {
                $file = fopen('php://output', 'w');
                $data = DB::table($tableName)->cursor();

                $firstRow = true;
                foreach ($data as $row) {
                    $rowArray = (array) $row;
                    if ($firstRow) {
                        fputcsv($file, array_keys($rowArray));
                        $firstRow = false;
                    }
                    fputcsv($file, $rowArray);
                }
                fclose($file);
            };

            return Response::stream($callback, 200, $headers);
        } catch (\Exception $e) {
            \Log::error("CSV export error: " . $e->getMessage());
            abort(500, 'Error exporting CSV.');
        }
    }
}
