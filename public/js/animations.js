gsap.registerPlugin(ScrollTrigger);

const mm = gsap.matchMedia();

mm.add('(min-width: 769px)', () => {

  /* ---- NAV ---- */
  gsap.from('.nav-link', {
    y: -20, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out', delay: 0.2,
  });

  gsap.from('.btn-nav', {
    y: -20, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out', delay: 0.6,
  });

  /* ---- SPLIT HERO ---- */
  var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.from('.hero-heading', { y: 60, opacity: 0, duration: 0.9 }, 0.2)
    .from('.hero-description', { y: 25, opacity: 0, duration: 0.6 }, 0.7)
    .from('.hero-buttons .btn', { y: 20, opacity: 0, stagger: 0.12, duration: 0.5 }, 0.9)
    .from('.hero-trust-row .hero-trust-badge', { y: 12, opacity: 0, stagger: 0.06, duration: 0.4 }, 1.1);

  /* ---- STATS COUNTERS ---- */
  document.querySelectorAll('.stat-number').forEach((el) => {
    const target = parseInt(el.dataset.target);
    if (!target) return;
    gsap.from(el, {
      innerText: 0, duration: 2.5, ease: 'power2.out', snap: { innerText: 1 },
      scrollTrigger: { trigger: '.stats-bar', start: 'top 90%' },
      onUpdate: function () { el.innerText = Math.round(this.targets()[0].innerText); },
    });
  });

  /* ---- SERVICES PREVIEW CARDS ---- */
  gsap.from('.service-card', {
    y: 60, opacity: 0, stagger: 0.2, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '.services-preview', start: 'top 80%' },
  });

  /* ---- TESTIMONIALS ---- */
  gsap.from('.testimonial-card', {
    y: 50, opacity: 0, stagger: 0.2, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '.testimonials', start: 'top 80%' },
  });

  /* ---- TRANSFORMATIONS TEASER CARDS ---- */
  gsap.from('.transformation-card', {
    y: 50, opacity: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.transformations-teaser', start: 'top 85%' },
  });

  /* ---- FINAL CTA ---- */
  gsap.from('.final-cta h2, .final-cta-text, .final-cta-buttons', {
    y: 40, opacity: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.final-cta', start: 'top 85%' },
  });

  /* ===== SHARED PAGE ELEMENTS ===== */

  /* ---- PAGE HERO REVEAL ---- */
  gsap.from('.page-hero .section-tag', {
    y: 30, opacity: 0, duration: 0.6, ease: 'power2.out', delay: 0.1,
  });

  gsap.from('.page-hero h1', {
    y: 60, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.3,
  });

  gsap.from('.page-hero .hero-gold-line', {
    scaleX: 0, duration: 1, ease: 'power3.inOut', delay: 0.6,
    transformOrigin: 'center',
  });

  gsap.from('.services-hero-sub, .ebooks-hero-sub, .transformations-hero-sub, .contact-hero-sub', {
    y: 30, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.5,
  });

  /* ---- SERVICE DETAIL SECTIONS ---- */
  gsap.utils.toArray('.service-detail').forEach((section, i) => {
    const content = section.querySelector('.service-detail-content');
    const visual = section.querySelector('.service-detail-visual');
    const num = section.querySelector('.service-number');

    const isEven = i % 2 === 1;

    gsap.from(num, {
      scale: 2, opacity: 0, duration: 0.8, ease: 'power2.out',
      scrollTrigger: { trigger: section, start: 'top 80%' },
    });

    gsap.from(content, {
      x: isEven ? 60 : -60, opacity: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 78%' },
    });

    gsap.from(visual, {
      x: isEven ? -60 : 60, opacity: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 78%' },
    });
  });

  /* ---- CLINICAL SERVICES CARDS ---- */
  gsap.from('.clinical-services .service-card', {
    y: 50, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.clinical-services', start: 'top 80%' },
  });

  /* ---- ABOUT STORY SECTIONS ---- */
  gsap.utils.toArray('.about-story').forEach(section => {
    const visual = section.querySelector('.about-story-visual');
    const content = section.querySelector('.about-story-content');
    const num = section.querySelector('.about-story-number');

    gsap.from(num, {
      scale: 2.5, opacity: 0, duration: 0.8, ease: 'power2.out',
      scrollTrigger: { trigger: section, start: 'top 80%' },
    });

    gsap.from(visual, {
      x: visual && visual.closest('.about-story-inner')?.querySelector('.about-story-content') === visual?.previousElementSibling ? 60 : -60,
      opacity: 0, duration: 1,
      scrollTrigger: { trigger: section, start: 'top 72%' },
    });

    gsap.from(content, {
      y: 40, opacity: 0, duration: 1,
      scrollTrigger: { trigger: section, start: 'top 72%' },
    });
  });

  /* ---- CERT CARDS ---- */
  gsap.from('.cert-card', {
    y: 40, opacity: 0, stagger: 0.04, duration: 0.6, ease: 'power2.out',
    scrollTrigger: { trigger: '.certs-grid', start: 'top 85%' },
  });

  /* ---- MEMBERSHIP CARDS ---- */
  gsap.from('.membership-card', {
    y: 40, opacity: 0, stagger: 0.12, duration: 0.7, ease: 'power3.out',
    scrollTrigger: { trigger: '.memberships-grid', start: 'top 85%' },
  });

  /* ---- E-BOOK SECTIONS ---- */
  gsap.utils.toArray('.ebook-section').forEach(section => {
    const cover = section.querySelector('.ebook-cover-frame');
    const content = section.querySelector('.ebook-content-col');
    const isAlt = section.classList.contains('ebook-section-alt');

    gsap.from(cover, {
      x: isAlt ? 60 : -60, opacity: 0, scale: 0.95, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 75%' },
    });

    gsap.from(content, {
      x: isAlt ? -60 : 60, opacity: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 75%' },
    });
  });

  /* ---- TRANSFORMATIONS GRID ---- */
  gsap.from('.transform-card', {
    y: 40, opacity: 0, stagger: 0.08, duration: 0.6, ease: 'power2.out',
    scrollTrigger: { trigger: '.transform-grid', start: 'top 85%' },
  });

  /* ---- CONTACT PAGE ---- */
  gsap.from('.contact-info-col', {
    x: -60, opacity: 0, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '.contact-grid', start: 'top 80%' },
  });

  gsap.from('.contact-form-col', {
    x: 60, opacity: 0, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '.contact-grid', start: 'top 80%' },
  });

  /* ---- RESULTS GALLERY ---- */
  gsap.from('.results-header .section-tag', {
    y: 20, opacity: 0, duration: 0.5, ease: 'power2.out',
    scrollTrigger: { trigger: '.results-gallery', start: 'top 85%' },
  });

  gsap.from('.results-heading', {
    y: 30, opacity: 0, duration: 0.6, ease: 'power3.out',
    scrollTrigger: { trigger: '.results-gallery', start: 'top 83%' },
  });

  gsap.utils.toArray('.img-card').forEach((card, i) => {
    gsap.to(card, {
      y: 8 - i * 2,
      duration: 2.5 + i * 0.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: i * 0.15,
    });
  });

  /* ---- DIAGNOSTIC SUITE (index) ---- */
  gsap.from('.diag-sidebar', {
    x: -50, opacity: 0, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.diagnostic-suite', start: 'top 75%' },
  });

  gsap.from('.diag-main', {
    x: 50, opacity: 0, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.diagnostic-suite', start: 'top 75%' },
  });

  /* ---- HOVER SLIDER (index) ---- */
  gsap.from('.hover-slider-header .section-tag', {
    y: 20, opacity: 0, duration: 0.5, ease: 'power2.out',
    scrollTrigger: { trigger: '.hover-slider', start: 'top 85%' },
  });

  gsap.from('.hover-slider-heading', {
    y: 30, opacity: 0, duration: 0.6, ease: 'power3.out',
    scrollTrigger: { trigger: '.hover-slider', start: 'top 83%' },
  });

  gsap.from('.hover-slider-item', {
    y: 30, opacity: 0, stagger: 0.1, duration: 0.6, ease: 'power3.out',
    scrollTrigger: { trigger: '.hover-slider', start: 'top 80%' },
  });

  gsap.from('.hover-slider-images', {
    x: 40, opacity: 0, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.hover-slider', start: 'top 80%' },
  });

});

/* ---- HOVER SLIDER INTERACTION (character stagger + image switch) ---- */
(function() {
  var items = document.querySelectorAll('.hover-slider-item');
  var images = document.querySelectorAll('.hover-slider-img');
  if (!items.length || !images.length) return;

  // Set initial image state: first visible, rest hidden
  gsap.set(images, { clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)' });
  gsap.set(images[0], { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' });

  // Split each item's text into character spans for stagger animation
  items.forEach(function(item) {
    var text = item.textContent;
    item.innerHTML = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var wrapper = document.createElement('span');
      wrapper.className = 'hover-char';
      var out = document.createElement('span');
      out.className = 'hover-char-out';
      out.textContent = ch === ' ' ? '\u00A0' : ch;
      var inn = document.createElement('span');
      inn.className = 'hover-char-in';
      inn.textContent = ch === ' ' ? '\u00A0' : ch;
      wrapper.appendChild(out);
      wrapper.appendChild(inn);
      item.appendChild(wrapper);
    }
  });

  // Set first item's characters to active state (out up, in visible)
  gsap.set(items[0].querySelectorAll('.hover-char-out'), { y: '-110%' });
  gsap.set(items[0].querySelectorAll('.hover-char-in'), { y: '0%' });

  var currentIdx = 0;

  items.forEach(function(item, itemIndex) {
    item.addEventListener('mouseenter', function() {
      var idx = parseInt(item.dataset.index);
      if (idx === currentIdx) return;

      // Update text colors
      items.forEach(function(el) { el.style.color = ''; });
      item.style.color = 'var(--gold)';

      // Deactivate previous item's characters (animate back to default)
      var prevOut = items[currentIdx].querySelectorAll('.hover-char-out');
      var prevIn = items[currentIdx].querySelectorAll('.hover-char-in');
      gsap.to(prevOut, { y: '0%', duration: 0.3, stagger: 0.025, ease: 'power2.out' });
      gsap.to(prevIn, { y: '110%', duration: 0.3, stagger: 0.025, ease: 'power2.out' });

      // Activate current item's characters (out up, in from below)
      var curOut = item.querySelectorAll('.hover-char-out');
      var curIn = item.querySelectorAll('.hover-char-in');
      gsap.to(curOut, { y: '-110%', duration: 0.3, stagger: 0.025, ease: 'power2.out' });
      gsap.to(curIn, { y: '0%', duration: 0.3, stagger: 0.025, ease: 'power2.out' });

      currentIdx = idx;

      // Switch images via clip-path
      images.forEach(function(img, i) {
        if (i === idx) {
          gsap.to(img, {
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
            duration: 0.6, ease: 'power2.inOut',
          });
        } else {
          gsap.to(img, {
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
            duration: 0.4, ease: 'power2.inOut',
          });
        }
      });
    });
  });
})();

mm.add('(max-width: 768px)', () => {
  gsap.from('.hero-heading, .hero-description, .hero-buttons, .hero-trust-row', {
    y: 30, opacity: 0, duration: 0.8, stagger: 0.2, ease: 'power2.out',
  });

  gsap.from('[data-aos]', {
    y: 20, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power1.out',
    scrollTrigger: { trigger: '[data-aos]', start: 'top 90%' },
  });
});
