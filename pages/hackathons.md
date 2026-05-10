---
layout: Post
permalink: /hackathons
title: Hackathons
content-type: static
---

<div class="manuscript-numbered">

Weekend builds, mostly at ETHGlobal — plus mentor and judge slots. Hover a row to see the sponsors the team shipped against.

{% include Ornament.html %}

{% assign built = site.data.hackathons | where: "role", "built" %}
{% if built.size > 0 %}
<h3 class="section-heading">Built</h3>
{% include SectionFeed.html data=built kind="hackathon" %}
{% endif %}

{% comment %}
  Advisory section — loops over the whole data array in YAML order so the
  user's "latest first" ordering is preserved across mentored/judged/both.
{% endcomment %}
{% assign has_advisory = false %}
{% for entry in site.data.hackathons %}
  {% if entry.role == "mentored" or entry.role == "judged" or entry.role == "both" %}
    {% assign has_advisory = true %}
    {% break %}
  {% endif %}
{% endfor %}
{% if has_advisory %}
{% include Ornament.html %}
<h3 class="section-heading">Mentored &amp; Judged</h3>
<div class="section-feed">
{% for entry in site.data.hackathons %}
  {% if entry.role == "mentored" or entry.role == "judged" or entry.role == "both" %}
    {% include HackathonRow.html entry=entry %}
  {% endif %}
{% endfor %}
</div>
{% endif %}

</div>

<script>
function cycleHackathonPhotos(deck, event) {
    // Prevent the link from triggering
    event.preventDefault();
    event.stopPropagation();
    
    // Find all photo wraps inside this deck
    let wraps = Array.from(deck.querySelectorAll('.hackathon-photo-wrap'));
    if (wraps.length <= 1) return;
    
    // The current top photo is the first one in the DOM.
    // Move it to the end of the DOM.
    let topPhoto = wraps[0];
    deck.appendChild(topPhoto);
    
    // Re-assign z-indexes based on new DOM order so the stack continues to work properly
    let newWraps = Array.from(deck.querySelectorAll('.hackathon-photo-wrap'));
    newWraps.forEach((wrap, index) => {
        wrap.style.zIndex = 10 - index;
    });
}
</script>
