const mix = require('laravel-mix');
const tailwindcss = require('tailwindcss');

mix.js('public/js/bootstrap.js', 'public/js')
   .react() // Chain .react() here
   .postCss('public/css/app.css', 'public/css', [
       tailwindcss('./tailwind.config.js'),
       require('autoprefixer'),
   ])
   .setPublicPath('public'); // This sets the output path within your package
