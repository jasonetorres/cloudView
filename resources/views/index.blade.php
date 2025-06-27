<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laravel CloudView GUI</title>
    <!-- Load compiled CSS -->
    <link href="{{ asset('vendor/cloudview/css/app.css') }}" rel="stylesheet">
</head>
<body>
    <div id="cloudview-root"></div>

    <!-- Load compiled React JavaScript as a module -->
    <script src="{{ asset('vendor/cloudview/js/app.js') }}" type="module"></script>

    <!-- TEMPORARY DEBUGGING SCRIPT -->
    <script>
        console.log("Inline script executed: This means basic JavaScript is working.");
        alert("Inline script executed: This means basic JavaScript is working."); // Using alert for immediate visibility
    </script>
    <!-- END TEMPORARY DEBUGGING SCRIPT -->
</body>
</html>
