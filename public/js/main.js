let header, hamburger, navMenu, navLinks;

function initApp() {
  header = document.querySelector('.header');
  hamburger = document.querySelector('.hamburger');
  navMenu = document.querySelector('.nav-menu');
  navLinks = document.querySelectorAll('.nav-link');

  if (!header) return;

  // Hamburger Toggle
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('is-active');
    navMenu.classList.toggle('is-open');
    document.body.classList.toggle('no-scroll');
  });

  // Close menu on link click
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('is-active');
      navMenu.classList.remove('is-open');
      document.body.classList.remove('no-scroll');
      
      // Page Transition Flash
      const flash = document.createElement('div');
      flash.className = 'page-transition-flash';
      document.body.appendChild(flash);
      gsap.to(flash, { opacity: 0.15, duration: 0.1, onComplete: () => {
        gsap.to(flash, { opacity: 0, duration: 0.2, onComplete: () => flash.remove() });
      }});
    });
  });

  setActiveNav();
  initScrollEffects();
  initAOS();
}

function setActiveNav() {
  const page = document.body.dataset.page;
  if (!page) return;
  navLinks.forEach(link => {
    if (link.dataset.page === page) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function initScrollEffects() {
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 80) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    if (currentScroll > lastScroll && currentScroll > 200) {
      header.classList.add('hide');
    } else {
      header.classList.remove('hide');
    }

    lastScroll = currentScroll;
  }, { passive: true });
}

function initAOS() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('aos-animate');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));
}

// Global Page Load Transition
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.createElement('div');
  overlay.className = 'page-transition-overlay active';
  document.body.appendChild(overlay);
  
  window.addEventListener('load', () => {
    setTimeout(() => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 400);
    }, 100);
  });
});

document.addEventListener('partials-loaded', initApp);
