{% extends "./layouts/default.swig" %}

{% block title %}Image Cropper{% endblock %}

{% block scripts %}
<script src="/bower/jquery/jquery.min.js"></script>
<script src="/js/jquery.mobile.vmouse.js"></script>
<script src="/js/script.js"></script>
{% endblock %}

{% block content %}
<div class="toolbar">
    <div class="status pull-left">
        <div>
            <span id="online-status"></span>
            <span id="sync-status"></span>
        </div>
        <div id="save-status"></div>
    </div>
    <canvas id="preview" width="40" height="40"></canvas>
    <button id="done" class="pull-right">Done &raquo;</button>
</div>
{% endblock %}