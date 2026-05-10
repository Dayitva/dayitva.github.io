---
layout: Post
permalink: /travel
title: Travel
content-type: static
published: false
---

<div class="travel-gallery">
{% for entry in site.data.travel %}
    <div class="travel-stamp-wrap" title="{{ entry.city }}, {{ entry.country }}">
        {% include TravelStamp.html entry=entry %}
    </div>
{% endfor %}
</div>

<p class="travel-footer">
    The stamps above are the stays that left a mark. A running tally of every city I've set foot in lives on <a href="https://beeneverywhere.net/user/39774?t=unp">beeneverywhere.net</a>.
</p>
