<!DOCTYPE html>
<html{% if offline %} manifest="/offline.appcache"{% endif %}>
<head>
    <title>{% block title %}{% endblock %}</title>
    <meta name="apple-mobile-web-app-capable" content="yes"/>
    <meta name="apple-mobile-web-app-status-bar-style" content="black"/>
    <meta name="viewport" content="target-densitydpi=device-dpi, initial-scale=1.0, user-scalable=no"/>
    <link rel="stylesheet" href="/css/style.css"/>
    {% block scripts %}{% endblock %}
</head>
<body>
    {% block content %}{% endblock %}
</body>
</html>