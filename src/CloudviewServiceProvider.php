<?php

namespace Jasontorres\CloudView;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;
use Jasontorres\CloudView\Console\Commands\ShowCloudviewLogo;
use function config_path;
use function public_path;

class CloudviewServiceProvider extends ServiceProvider
{
    /**
     * Register any package services.
     *
     * @return void
     */
    public function register()
    {
        // Merge package configuration (optional, if you create config/cloudview.php)
        $this->mergeConfigFrom(
            __DIR__.'/../config/cloudview.php', 'cloudview'
        );
    }

    /**
     * Bootstrap any package services.
     *
     * @return void
     */
    public function boot()
    {
        // Load package views (e.g., resources/views/index.blade.php)
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'cloudview');

        // Load package web routes
        $this->loadRoutesFrom(__DIR__.'/../routes/web.php');

        // Load package API routes
        $this->loadRoutesFrom(__DIR__.'/../routes/api.php');

        // --- FIXED ASSET PUBLISHING ---
        // Publish specific subdirectories (js and css) from the package's public folder
        // to prevent a nested 'public' folder in the main application's vendor assets.
        $this->publishes([
            __DIR__.'/../public/js' => public_path('vendor/cloudview/js'),
            __DIR__.'/../public/css' => public_path('vendor/cloudview/css'),
        ], 'cloudview-assets');
        // --- END FIXED ASSET PUBLISHING ---


        // Optionally publish configuration
        $this->publishes([
            __DIR__.'/../config/cloudview.php' => config_path('cloudview.php'),
        ], 'cloudview-config');

        // Register Artisan commands
        if ($this->app->runningInConsole()) {
            $this->commands([
                ShowCloudviewLogo::class,
            ]);
        }
    }
}
