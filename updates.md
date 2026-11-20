---
layout: page
title: Updates
---

An archive of project announcements and research notes. For recent essays, visit [Writing](/writing/).

{% assign years = site.posts | group_by_exp: "post", "post.date | date: '%Y'" %}
{% for year in years %}
<h2>{{ year.name }}</h2>
<ul class="archive">
{% for item in year.items %}
<li><time datetime="{{ item.date | date_to_xmlschema }}">{{ item.date | date: "%b %-d" }}</time><a href="{{ item.url }}">{{ item.title | escape }}</a></li>
{% endfor %}
</ul>
{% endfor %}