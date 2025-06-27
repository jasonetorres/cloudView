const mix = require('laravel-mix');
const tailwindcss = require('tailwindcss');


mix.js('resources/js/bootstrap.js', 'public/js/app.js') 
   .react() 
   .postCss('resources/css/app.css', 'public/css', [
       tailwindcss('./tailwind.config.js'),
       require('autoprefixer'),
   ]);

