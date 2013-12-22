{% block content %}
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
<input type="submit" value="Signup"/>
</form>
{% endblock %}