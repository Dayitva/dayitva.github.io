---
layout: Post
permalink: /books
title: Bookshelf
content-type: static
---

<div class="manuscript-numbered">

Books I've read.

{% include Ornament.html %}

<div class="bookshelf">
  {% for book in site.data.books %}
  <a href="{{ book.link }}" target="_blank" class="book-card" title="{{ book.title | escape }} by {{ book.author | escape }}">
    <div class="book-cover-wrap">
      <img src="{{ book.image_url }}" alt="Cover of {{ book.title | escape }}" class="book-cover" loading="lazy" />
      <div class="book-info-overlay">
        <span class="book-title">{{ book.title }}</span>
        <span class="book-author">{{ book.author }}</span>
        {% if book.rating and book.rating > 0 %}
        <span class="book-rating">
          {% for i in (1..book.rating) %}★{% endfor %}
        </span>
        {% endif %}
      </div>
    </div>
  </a>
  {% endfor %}
</div>

</div>
