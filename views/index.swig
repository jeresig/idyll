<!DOCTYPE html>
<html{% if offline %} manifest="/offline.appcache"{% endif %}>
<head>
    <title>Image Cropper</title>
    <meta name="apple-mobile-web-app-capable" content="yes"/>
    <meta name="apple-mobile-web-app-status-bar-style" content="black"/>
    <meta name="viewport" content="target-densitydpi=device-dpi, initial-scale=1.0, user-scalable=no"/>
    <link rel="stylesheet" href="/css/style.css"/>
    <script src="/js/jquery.js"></script>
    <script src="/js/jquery.mobile.vmouse.js"></script>
    <script src="/js/script.js"></script>
</head>
<body>
    <div class="toolbar">
        <div class="status pull-left">
            <div id="sync-status"></div>
            <div id="save-status"></div>
        </div>
        <canvas id="preview" width="40" height="40"></canvas>
        <button id="done" class="pull-right">Done &raquo;</button>
    </div>
</body>
</html>