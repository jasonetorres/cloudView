<?php

namespace Jasontorres\CloudView;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;
use Jasontorres\CloudView\Console\Commands\ShowCloudviewLogo;
use function config_path; // Explicitly import global helper function for static analysis
use function public_path; // Explicitly import global helper function for static analysis

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
        // Ensure the path is correct relative to the service provider
        $this->loadRoutesFrom(__DIR__.'/../routes/web.php');

        // Load package API routes
        // Ensure the path is correct relative to the service provider
        $this->loadRoutesFrom(__DIR__.'/../routes/api.php');

        // Publish public assets (compiled JS/CSS)
        $this->publishes([
            __DIR__.'/../public' => public_path('vendor/cloudview'),
        ], 'cloudview-assets');

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
