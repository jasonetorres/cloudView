const mix = require('laravel-mix');
const tailwindcss = require('tailwindcss');

// Corrected: Input path should be from 'resources/js/'
mix.js('resources/js/bootstrap.js', 'public/js') // Input path and output directory
   .react() // Chain .react() here
   .postCss('resources/css/app.css', 'public/css', [
       tailwindcss('./tailwind.config.js'),
       require('autoprefixer'),
   ])
   .setPublicPath('public'); // This sets the output path within your package
