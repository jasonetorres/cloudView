<?php

use Illuminate\Support\Facades\Route;
use Jasontorres\CloudView\Http\Controllers\CloudviewController;

// Group API routes under 'api' middleware for stateless behavior (optional, but good practice)
Route::group(['middleware' => ['api'], 'prefix' => 'api/cloudview'], function () {
    // Get all table names
    Route::get('tables', [CloudviewController::class, 'getTables']);
    // Get data for a specific table
    Route::get('table/{tableName}', [CloudviewController::class, 'getTableData']);
    // Export data to CSV
    Route::get('table/{tableName}/export/csv', [CloudviewController::class, 'exportTableToCsv']);
});