/* ============================================================
   RMD TRAVELS — index.js
   Features:
     1.  Mobile hamburger menu
     2.  Sticky header — always visible
     3.  Scroll reveal with stagger
     4.  Swap button (Origin ↔ Destination)
     5.  Search validation + toast notification
     6.  Animated stat counters (ease-out cubic)
     7.  Smooth scroll for anchor links (respects header offset)
     8.  Active nav highlight (scroll spy)
     9.  Typewriter effect on hero heading
    10.  Parallax on hero image (desktop only)
    11.  Ken Burns slow zoom on hero image
    12.  Shake keyframe for validation error
    13.  Zoomable images — lightbox with zoom / pan / pinch
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ══════════════════════════════════════════════════════════
     1. MOBILE HAMBURGER MENU
  ══════════════════════════════════════════════════════════ */
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
      mobileMenu.setAttribute('aria-hidden', !isOpen);
    });

    // Close when a nav link is tapped
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      }
    });

    // Keyboard support
    hamburger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        hamburger.click();
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     2. STICKY HEADER — always visible
  ══════════════════════════════════════════════════════════ */
  window.addEventListener('scroll', () => {
    const current = window.scrollY;

    // Header now stays pinned at the top at all times (it used to slide
    // away when scrolling down), so the menu is always reachable.
    parallaxHeroImage(current);

  }, { passive: true });

  /* ══════════════════════════════════════════════════════════
     3. SCROLL REVEAL with stagger
  ══════════════════════════════════════════════════════════ */
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const siblings = [...entry.target.parentElement.querySelectorAll('.reveal')];
          const idx      = siblings.indexOf(entry.target);
          entry.target.style.transitionDelay = `${Math.min(idx, 4) * 30}ms`;   // short, capped stagger
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px 80px 0px' });   // start just before it scrolls in

    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('visible'));
  }

  /* ══════════════════════════════════════════════════════════
     4.  BUS SEARCH — dropdowns, swap, API call, render results
  ══════════════════════════════════════════════════════════ */

  // When the page is served by the Node server (laptop or phone on the same Wi-Fi)
  // use a relative URL; when index.html is opened directly as a file, use localhost.
  const API_BASE      = location.protocol.startsWith('http') ? '/api' : 'http://localhost:3000/api';

  const originSel     = document.getElementById('originSelect');
  const destSel       = document.getElementById('destSelect');
  const journeyDate   = document.getElementById('journeyDate');
  const searchBtn     = document.getElementById('searchBtn');
  const swapBtn       = document.getElementById('swapBtn');
  const busResults    = document.getElementById('busResults');
  const searchBox     = document.getElementById('searchBox');

  // Set date min to today
  if (journeyDate) {
    const today = new Date().toISOString().split('T')[0];
    journeyDate.min   = today;
    journeyDate.value = today;
  }

  // ── Load stops from API and populate both dropdowns ──────
  async function loadStops() {
    try {
      const res   = await fetch(`${API_BASE}/stops`);
      const data  = await res.json();
      const stops = data.stops || [];

      [originSel, destSel].forEach(sel => {
        if (!sel) return;
        stops.forEach(stop => {
          const opt   = document.createElement('option');
          opt.value   = stop;
          opt.textContent = stop;
          sel.appendChild(opt);
        });
      });
    } catch (err) {
      // Server not running — fall back to hardcoded stop list
      const fallback = [
        'Samastipur','Musri Gharari','Tajpur','Sujaval Pur','Sabha',
        'Siho','Markan','Maniyari','Kaji Inda','Dighra',
        'Kacchi Pakki','Gobarsahi','Bhagwanpur','Muzaffarpur'
      ];
      [originSel, destSel].forEach(sel => {
        if (!sel) return;
        fallback.forEach(stop => {
          const opt = document.createElement('option');
          opt.value = stop;
          opt.textContent = stop;
          sel.appendChild(opt);
        });
      });
    }
  }

  loadStops();

  // ── Swap button ──────────────────────────────────────────
  if (swapBtn && originSel && destSel) {
    swapBtn.addEventListener('click', () => {
      const tmp       = originSel.value;
      originSel.value = destSel.value;
      destSel.value   = tmp;

      swapBtn.style.transform = 'rotate(180deg)';
      setTimeout(() => { swapBtn.style.transform = ''; }, 350);
    });
  }

  // ── Search button ────────────────────────────────────────
  if (searchBtn) {
    searchBtn.addEventListener('click', handleSearch);
  }

  async function handleSearch() {
    const from = originSel?.value;
    const to   = destSel?.value;
    const date = journeyDate?.value;

    // Validation
    if (!from) {
      originSel.focus();
      originSel.style.borderBottomColor = '#e05a5a';
      setTimeout(() => { originSel.style.borderBottomColor = ''; }, 2000);
      showToast('Please select an origin stop.');
      return;
    }
    if (!to) {
      destSel.focus();
      destSel.style.borderBottomColor = '#e05a5a';
      setTimeout(() => { destSel.style.borderBottomColor = ''; }, 2000);
      showToast('Please select a destination stop.');
      return;
    }
    if (from === to) {
      searchBox?.classList.add('shake');
      setTimeout(() => searchBox?.classList.remove('shake'), 600);
      showToast('Origin and destination cannot be the same.');
      return;
    }
    if (!date) {
      journeyDate.focus();
      showToast('Please select a journey date.');
      return;
    }

    // Show loading state
    searchBtn.innerHTML = '<i class="ri-loader-4-line" aria-hidden="true"></i> SEARCHING…';
    searchBtn.disabled    = true;
    busResults.hidden     = false;
    busResults.innerHTML  = `
      <div class="bus-loading">
        <span class="spinner"></span> Looking for buses from <strong>${from}</strong> to <strong>${to}</strong>…
      </div>`;

    try {
      const url  = `${API_BASE}/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`;
      const res  = await fetch(url);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Search failed');

      renderResults(data);
    } catch (err) {
      // Fallback: run search locally using embedded schedule data
      const localData = localSearch(from, to, date);
      renderResults(localData);
    } finally {
      searchBtn.innerHTML = '<i class="ri-search-line" aria-hidden="true"></i> SEARCH BUSES';
      searchBtn.disabled    = false;
    }
  }

  // ── Render results ───────────────────────────────────────
  function renderResults(data) {
    if (!busResults) return;
    busResults.hidden = false;

    const dateLabel = data.date
      ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
      : '';

    if (!data.buses || data.buses.length === 0) {
      busResults.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon"><i class="ri-bus-2-line"></i></div>
          <h3>No buses found</h3>
          <p>No service available between <strong>${data.from}</strong> and <strong>${data.to}</strong> on ${dateLabel}.</p>
        </div>`;
      return;
    }

    const cards = data.buses.map(b => `
      <div class="bus-card card">
        <div class="bus-card-main">

          <div class="bus-time-block">
            <div class="bus-time">${b.depart}</div>
            <div class="bus-time-label">${b.from.length > 12 ? b.from.slice(0,12)+'…' : b.from}</div>
          </div>

          <div class="bus-route-line">
            <div class="route-dot"></div>
            <div class="route-bar">
              <span class="route-duration">${b.duration}</span>
            </div>
            <div class="route-dot-end"></div>
          </div>

          <div class="bus-time-block">
            <div class="bus-time">${b.arrive}</div>
            <div class="bus-time-label">${b.to.length > 12 ? b.to.slice(0,12)+'…' : b.to}</div>
          </div>

        </div>

        <div class="bus-card-action">
          <span class="btn-book"><i class="ri-phone-line ico-inline" aria-hidden="true"></i>Contact to Know More</span>
          <div class="seats-left"><i class="ri-checkbox-circle-line ico-inline" aria-hidden="true"></i>Seats Available</div>
        </div>
      </div>`).join('');

    busResults.innerHTML = `
      <div class="results-header">
        <div>
          <div class="results-title">${data.from} → ${data.to}</div>
          <div class="results-meta">${dateLabel}${data.dayOfWeek ? ' · ' + data.dayOfWeek : ''}</div>
        </div>
        <div class="results-count">${data.totalBuses} BUS${data.totalBuses !== 1 ? 'ES' : ''} AVAILABLE</div>
      </div>
      ${cards}`;

    busResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── Local (client-side) search fallback ─────────────────
  // Used when the Node server is not running.
  function localSearch(from, to, date) {
    const INTERVAL = 15; // minutes per bus offset

    const schedule = {
      stops: [
        'Samastipur','Musri Gharari','Tajpur','Sujaval Pur','Sabha',
        'Siho','Markan','Maniyari','Kaji Inda','Dighra',
        'Kacchi Pakki','Gobarsahi','Bhagwanpur','Muzaffarpur'
      ],
      buses: [
        { id:'BUS-01', regNo:'BR 06 PE 1504', busType:'AC Deluxe', seats:40 },
        { id:'BUS-02', regNo:'BR 06 PE 1505', busType:'AC Deluxe', seats:40 },
        { id:'BUS-03', regNo:'BR 06 PE 1506', busType:'AC Deluxe', seats:40 },
        { id:'BUS-04', regNo:'BR 06 PE 1507', busType:'AC Deluxe', seats:40 },
        { id:'BUS-05', regNo:'BR 06 PE 1508', busType:'AC Deluxe', seats:40 }
      ],
      trips: [
        { tripNo:1, direction:'Samastipur→Muzaffarpur', stops:[
          {stop:'Samastipur',depart:'04:50'},{stop:'Musri Gharari',arrive:'05:10',depart:'05:15'},
          {stop:'Tajpur',arrive:'05:36',depart:'05:38'},{stop:'Sujaval Pur',arrive:'06:05',depart:'06:07'},
          {stop:'Sabha',arrive:'06:10',depart:'06:12'},{stop:'Siho',arrive:'06:20',depart:'06:22'},
          {stop:'Markan',arrive:'06:27',depart:'06:29'},{stop:'Maniyari',arrive:'06:37',depart:'06:38'},
          {stop:'Kaji Inda',arrive:'06:46',depart:'06:47'},{stop:'Dighra',arrive:'06:53',depart:'06:53'},
          {stop:'Kacchi Pakki',arrive:'06:58',depart:'06:58'},{stop:'Gobarsahi',arrive:'07:03',depart:'07:03'},
          {stop:'Bhagwanpur',arrive:'07:06',depart:'07:06'},{stop:'Muzaffarpur',arrive:'07:10'}
        ]},
        { tripNo:2, direction:'Muzaffarpur→Samastipur', stops:[
          {stop:'Muzaffarpur',arrive:'07:10',depart:'07:20'},{stop:'Bhagwanpur',arrive:'07:22',depart:'07:23'},
          {stop:'Gobarsahi',arrive:'07:26',depart:'07:27'},{stop:'Kacchi Pakki',arrive:'07:30',depart:'07:30'},
          {stop:'Dighra',arrive:'07:36',depart:'07:36'},{stop:'Kaji Inda',arrive:'07:42',depart:'07:42'},
          {stop:'Maniyari',arrive:'07:50',depart:'07:50'},{stop:'Markan',arrive:'07:53',depart:'07:53'},
          {stop:'Siho',arrive:'07:58',depart:'07:58'},{stop:'Sabha',arrive:'08:05',depart:'08:05'},
          {stop:'Sujaval Pur',arrive:'08:08',depart:'08:08'},{stop:'Tajpur',arrive:'08:22',depart:'08:22'},
          {stop:'Musri Gharari',arrive:'08:35',depart:'08:35'},{stop:'Samastipur',arrive:'09:30'}
        ]},
        { tripNo:3, direction:'Samastipur→Muzaffarpur', stops:[
          {stop:'Samastipur',depart:'10:15'},{stop:'Musri Gharari',arrive:'10:35',depart:'10:38'},
          {stop:'Tajpur',arrive:'10:56',depart:'10:58'},{stop:'Sujaval Pur',arrive:'11:25',depart:'11:27'},
          {stop:'Sabha',arrive:'11:30',depart:'11:32'},{stop:'Siho',arrive:'11:40',depart:'11:42'},
          {stop:'Markan',arrive:'11:47',depart:'11:49'},{stop:'Maniyari',arrive:'11:57',depart:'11:58'},
          {stop:'Kaji Inda',arrive:'12:06',depart:'12:07'},{stop:'Dighra',arrive:'12:13',depart:'12:13'},
          {stop:'Kacchi Pakki',arrive:'12:18',depart:'12:18'},{stop:'Gobarsahi',arrive:'12:23',depart:'12:23'},
          {stop:'Bhagwanpur',arrive:'12:26',depart:'12:26'},{stop:'Muzaffarpur',arrive:'13:00'}
        ]},
        { tripNo:4, direction:'Muzaffarpur→Samastipur', stops:[
          {stop:'Muzaffarpur',arrive:'13:00',depart:'13:13'},{stop:'Bhagwanpur',arrive:'13:20',depart:'13:22'},
          {stop:'Gobarsahi',arrive:'13:25',depart:'13:26'},{stop:'Kacchi Pakki',arrive:'13:29',depart:'13:29'},
          {stop:'Dighra',arrive:'13:35',depart:'13:35'},{stop:'Kaji Inda',arrive:'13:41',depart:'13:41'},
          {stop:'Maniyari',arrive:'13:49',depart:'13:49'},{stop:'Markan',arrive:'13:52',depart:'13:52'},
          {stop:'Siho',arrive:'13:57',depart:'13:57'},{stop:'Sabha',arrive:'14:04',depart:'14:04'},
          {stop:'Sujaval Pur',arrive:'14:07',depart:'14:07'},{stop:'Tajpur',arrive:'14:21',depart:'14:21'},
          {stop:'Musri Gharari',arrive:'14:34',depart:'14:34'},{stop:'Samastipur',arrive:'15:30'}
        ]},
        { tripNo:5, direction:'Samastipur→Muzaffarpur', stops:[
          {stop:'Samastipur',depart:'16:05'},{stop:'Musri Gharari',arrive:'16:25',depart:'16:28'},
          {stop:'Tajpur',arrive:'16:46',depart:'16:48'},{stop:'Sujaval Pur',arrive:'17:15',depart:'17:17'},
          {stop:'Sabha',arrive:'17:20',depart:'17:22'},{stop:'Siho',arrive:'17:30',depart:'17:32'},
          {stop:'Markan',arrive:'17:37',depart:'17:39'},{stop:'Maniyari',arrive:'17:47',depart:'17:48'},
          {stop:'Kaji Inda',arrive:'17:56',depart:'17:57'},{stop:'Dighra',arrive:'18:03',depart:'18:03'},
          {stop:'Kacchi Pakki',arrive:'18:08',depart:'18:08'},{stop:'Gobarsahi',arrive:'18:13',depart:'18:13'},
          {stop:'Bhagwanpur',arrive:'18:16',depart:'18:16'},{stop:'Muzaffarpur',arrive:'18:30'}
        ]},
        { tripNo:6, direction:'Muzaffarpur→Samastipur', stops:[
          {stop:'Muzaffarpur',arrive:'18:30',depart:'18:45'},{stop:'Bhagwanpur',arrive:'18:52',depart:'18:53'},
          {stop:'Gobarsahi',arrive:'18:56',depart:'18:57'},{stop:'Kacchi Pakki',arrive:'19:00',depart:'19:00'},
          {stop:'Dighra',arrive:'19:06',depart:'19:06'},{stop:'Kaji Inda',arrive:'19:12',depart:'19:12'},
          {stop:'Maniyari',arrive:'19:20',depart:'19:20'},{stop:'Markan',arrive:'19:23',depart:'19:23'},
          {stop:'Siho',arrive:'19:28',depart:'19:28'},{stop:'Sabha',arrive:'19:35',depart:'19:35'},
          {stop:'Sujaval Pur',arrive:'19:38',depart:'19:38'},{stop:'Tajpur',arrive:'19:52',depart:'19:52'},
          {stop:'Musri Gharari',arrive:'20:05',depart:'20:05'},{stop:'Samastipur',arrive:'21:00'}
        ]}
      ]
    };

    const n = s => s.toLowerCase().trim().replace(/\s+/g,' ');

    function toMin(t) {
      if (!t) return null;
      const [h,m] = t.split(':').map(Number);
      return h*60+m;
    }
    function addMin(t, off) {
      if (!t) return null;
      const tot = toMin(t)+off;
      return `${String(Math.floor(tot/60)%24).padStart(2,'0')}:${String(tot%60).padStart(2,'0')}`;
    }
    function getTime(stops, name, prefer) {
      const s = stops.find(s => n(s.stop)===n(name));
      if (!s) return null;
      return prefer==='depart' ? (s.depart??s.arrive??null) : (s.arrive??s.depart??null);
    }
    function idxOf(stops, name) {
      return stops.findIndex(s => n(s.stop)===n(name));
    }

    const results = [];
    schedule.buses.forEach((bus, bi) => {
      const off = bi * INTERVAL;
      schedule.trips.forEach(trip => {
        const fi = idxOf(trip.stops, from);
        const ti = idxOf(trip.stops, to);
        if (fi === -1 || ti === -1 || fi >= ti) return;
        const dep = addMin(getTime(trip.stops, from, 'depart'), off);
        const arr = addMin(getTime(trip.stops, to, 'arrive'), off);
        if (!dep || !arr) return;
        const dur = toMin(arr) - toMin(dep);
        const h   = Math.floor(dur/60), m = dur%60;
        results.push({
          busId: bus.id, regNo: bus.regNo, busType: bus.busType,
          from, to, depart: dep, arrive: arr,
          duration: h>0?`${h}h ${m}m`:`${m}m`,
          seats: bus.seats, status: 'Available'
        });
      });
    });

    results.sort((a,b) => toMin(a.depart)-toMin(b.depart));

    const d = new Date(date+'T00:00:00');
    return {
      from, to, date,
      dayOfWeek: d.toLocaleDateString('en-IN',{weekday:'long'}),
      totalBuses: results.length,
      buses: results
    };
  }

  /* ══════════════════════════════════════════════════════════
     6. ANIMATED STAT COUNTERS (ease-out cubic)
  ══════════════════════════════════════════════════════════ */
  const counters = document.querySelectorAll('.stat-num[data-target]');

  if (counters.length && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(el => counterObserver.observe(el));
  }

  function animateCounter(el) {
    const start      = parseInt(el.dataset.start || '0', 10);   // counts up FROM this number
    const target     = parseInt(el.dataset.target, 10);
    const suffix     = el.dataset.suffix || '';
    const duration   = 1800;
    const fps        = 60;
    const totalSteps = duration / (1000 / fps);
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const eased = 1 - Math.pow(1 - step / totalSteps, 3);
      const value = Math.min(Math.round(start + eased * (target - start)), target);
      el.textContent = value.toLocaleString('en-IN') + suffix;
      if (step >= totalSteps) clearInterval(timer);
    }, 1000 / fps);
  }

  /* ══════════════════════════════════════════════════════════
     7. SMOOTH SCROLL — respects fixed header height
  ══════════════════════════════════════════════════════════ */
  const HEADER_OFFSET = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--header-h') || '72',
    10
  );

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ══════════════════════════════════════════════════════════
     8. ACTIVE NAV HIGHLIGHT (scroll spy)
  ══════════════════════════════════════════════════════════ */
  const sections = document.querySelectorAll('section[id], div[id]');
  const navLinks = document.querySelectorAll('header a[href^="#"], #mobile-menu a[href^="#"]');

  if ('IntersectionObserver' in window) {
    const spyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => {
            link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
          });
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    sections.forEach(s => spyObserver.observe(s));
  }

  /* ══════════════════════════════════════════════════════════
     9. TYPEWRITER EFFECT on hero h1
        Types the plain text char-by-char then restores the
        original HTML (bold <span> on "RMD") when done.
  ══════════════════════════════════════════════════════════ */
  const heroH1 = document.querySelector('.hero-content h1');

  if (heroH1) {
    const fullHTML  = heroH1.innerHTML;
    const plainText = heroH1.textContent;

    heroH1.textContent = '';

    const cursor = document.createElement('span');
    cursor.textContent = '|';
    cursor.style.cssText = [
      'display:inline-block',
      'color:#c9a84c',
      'font-weight:300',
      'animation:rmdBlink 0.75s step-end infinite',
      'margin-left:2px'
    ].join(';');
    heroH1.appendChild(cursor);

    injectStyle([
      '@keyframes rmdBlink{',
      '  0%,100%{opacity:1}',
      '  50%{opacity:0}',
      '}'
    ].join(''), 'rmd-blink');

    let charIdx = 0;
    const SPEED = 46;

    const typeTimer = setInterval(() => {
      charIdx++;
      heroH1.textContent = plainText.slice(0, charIdx);
      heroH1.appendChild(cursor);

      if (charIdx >= plainText.length) {
        clearInterval(typeTimer);
        setTimeout(() => { heroH1.innerHTML = fullHTML; }, 650);
      }
    }, SPEED);
  }

  /* ══════════════════════════════════════════════════════════
     10. PARALLAX on hero image (desktop only)
         Called inside the scroll listener above.
  ══════════════════════════════════════════════════════════ */
  const heroImg = document.querySelector('.hero-img');

  function parallaxHeroImage(scrollY) {
    // Turned off: the photo now sits in its own frame above the text, and
    // sliding it down would open a gap at the top. The slow Ken Burns zoom
    // still runs inside the frame.
    return;
    if (!heroImg || window.innerWidth <= 820) return;
    const offset = scrollY * 0.18;
    heroImg.style.transform = `translateY(${offset}px) scale(1.06)`;
  }

  /* ══════════════════════════════════════════════════════════
     11. KEN BURNS slow zoom on hero image
         GPU-accelerated via CSS animation.
         On desktop, scroll parallax overrides the transform;
         on mobile the Ken Burns animation plays freely.
  ══════════════════════════════════════════════════════════ */
  injectStyle([
    '@keyframes rmdKenBurns{',
    '  0%  {transform:scale(1)    translateY(0)}',
    '  100%{transform:scale(1.08) translateY(-12px)}',
    '}',
    '.hero-img{',
    '  animation:rmdKenBurns 18s ease-in-out alternate infinite;',
    '  will-change:transform;',
    '}'
  ].join(''), 'rmd-kenburns');

  /* ══════════════════════════════════════════════════════════
     12. SHAKE KEYFRAME (search validation error)
  ══════════════════════════════════════════════════════════ */
  injectStyle([
    '@keyframes shake{',
    '  0%,100%{transform:translateX(0)}',
    '  20%    {transform:translateX(-8px)}',
    '  40%    {transform:translateX( 8px)}',
    '  60%    {transform:translateX(-5px)}',
    '  80%    {transform:translateX( 5px)}',
    '}',
    '.shake{animation:shake 0.5s ease}'
  ].join(''), 'rmd-shake');

  /* ══════════════════════════════════════════════════════════
     13. ZOOMABLE IMAGES — click any .zoomable image to open it
         full-screen. Zoom with mouse wheel, +/- buttons,
         double-click/double-tap, or pinch; drag to pan.
         Arrow keys / buttons step through the gallery.
  ══════════════════════════════════════════════════════════ */
  const zoomables = [...document.querySelectorAll('img.zoomable')];

  // "Click to zoom" badge on the route map
  const mapBox = document.querySelector('.route-map-box');
  if (mapBox && mapBox.querySelector('.zoomable')) {
    const hint = document.createElement('span');
    hint.className = 'zoom-hint';
    hint.innerHTML = '<i class="ri-zoom-in-line" aria-hidden="true"></i>Click to zoom';
    mapBox.appendChild(hint);
  }

  if (zoomables.length) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Image viewer');
    lb.innerHTML = `
      <div class="lightbox-caption"></div>
      <img class="lightbox-img" alt="">
      <button class="lightbox-close" aria-label="Close"><i class="ri-close-line"></i></button>
      <button class="lightbox-nav lightbox-prev" aria-label="Previous image"><i class="ri-arrow-left-s-line"></i></button>
      <button class="lightbox-nav lightbox-next" aria-label="Next image"><i class="ri-arrow-right-s-line"></i></button>
      <div class="lightbox-bar">
        <button data-zoom="out"   aria-label="Zoom out"><i class="ri-subtract-line"></i></button>
        <span class="lightbox-level">100%</span>
        <button data-zoom="in"    aria-label="Zoom in"><i class="ri-add-line"></i></button>
        <button data-zoom="reset" aria-label="Reset zoom"><i class="ri-refresh-line"></i></button>
      </div>`;
    document.body.appendChild(lb);

    const lbImg   = lb.querySelector('.lightbox-img');
    const lbCap   = lb.querySelector('.lightbox-caption');
    const lbLevel = lb.querySelector('.lightbox-level');
    const prevBtn = lb.querySelector('.lightbox-prev');
    const nextBtn = lb.querySelector('.lightbox-next');

    const MIN = 1, MAX = 5;
    let scale = 1, tx = 0, ty = 0, current = 0, group = [];

    const apply = (animate) => {
      lbImg.style.transition = animate ? 'transform 0.25s ease' : 'none';
      lbImg.style.transform  = `translate(${tx}px, ${ty}px) scale(${scale})`;
      lbLevel.textContent    = Math.round(scale * 100) + '%';
      lbImg.style.cursor     = scale > 1 ? 'grab' : 'zoom-in';
    };

    const clampPan = () => {
      const w = lbImg.offsetWidth  * (scale - 1) / 2;
      const h = lbImg.offsetHeight * (scale - 1) / 2;
      tx = Math.max(-w, Math.min(w, tx));
      ty = Math.max(-h, Math.min(h, ty));
    };

    const zoomTo = (next, animate = true) => {
      scale = Math.max(MIN, Math.min(MAX, next));
      if (scale === 1) { tx = 0; ty = 0; }
      clampPan();
      apply(animate);
    };

    const show = (i) => {
      current = (i + group.length) % group.length;
      const src = group[current];
      lbImg.src = src.currentSrc || src.src;
      lbImg.alt = src.alt;
      lbCap.textContent = src.alt;
      scale = 1; tx = 0; ty = 0; apply(false);
      const multi = group.length > 1;
      prevBtn.hidden = nextBtn.hidden = !multi;
    };

    const open = (img) => {
      // The map opens alone; gallery photos open as a set you can step through
      group = img.classList.contains('gallery-img')
        ? zoomables.filter(z => z.classList.contains('gallery-img'))
        : [img];
      show(group.indexOf(img));
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
      lb.querySelector('.lightbox-close').focus();
    };

    const close = () => {
      lb.classList.remove('open');
      document.body.style.overflow = '';
    };

    zoomables.forEach(img => {
      img.setAttribute('tabindex', '0');
      img.addEventListener('click', () => open(img));
      img.addEventListener('keydown', e => { if (e.key === 'Enter') open(img); });
    });

    lb.querySelector('.lightbox-close').addEventListener('click', close);
    prevBtn.addEventListener('click', () => show(current - 1));
    nextBtn.addEventListener('click', () => show(current + 1));
    lb.querySelector('.lightbox-bar').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.zoom === 'in')    zoomTo(scale + 0.5);
      if (b.dataset.zoom === 'out')   zoomTo(scale - 0.5);
      if (b.dataset.zoom === 'reset') zoomTo(1);
    });

    // Click on the dark backdrop closes
    lb.addEventListener('click', e => { if (e.target === lb) close(); });

    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape')     close();
      if (e.key === 'ArrowLeft'  && group.length > 1) show(current - 1);
      if (e.key === 'ArrowRight' && group.length > 1) show(current + 1);
      if (e.key === '+' || e.key === '=') zoomTo(scale + 0.5);
      if (e.key === '-')                  zoomTo(scale - 0.5);
    });

    // Mouse wheel zoom
    lb.addEventListener('wheel', e => {
      e.preventDefault();
      zoomTo(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), false);
    }, { passive: false });

    // Double-click / double-tap toggles 2.5×
    lbImg.addEventListener('dblclick', () => zoomTo(scale > 1 ? 1 : 2.5));

    // Drag to pan + pinch to zoom (pointer events cover mouse and touch)
    const pointers = new Map();
    let startDist = 0, startScale = 1, lastX = 0, lastY = 0, lastTap = 0;

    lbImg.addEventListener('pointerdown', e => {
      lbImg.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        startDist  = Math.hypot(a.x - b.x, a.y - b.y);
        startScale = scale;
      }
      lastX = e.clientX; lastY = e.clientY;
      lbImg.classList.add('dragging');

      // double-tap on touch screens
      if (e.pointerType === 'touch') {
        const now = Date.now();
        if (now - lastTap < 300) zoomTo(scale > 1 ? 1 : 2.5);
        lastTap = now;
      }
    });

    lbImg.addEventListener('pointermove', e => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (startDist) zoomTo(startScale * dist / startDist, false);
      } else if (scale > 1) {
        tx += e.clientX - lastX;
        ty += e.clientY - lastY;
        clampPan();
        apply(false);
      }
      lastX = e.clientX; lastY = e.clientY;
    });

    const endPointer = e => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) startDist = 0;
      if (!pointers.size) lbImg.classList.remove('dragging');
    };
    lbImg.addEventListener('pointerup', endPointer);
    lbImg.addEventListener('pointercancel', endPointer);
  }

  /* ══════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════ */

  function injectStyle(css, id) {
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
  }

  function showToast(msg) {
    let toast = document.getElementById('rmd-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'rmd-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      Object.assign(toast.style, {
        position:      'fixed',
        bottom:        '2rem',
        left:          '50%',
        transform:     'translateX(-50%) translateY(70px)',
        background:    '#0d1b2a',
        color:         '#e0c278',
        border:        '1px solid rgba(201,168,76,0.4)',
        padding:       '0.85rem 2rem',
        borderRadius:  '0',
        fontSize:      '0.82rem',
        fontFamily:    'Montserrat, sans-serif',
        fontWeight:    '600',
        letterSpacing: '0.06em',
        transition:    'transform 0.2s ease, opacity 0.2s ease',
        zIndex:        '9999',
        opacity:       '0',
        pointerEvents: 'none',
        maxWidth:      '90vw',
        textAlign:     'center',
      });
      document.body.appendChild(toast);
    }

    toast.textContent = msg;
    void toast.offsetWidth; // force reflow
    toast.style.opacity   = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateX(-50%) translateY(70px)';
    }, 3500);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  /* ══════════════════════════════════════════════════════════
     GALLERY — fade-in on scroll
  ══════════════════════════════════════════════════════════ */
  const galleryItems = document.querySelectorAll('.gallery-section');

  if (galleryItems.length && 'IntersectionObserver' in window) {
    const galleryObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('is-visible');
          }, (i % 3) * 40);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px 80px 0px' });

    galleryItems.forEach(item => galleryObserver.observe(item));
  } else {
    galleryItems.forEach(item => item.classList.add('is-visible'));
  }

});