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
  gsap.utils.toArray('.transform-card').forEach((card) => {
    gsap.from(card, {
      y: 40, opacity: 0, duration: 0.5, ease: 'power2.out',
      scrollTrigger: { trigger: card, start: 'top 92%' },
    });
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

  // Set initial image state: first visible, rest hidden.
  // Plain CSS opacity + .active class, not GSAP: clip-path tweens (and,
  // intermittently, other GSAP CSS-plugin properties) silently fail to
  // ever apply an inline style on this page in production, leaving whichever
  // image is last in DOM order visibly on top regardless of the active tab.
  // A CSS transition can't have that failure mode.
  images.forEach(function(img, i) { img.classList.toggle('active', i === 0); });

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
    function activate() {
      var idx = parseInt(item.dataset.index);
      currentIdx = idx;

      // Update text colors — synchronous, always correct regardless of any tween state
      items.forEach(function(el) { el.style.color = ''; });
      item.style.color = 'var(--gold)';

      items.forEach(function(el) {
        var isActive = parseInt(el.dataset.index) === idx;
        var out = el.querySelectorAll('.hover-char-out');
        var inn = el.querySelectorAll('.hover-char-in');
        gsap.killTweensOf(out);
        gsap.killTweensOf(inn);
        gsap.to(out, {
          y: isActive ? '-110%' : '0%', duration: 0.3, stagger: 0.025, ease: 'power2.out',
          overwrite: true,
          onComplete: (function (o, v) { return function () { gsap.set(o, { y: v }); }; })(out, isActive ? '-110%' : '0%'),
        });
        gsap.to(inn, {
          y: isActive ? '0%' : '110%', duration: 0.3, stagger: 0.025, ease: 'power2.out',
          overwrite: true,
          onComplete: (function (i, v) { return function () { gsap.set(i, { y: v }); }; })(inn, isActive ? '0%' : '110%'),
        });
      });

      // Switch images with a plain CSS class + transition (see note above on
      // why this isn't a GSAP tween).
      images.forEach(function(img, i) { img.classList.toggle('active', i === idx); });
    }

    item.addEventListener('mouseenter', activate);
    item.addEventListener('click', activate);
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

/* ---- VISIBILITY SAFETY NET ---- */
/* GSAP's scroll-triggered fade-ins on this page can leave a section stuck at
   its pre-animation opacity: 0 — seen when the GSAP/ScrollTrigger CDN load
   is slow or interrupted, and occasionally even after they load fine (the
   tween reports progress 1 internally but never paints). An
   IntersectionObserver-based one-shot check missed cases where an element's
   first intersection fires before it's meaningfully in view, so this polls
   instead: every 400ms, for the first 10s, force any watched element that's
   in the viewport and still invisible to show. Never overrides an animation
   that already worked — it only acts on elements stuck below the opacity
   floor. */
(function () {
  var watched = document.querySelectorAll(
    '.testimonial-card, .cert-card, .membership-card, .service-card, ' +
    '.transformation-card, .ebook-cover-frame, .ebook-content-col, [data-aos]'
  );
  if (!watched.length) return;

  function isInViewport(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight);
  }

  function sweep() {
    watched.forEach(function (el) {
      if (parseFloat(getComputedStyle(el).opacity) < 0.05 && isInViewport(el)) {
        el.style.setProperty('opacity', '1', 'important');
        el.style.setProperty('transition', 'opacity 0.25s ease', 'important');
        el.style.setProperty('transform', 'none', 'important');
      }
    });
  }

  var ticks = 0;
  var maxTicks = 25; // ~10s at 400ms
  var interval = setInterval(function () {
    sweep();
    ticks++;
    if (ticks >= maxTicks) clearInterval(interval);
  }, 400);

  window.addEventListener('scroll', sweep, { passive: true });
})();

