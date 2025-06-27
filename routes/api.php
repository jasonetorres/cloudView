<?php

use Illuminate\Support\Facades\Route;
use Jasontorres\CloudView\Http\Controllers\CloudviewController;

Route::group(['middleware' => ['api'], 'prefix' => 'api/cloudview'], function () {
   
    Route::post('tables', [CloudviewController::class, 'getTables']); 
    Route::post('table/{tableName}', [CloudviewController::class, 'getTableData']); // 
    Route::get('table/{tableName}/export/csv', [CloudviewController::class, 'exportTableToCsv']);
});