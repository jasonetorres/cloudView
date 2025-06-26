<?php

use Illuminate\Support\Facades\Route;
use Jasontorres\CloudView\Http\Controllers\CloudviewController;

// Group routes under 'web' middleware for session, CSRF protection, etc.
Route::group(['middleware' => ['web'], 'prefix' => 'cloudview'], function () {
    // This route will load the Blade view which contains your React app
    Route::get('/', [CloudviewController::class, 'index'])->name('cloudview.index');
});