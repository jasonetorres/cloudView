<?php

namespace Jasontorres\CloudView\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Config; // <-- ADDED: Import the Config facade

class CloudviewController extends Controller
{
    /**
     * Displays the main GUI page.
     * This will load your React app via a Blade view.
     */
    public function index()
    {
        return view('cloudview::index'); // Refers to resources/views/index.blade.php
    }

    /**
     * Helper method to configure and reconnect to a dynamic database connection.
     * This method will read database parameters from the incoming request.
     *
     * @param Request $request
     * @return void
     */
    private function configureDynamicDbConnection(Request $request)
    {
        // Extract database configuration from the request
        // Frontend should send these as JSON in a POST request body
        // or as query parameters (less secure for sensitive data)
        $dbConnection = $request->input('db_connection', null);
        $dbHost = $request->input('db_host', null);
        $dbPort = $request->input('db_port', null);
        $dbDatabase = $request->input('db_database', null);
        $dbUsername = $request->input('db_username', null);
        $dbPassword = $request->input('db_password', null);

        // If all required custom connection details are provided, set up a new connection
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

            // For PostgreSQL, specifically ensure 'sslmode' is handled if needed by Laravel Cloud.
            // Laravel Cloud's PostgreSQL might require SSL.
            if ($dbConnection === 'pgsql') {
                 // Common options for PGSQL, adjust as per Laravel Cloud's specific requirements
                 // For Laravel Cloud, 'sslmode' => 'require' or 'prefer' might be needed.
                 $config['sslmode'] = 'prefer'; // Or 'require' depending on setup
                 // You might also need:
                 // $config['options'] = [
                 //     PDO::PGSQL_ATTR_SSL_MODE => PDO::PGSQL_SSLMODE_PREFER,
                 // ];
            }

            // Dynamically set the database configuration for a new connection named 'dynamic_db'
            Config::set('database.connections.dynamic_db', $config);

            // Purge and reconnect to use the new dynamic connection for this request
            DB::purge('dynamic_db');
            DB::reconnect('dynamic_db');
            DB::setDefaultConnection('dynamic_db'); // Set this as the default for the current request context

            \Log::info("Dynamically reconnected to: {$dbConnection}://{$dbUsername}@{$dbHost}:{$dbPort}/{$dbDatabase}");

        } else {
            // If no dynamic config is provided, ensure we are using the default connection
            // This is important to revert to the default app DB if no custom connection is provided
            DB::setDefaultConnection(Config::get('database.default'));
            DB::purge(Config::get('database.default'));
            DB::reconnect(Config::get('database.default'));
            \Log::info("Using default application database connection.");
        }
    }

    /**
     * Get a list of all table names in the database.
     * @param Request $request // <-- ADDED: Request parameter to receive dynamic DB details
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTables(Request $request)
    {
        // <-- ADDED: Configure dynamic connection if parameters are provided in the request
        $this->configureDynamicDbConnection($request);

        try {
            $db = DB::connection();
            $tables = [];

            // Use driver-specific queries to get table names
            switch ($db->getDriverName()) {
                case 'sqlite':
                    // For SQLite, query sqlite_master table
                    $results = $db->select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'geometry_%'");
                    foreach ($results as $table) {
                        $tables[] = $table->name;
                    }
                    break;
                case 'mysql':
                    // For MySQL, use SHOW TABLES
                    $results = $db->select('SHOW TABLES');
                    // Extract table names from the result objects
                    $tables = array_map('current', json_decode(json_encode($results), true));
                    break;
                case 'pgsql':
                    // For PostgreSQL, query pg_tables
                    // Ensure the 'public' schema is correct for your Laravel Cloud setup
                    $results = $db->select("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
                    foreach ($results as $table) {
                        $tables[] = $table->tablename;
                    }
                    break;
                case 'sqlsrv':
                    // For SQL Server, query INFORMATION_SCHEMA.TABLES
                    $results = $db->select("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG = ? AND TABLE_SCHEMA = ?", [$db->getDatabaseName(), 'dbo']);
                    foreach ($results as $table) {
                        $tables[] = $table->TABLE_NAME;
                    }
                    break;
                default:
                    // Fallback using Doctrine's SchemaManager if the driver supports it
                    $tables = $db->getDoctrineSchemaManager()->listTableNames();
                    break;
            }

            // Filter out common internal Laravel tables and framework-specific tables
            $filteredTables = array_filter($tables, function ($table) {
                return !Str::startsWith($table, [
                    'migrations',
                    'failed_jobs',
                    'password_reset_tokens',
                    'personal_access_tokens',
                    'sessions',
                    'telescope_entries',
                    'telescope_entries_tags',
                    'telescope_monitoring',
                    'horizon_batches',
                    'cache',
                    'jobs',
                    'job_batches',
                    // Add any other specific tables you want to hide here
                ]);
            });

            // Return the filtered list of table names as JSON
            return response()->json(array_values($filteredTables));

        } catch (\Exception $e) {
            // Log the detailed error for debugging purposes
            \Log::error("Error fetching table list with dynamic connection: " . $e->getMessage());
            // Return a generic 500 error to the frontend
            return response()->json(['error' => 'Could not retrieve table list. A backend error occurred. Check server logs for details.'], 500);
        }
    }

    /**
     * Get data for a specific table.
     * @param string $tableName
     * @param Request $request // <-- ADDED: Request parameter to receive dynamic DB details
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTableData($tableName, Request $request)
    {
        // <-- ADDED: Configure dynamic connection if parameters are provided
        $this->configureDynamicDbConnection($request);

        try {
            // Use Schema::hasTable for a robust check
            // Note: Schema::hasTable might still use the *default* connection or cached schema info.
            // For truly dynamic checks, you might need to query information_schema directly
            // or ensure the Schema manager is purged/reconnected specifically.
            // For now, it will use the connection set by configureDynamicDbConnection.
            if (!Schema::hasTable($tableName)) {
                // If the table is not found, it might be due to incorrect connection or schema
                \Log::warning("Table '{$tableName}' not found for configured connection.");
                return response()->json(['error' => 'Table not found or not accessible via the current connection.'], 404);
            }

            // Fetch all data from the table
            // You might want to add pagination for large tables in a real app
            $data = DB::table($tableName)->get();
            return response()->json($data);
        } catch (\Exception $e) {
            \Log::error("Error fetching data for table '{$tableName}' with dynamic connection: " . $e->getMessage());
            return response()->json(['error' => 'Error retrieving table data. Check connection details, table name, or permissions.'], 500);
        }
    }

    /**
     * Export data for a specific table to CSV.
     * @param string $tableName
     * @param Request $request // <-- ADDED: Request parameter to receive dynamic DB details
     * @return \Symfony\Component\HttpFoundation\StreamedResponse
     */
    public function exportTableToCsv($tableName, Request $request)
    {
        // <-- ADDED: Configure dynamic connection if parameters are provided
        $this->configureDynamicDbConnection($request);

        try {
            if (!Schema::hasTable($tableName)) {
                abort(404, 'Table not found or not accessible via the current connection.');
            }

            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $tableName . '.csv"',
            ];

            $callback = function () use ($tableName) {
                $file = fopen('php://output', 'w');
                // Use cursor() for large datasets to avoid memory issues
                $data = DB::table($tableName)->cursor();

                $firstRow = true;
                foreach ($data as $row) {
                    $rowArray = (array) $row; // Cast object to array
                    if ($firstRow) {
                        fputcsv($file, array_keys($rowArray)); // Write headers
                        $firstRow = false;
                    }
                    fputcsv($file, $rowArray); // Write data row
                }
                fclose($file);
            };

            return Response::stream($callback, 200, $headers);

        } catch (\Exception $e) {
            \Log::error("Error exporting CSV for table '{$tableName}' with dynamic connection: " . $e->getMessage());
            abort(500, 'Error exporting CSV: ' . $e->getMessage());
        }
    }
}
