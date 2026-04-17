/* =============================================
   EARTHLENS AI — MAIN APP CONTROLLER
   ============================================= */

/* ---- GLOBAL UTILITY ---- */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => {
      toast.className = 'toast';
      toast.style.animation = '';
    }, 300);
  }, 3000);
}

function animateNumber(el, target, duration = 800, decimals = 0) {
  if (!el) return;
  const start = parseFloat(el.textContent) || 0;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const val = start + (target - start) * ease;
    el.textContent = decimals > 0 ? val.toFixed(decimals) : Math.round(val);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---- NAVBAR SCROLL ---- */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  // Active link highlighting
  const sections = ['ecovision', 'ecochat', 'carbon', 'earthpulse'];
  const navLinks  = sections.map(id => document.getElementById(`nav-${id}`));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          if (link) link.style.color = link.href.includes(id) ? 'var(--col-green)' : '';
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

/* ---- PARTICLES ---- */
function initParticles() {
  const container = document.getElementById('particles-bg');
  const COUNT = 25;
  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const left  = Math.random() * 100;
    const dur   = 12 + Math.random() * 18;
    const delay = Math.random() * 20;
    const drift = (Math.random() - 0.5) * 200;
    p.style.cssText = `left:${left}%;--duration:${dur}s;--delay:-${delay}s;--drift:${drift}px;`;
    container.appendChild(p);
  }
}

/* ---- SCROLL ANIMATIONS ---- */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fadeInUp');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.pulse-card, .upload-panel, .results-panel, .chat-container, .carbon-form').forEach(el => {
    observer.observe(el);
  });
}

/* ---- EARTH PULSE NARRATION ---- */
function initEarthPulse() {
  const narrateBtn  = document.getElementById('narrateBtn');
  const narrationEl = document.getElementById('narrationBody');

  narrateBtn.addEventListener('click', async () => {
    narrateBtn.disabled = true;
    narrateBtn.textContent = '⏳ Generating...';
    narrationEl.innerHTML = '<span class="narration-placeholder">Gemini is reflecting on Earth\'s state...</span>';

    const prompt = `It's Earth Day 2026. Here are the current key environmental indicators:
- Atmospheric CO₂: 422 ppm (up 2.4 ppm from last year)
- Global temperature anomaly: +1.2°C above pre-industrial baseline
- Arctic sea ice extent: 13% below the 1981–2010 average
- Annual deforestation: 4.7 million hectares per year
- Sea level rise rate: +3.7 mm per year (accelerating)  
- Species threatened with extinction: over 1 million

As Gemini AI, write a thoughtful, scientifically grounded Earth Day reflection on what these numbers mean together — what story they tell about our planet's trajectory, what gives you hope, and what each person who reads this can do right now. 

Write 3 paragraphs. Be eloquent, honest, and inspiring. Do not use bullet points.`;

    try {
      let fullText = '';
      narrationEl.innerHTML = '<span class="narration-text"></span>';
      const textSpan = narrationEl.querySelector('.narration-text');

      try {
        await GeminiAPI.streamText(prompt, '', (chunk) => {
          fullText += chunk;
          textSpan.textContent = fullText;
        });
      } catch (e) {
        fullText = await GeminiAPI.generateText(prompt);
        textSpan.textContent = fullText;
      }
      showToast('Earth Day reflection generated 🌍', 'success');
    } catch (err) {
      narrationEl.innerHTML = `<span class="narration-placeholder" style="color:var(--col-red)">Could not generate reflection: ${err.message}</span>`;
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      narrateBtn.disabled = false;
      narrateBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Generate Insight`;
    }
  });
}

/* ---- HERO COUNTER ANIMATION ---- */
function initHeroCounters() {
  const count = parseInt(localStorage.getItem('earthlens_analyses') || '0', 10);
  const el = document.getElementById('stat-analyses');
  if (el && count > 0) animateNumber(el, count, 1000);
}

/* ---- SMOOTH SCROLL FOR NAV LINKS ---- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80; // navbar height
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

/* ---- SERVICE WORKER REGISTRATION & PWA INSTALL ---- */
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('🌍 Service worker registered:', reg.scope))
        .catch(err => console.warn('SW registration failed:', err));
    });
  }

  // Handle PWA Install Prompt
  let deferredPrompt;
  const installBtn = document.getElementById('installPwaBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = 'inline-flex';
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installBtn.style.display = 'none';
      }
      deferredPrompt = null;
    });
  }
}

/* ---- FAQ ACCORDION ---- */
function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const active = document.querySelector('.faq-item.active');
      if (active && active !== item) active.classList.remove('active');
      item.classList.toggle('active');
    });
  });
}

/* ---- MAIN INIT ---- */
document.addEventListener('DOMContentLoaded', () => {
  // Core app
  initServiceWorker();
  initNavbar();
  initParticles();
  initScrollAnimations();
  initSmoothScroll();
  initHeroCounters();
  initFAQ();

  // Globe
  const globeCanvas = document.getElementById('globe-canvas');
  if (globeCanvas) Globe.init(globeCanvas);

  // Features
  EcoVision.init();
  EcoChat.init();
  CarbonCompass.init();
  initEarthPulse();

  console.log(
    '%c🌍 EarthLens AI',
    'font-size:20px;font-weight:bold;background:linear-gradient(135deg,#22c55e,#0ea5e9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;'
  );
  console.log('%cHappy Earth Day 2026! Built with Google Gemini 🚀', 'color:#22c55e;font-size:14px;');
});
