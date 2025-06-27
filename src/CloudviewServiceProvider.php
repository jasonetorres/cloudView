<?php

namespace Jasontorres\CloudView;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;
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
        // Load package views
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'cloudview');

        // Load routes
        $this->loadRoutesFrom(__DIR__.'/../routes/web.php');
        $this->loadRoutesFrom(__DIR__.'/../routes/api.php');

        // Publish assets
        $this->publishes([
            __DIR__.'/../public/js' => public_path('vendor/cloudview/js'),
            __DIR__.'/../public/css' => public_path('vendor/cloudview/css'),
        ], 'cloudview-assets');

        // Publish config
        $this->publishes([
            __DIR__.'/../config/cloudview.php' => config_path('cloudview.php'),
        ], 'cloudview-config');
    }
}
