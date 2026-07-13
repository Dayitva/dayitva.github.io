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

<!-- Lightbox Modal Overlay -->
<div id="hackathon-lightbox" class="lightbox" onclick="closeLightbox()">
    <button class="lightbox-close" onclick="closeLightbox(event)" aria-label="Close lightbox">&times;</button>
    <button class="lightbox-prev" onclick="changeLightboxImage(-1, event)" aria-label="Previous image">&#10094;</button>
    <div class="lightbox-content" onclick="event.stopPropagation()">
        <img id="lightbox-img" src="" alt="Hackathon full preview" />
        <div id="lightbox-caption"></div>
    </div>
    <button class="lightbox-next" onclick="changeLightboxImage(1, event)" aria-label="Next image">&#10095;</button>
</div>

<script>
let currentGalleryImages = [];
let currentImageIndex = 0;
let currentEventTitle = "";

function openLightbox(thumb, event) {
    event.preventDefault();
    event.stopPropagation();

    let gallery = thumb.closest('.hackathon-photo-gallery');
    let thumbs = Array.from(gallery.querySelectorAll('.hackathon-gallery-thumb'));
    currentGalleryImages = Array.from(gallery.querySelectorAll('.hackathon-gallery-img')).map(img => img.src);
    currentImageIndex = thumbs.indexOf(thumb);
    
    let row = thumb.closest('.hackathon-row');
    currentEventTitle = row.querySelector('.section-feed-title').textContent;

    updateLightbox();
    
    let lightbox = document.getElementById('hackathon-lightbox');
    // Move lightbox to body root so it's outside <main> and won't be blurred/scaled
    if (lightbox.parentElement !== document.body) {
        document.body.appendChild(lightbox);
    }
    lightbox.classList.add('is-active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // prevent background scrolling
    document.body.classList.add('lightbox-active');
    // Also block navbar clicks
    let navbar = document.querySelector('.navbar');
    if (navbar) navbar.style.pointerEvents = 'none';

    // Add keyboard listeners
    document.addEventListener('keydown', handleLightboxKeydown);
}

function closeLightbox(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    let lightbox = document.getElementById('hackathon-lightbox');
    lightbox.classList.remove('is-active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // restore scrolling
    document.body.classList.remove('lightbox-active');
    // Restore navbar clicks
    let navbar = document.querySelector('.navbar');
    if (navbar) navbar.style.pointerEvents = '';
    document.removeEventListener('keydown', handleLightboxKeydown);
}

function updateLightbox() {
    let img = document.getElementById('lightbox-img');
    let caption = document.getElementById('lightbox-caption');
    
    img.src = currentGalleryImages[currentImageIndex];
    caption.textContent = `${currentEventTitle} (${currentImageIndex + 1} / ${currentGalleryImages.length})`;
}

function changeLightboxImage(dir, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    currentImageIndex = (currentImageIndex + dir + currentGalleryImages.length) % currentGalleryImages.length;
    updateLightbox();
}

function handleLightboxKeydown(event) {
    if (event.key === 'Escape') {
        closeLightbox();
    } else if (event.key === 'ArrowLeft') {
        changeLightboxImage(-1);
    } else if (event.key === 'ArrowRight') {
        changeLightboxImage(1);
    }
}
</script>
