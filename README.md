      _                 ___     ___               
  ___| | ___  _   _  __| \ \   / (_) _____      __
 / __| |/ _ \| | | |/ _` |\ \ / /| |/ _ \ \ /\ / /
| (__| | (_) | |_| | (_| | \ V / | |  __/\ V  V / 
 \___|_|\___/ \__,_|\__,_|  \_/  |_|\___| \_/\_/  

Laravel CloudView
CloudView is a powerful and intuitive GUI package for Laravel applications, designed to help developers and administrators easily view and export database information. Whether you're inspecting your application's default database or connecting to external cloud databases like PostgreSQL on Laravel Cloud, CloudView provides a seamless experience right from your browser.

Features
Database Overview: Browse a list of all tables in your connected database.

Dynamic Connections: Connect to any supported database (MySQL, PostgreSQL, SQLite, SQL Server) by providing credentials directly in the GUI.

Table Data Viewer: Select any table and view its contents directly in the browser.

CSV Export: Export table data to a CSV file with a single click.

Artisan Welcome: A friendly welcome message with an ASCII logo in your terminal.

Installation
You can install CloudView via Composer.

Require the Package:
From the root of your Laravel application, run:

composer require jasontorres/cloud-view


Publish Assets:
After installation, publish the package's frontend assets (JavaScript and CSS) to your application's public directory:

php artisan vendor:publish --tag=cloudview-assets


Clear Caches:
It's good practice to clear Laravel's caches after installing a new package:

php artisan optimize:clear


Database Setup (if viewing application's default DB):
Ensure your Laravel application's .env file has correct database credentials and run migrations to create tables (if you haven't already):

php artisan migrate
# If you have seeders for sample data:
# php artisan db:seed


(Optional) Show Welcome Message After Installation:
If you wish to see the CloudView ASCII logo and welcome message immediately after composer require (or composer update), add the following script to the scripts section of your application's composer.json file.

"scripts": {
    // ... other existing scripts ...
    "post-install-cmd": [
        "@php artisan cloudview:welcome",
        "@php artisan optimize:clear" // Ensure caches are cleared for your package to be discovered
    ],
    "post-update-cmd": [
        "@php artisan cloudview:welcome",
        "@php artisan optimize:clear"
    ]
},

After adding this, the logo will appear whenever you run composer install or composer update in your application.

Usage
Accessing the GUI
Once installed and assets are published, start your Laravel development server:

php artisan serve


Then, open your web browser and navigate to:

http://127.0.0.1:8000/cloudview


(Replace http://127.0.0.1:8000 with your actual application URL if different.)

Connecting to External Databases
On the CloudView GUI page, you will see a "Connect to Database" form. Enter the credentials for your desired database (e.g., your Laravel Cloud PostgreSQL instance) and click "Connect".

Example PostgreSQL credentials for Laravel Cloud:

Driver: pgsql

Host: ep-cold-boat-a59adbys.aws-us-east-2.pg.laravel.cloud

Port: 5432

Database Name: main

Username: laravel

Password: npg_zpAtl9r3DKVc

Viewing and Exporting Data
After successfully connecting, a dropdown will populate with available tables. Select a table to view its data. You can then click "Export to CSV" to download the data.

CloudView Welcome Command
You can also run a special Artisan command to see a welcome message and the CloudView ASCII logo in your terminal:

php artisan cloudview:welcome


Troubleshooting
404 Not Found for app.js or app.css: Ensure you've run php artisan vendor:publish --tag=cloudview-assets and your server is restarted.

500 Internal Server Error on API calls: Check your Laravel application's logs (storage/logs/laravel.log) for detailed PHP errors. This often indicates a database connection issue or a problem in the CloudviewController.

405 Method Not Allowed on API calls: Ensure your package's routes/api.php explicitly defines POST routes for /api/cloudview/tables and /api/cloudview/table/{tableName}.

White Screen / No Content: Open your browser's developer console (F12) and check for JavaScript errors. Ensure the cloudview-root div is not empty in the Elements tab.

Illuminate\Database\SQLiteConnection::getDoctrineSchemaManager does not exist: This was fixed in CloudviewController.php using driver-specific queries. Ensure your package's CloudviewController.php is up-to-date.

Developed by Jason Torres