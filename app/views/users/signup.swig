{% extends "../layouts/default.swig" %}

{% block title %}Signup{% endblock %}

{% block content %}
<p>Already have an account? <a href="/login">Login</a>.</p>
<form action="/users" method="post">
<div>
    <label for="email">Name</label>
    <input type="text" name="name"/>
</div>
<div>
    <label for="email">Email</label>
    <input type="email" name="email"/>
</div>
<div>
    <label for="password">Password</label>
    <input type="password" name="password"/>
</div>
<div>
    <label for="role">Role:</label>
    <input type="radio" name="role" value="user" checked/> User
    <input type="radio" name="role" value="creator"/> Creator
</div>
<input type="submit" value="Signup"/>
</form>
{% endblock %}