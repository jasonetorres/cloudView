<?php

namespace Jasontorres\CloudView\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Str;

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
     * Get a list of all table names in the database.
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTables()
    {
        try {
            // Use SchemaManager to get table names from the database connection
            $tables = DB::connection()->getDoctrineSchemaManager()->listTableNames();

            // Filter out common internal Laravel tables to keep the list clean
            $filteredTables = array_filter($tables, function ($table) {
                return !Str::startsWith($table, [
                    'migrations',
                    'failed_jobs',
                    'password_reset_tokens',
                    'personal_access_tokens',
                    'sessions' // Added common session table if it exists
                ]);
            });
            return response()->json(array_values($filteredTables));
        } catch (\Exception $e) {
            // Log the error for debugging purposes in a real application
            \Log::error("Error fetching table list: " . $e->getMessage());
            return response()->json(['error' => 'Could not retrieve table list. Database access issue.'], 500);
        }
    }

    /**
     * Get data for a specific table.
     * @param string $tableName
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTableData($tableName)
    {
        try {
            // Basic validation: ensure table exists and prevent direct SQL injection via table name
            $tables = DB::connection()->getDoctrineSchemaManager()->listTableNames();
            if (!in_array($tableName, $tables)) {
                return response()->json(['error' => 'Table not found or not allowed.'], 404);
            }

            // Fetch all data from the table
            $data = DB::table($tableName)->get();
            return response()->json($data);
        } catch (\Exception $e) {
            \Log::error("Error fetching data for table '{$tableName}': " . $e->getMessage());
            return response()->json(['error' => 'Error retrieving table data. Check table name or permissions.'], 500);
        }
    }

    /**
     * Export data for a specific table to CSV.
     * @param string $tableName
     * @return \Symfony\Component\HttpFoundation\StreamedResponse
     */
    public function exportTableToCsv($tableName)
    {
        try {
            // Basic validation
            $tables = DB::connection()->getDoctrineSchemaManager()->listTableNames();
            if (!in_array($tableName, $tables)) {
                abort(404, 'Table not found or not allowed.');
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
            \Log::error("Error exporting CSV for table '{$tableName}': " . $e->getMessage());
            abort(500, 'Error exporting CSV: ' . $e->getMessage());
        }
    }
}