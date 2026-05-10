---
layout: Post
permalink: /about
title: About
content-type: static
---

<div class="manuscript-numbered">

<p class="home-bio drop-cap">{{ site.data.about.about }}</p>

<div class="home-social">
{%- for link in site.data.social -%}
  {%- if link.url and link.url != "" -%}
    <a href="{{ link.url }}">{{ link.label }}</a>
  {%- endif -%}
{%- endfor -%}
</div>

{% include Ornament.html %}

{% assign work_items = site.data.work | where: "category", "work" %}
<h3 class="section-heading">Work</h3>
{% include SectionFeed.html data=work_items kind="work" %}

{% include Ornament.html %}

{% assign fellowship_items = site.data.work | where: "category", "fellowship" %}
<h3 class="section-heading">Fellowships</h3>
{% include SectionFeed.html data=fellowship_items kind="work" %}

{% include Ornament.html %}

{% assign education_items = site.data.work | where: "category", "education" %}
<h3 class="section-heading">Education</h3>
{% include SectionFeed.html data=education_items kind="work" %}

{% include Ornament.html %}

<h3 class="section-heading">Volunteering</h3>
{% include SectionFeed.html data=site.data.volunteering kind="volunteering" %}

</div>
