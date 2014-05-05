{% extends "./layouts/default.swig" %}

{% block title %}Image Cropper{% endblock %}

{% block scripts %}
<script src="/bower/localforage/dist/localforage.min.js"></script>
<script src="/bower/jquery/jquery.min.js"></script>
<script src="/js/jquery.mobile.vmouse.js"></script>
<script src="/js/taskqueue.js"></script>
<script src="/js/modules/image-select.js"></script>
<script src="/js/script.js"></script>
{% endblock %}

{% block content %}
<div id="jobs" class="task-panel"></div>
<div id="content" class="task-panel hidden">
    <div id="module" class="task-panel has-toolbar"></div>
    <div class="toolbar">
        <div class="status pull-left">
            <div>
                <span id="online-status"></span>
                <span id="sync-status"></span>
            </div>
            <div id="save-status"></div>
        </div>
        <div id="buttons" class="buttons"></div>
    </div>
</div>
{% endblock %}