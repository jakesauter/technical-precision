/* =========================================================================
   SITE CONFIG: edit the values below.

   Anything set to null shows on the page as a red "TO BE ADDED" mark
   (or is hidden if showPlaceholders is false).

   Where each value came from (checked November 2026):
   - street / city / postal: business directory listings for
     "Technical Precision Corp." (ProcessRegister, NAICSList, ZoomInfo),
     confirmed by the shop's Google Maps pin (mapUrl).
   - phone and email: supplied by the owner (2026-11-13).
   - president: ProcessRegister listing ("David Sauter, President").
   - hours and founding year: supplied by the owner (2026-11-13).
     Founded shows on the About tab only; hours on About and Contact us.
   ========================================================================= */
var SITE = {
  name: 'Technical Precision Corp.',
  street: '22 Commerce St.',
  city: 'Poughkeepsie',
  region: 'NY',
  postal: '12603',
  mapUrl: 'https://maps.app.goo.gl/DAXfdaKtx8KwUd4W9', // the shop's Google Maps pin; null = search by address
  county: 'Dutchess County',
  phone: '(845) 473-0548',   // confirmed by the owner, 2026-11-13; shown as-is, digits used for the call link
  email: 'dave@technicalprecisioncorp.com', // from the owner, 2026-11-13; quote requests are emailed here
  // Quote requests go to the owner's private form relay (Cloudflare worker "site-forms"), which emails them from
  // forms@tepco.us.com to the shop. Recipient addresses are kept in the relay, not here.
  formEndpoint: 'https://site-forms.jake-sauter3.workers.dev/send?site=tepco',
  hours: 'Monday–Friday, 7 AM – 4 PM',
  founded: '1985',
  president: 'David Sauter', // set to null to hide
  showPlaceholders: true
};
/* ========================================================================= */

(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  root.classList.add('js');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function store(k, v) {
    try { if (v === undefined) return window.localStorage.getItem('tp.' + k); window.localStorage.setItem('tp.' + k, v); }
    catch (e) { return null; }
    return null;
  }

  /* ------------------------------------------------------------------
     Config bindings
     ------------------------------------------------------------------ */
  var TBD = '<span class="tbd">To be added</span>';
  var phoneDigits = SITE.phone ? SITE.phone.replace(/[^\d]/g, '') : '';
  if (phoneDigits.length === 10) phoneDigits = '1' + phoneDigits;
  var values = {
    street: SITE.street,
    cityLine: [SITE.city, [SITE.region, SITE.postal].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    addressLine: [SITE.street, SITE.city, [SITE.region, SITE.postal].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    phone: SITE.phone,
    email: SITE.email,
    emailLink: SITE.email ? '<a href="mailto:' + SITE.email + '">' + SITE.email + '</a>' : null,
    hours: SITE.hours,
    founded: SITE.founded,
    president: SITE.president
  };
  $$('[data-site]').forEach(function (el) {
    var k = el.getAttribute('data-site'), v = values[k];
    if (v) { if (k === 'emailLink') el.innerHTML = v; else el.textContent = v; return; }
    if (SITE.showPlaceholders && k !== 'president') { el.innerHTML = TBD; return; }
    var row = el.closest('[data-site-row], dl > div');
    if (row) row.hidden = true; else el.hidden = true;
  });
  $$('[data-site-phone-link]').forEach(function (a) {
    if (phoneDigits) a.href = 'tel:+' + phoneDigits; else a.hidden = true;
  });
  $$('[data-site-map]').forEach(function (a) {
    a.href = SITE.mapUrl || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(values.addressLine);
  });
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Structured data for search engines, built from the config above
  (function () {
    var ld = {
      '@context': 'https://schema.org', '@type': 'LocalBusiness', name: SITE.name,
      description: 'Machine shop in Poughkeepsie, New York focused on marine parts: CNC machining, drilling and tapping, punching, press brake bending, welding, wide-belt sanding and powder coating.',
      url: location.origin + location.pathname,
      address: { '@type': 'PostalAddress', streetAddress: SITE.street, addressLocality: SITE.city, addressRegion: SITE.region, postalCode: SITE.postal, addressCountry: 'US' }
    };
    if (SITE.phone) ld.telephone = '+' + phoneDigits;
    if (SITE.email) ld.email = SITE.email;
    if (SITE.founded) ld.foundingDate = SITE.founded;
    if (SITE.mapUrl) ld.hasMap = SITE.mapUrl;
    ld.openingHours = 'Mo-Fr 07:00-16:00';
    var s = doc.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(ld);
    doc.head.appendChild(s);
  })();

  /* ------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------ */
  var topbar = $('.topbar'), menuBtn = $('.menu-btn');
  function setMenu(open) {
    topbar.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!topbar.classList.contains('is-open')); });
  $$('.nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setMenu(false); closeLayers(); } });

  /* ------------------------------------------------------------------
     Sheets: zone markers, title blocks, current-sheet tracking
     ------------------------------------------------------------------ */
  var sheets = $$('.sheet');
  var total = String(sheets.length).padStart(2, '0');
  var MARK = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1.5" y="1.5" width="37" height="37" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 12h14M15 12v17M22 29V12h6.5a4.5 4.5 0 0 1 0 9H22" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
  sheets.forEach(function (s) {
    var z = doc.createElement('div'); z.className = 'zones'; z.setAttribute('aria-hidden', 'true');
    var cols = '', rows = '', i;
    for (i = 8; i >= 1; i--) cols += '<span data-n="' + i + '"></span>';
    'DCBA'.split('').forEach(function (l) { rows += '<span>' + l + '</span>'; });
    z.innerHTML = '<div class="zt">' + cols + '</div><div class="zb">' + cols + '</div><div class="zl">' + rows + '</div><div class="zr">' + rows + '</div>';
    s.insertBefore(z, s.firstChild);
    var tb = doc.createElement('div'); tb.className = 'tblock'; tb.setAttribute('aria-hidden', 'true');
    tb.innerHTML =
      '<div class="tb-co">' + MARK + '<span>Technical Precision Corp.</span></div>' +
      '<div class="tb-dwg"><small>Dwg no.</small>' + s.getAttribute('data-dwg') + '</div>' +
      '<div class="tb-title"><small>Title</small>' + s.getAttribute('data-title') + '</div>' +
      '<div><small>Sheet</small>' + s.getAttribute('data-sheet') + ' of ' + total + '</div>' +
      '<div><small>Scale</small>NTS</div>' +
      '<div><small>Rev</small>A</div>' +
      '<div class="tb-loc"><small>Location</small>' + (SITE.city ? SITE.city + ', ' + SITE.region : 'Poughkeepsie, NY') + '</div>';
    s.appendChild(tb);
  });

  // draw linework when a sheet scrolls into view
  if ('IntersectionObserver' in window && !reduced) {
    var drawIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-inview'); drawIO.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    $$('.hero-drawing, .lines-plan, .cap').forEach(function (el) { drawIO.observe(el); });
  } else {
    $$('.hero-drawing, .lines-plan, .cap').forEach(function (el) { el.classList.add('is-inview'); });
  }

  var sheetInd = $('[data-sheet-ind]');
  var navLinks = $$('.nav a');
  var currentSheet = null;
  function setSheet(s) {
    if (s === currentSheet) return;
    currentSheet = s;
    sheetInd.innerHTML = s.getAttribute('data-dwg') + '<span class="sx"> · Sheet ' + s.getAttribute('data-sheet') + '/' + total + '</span>';
    navLinks.forEach(function (a) { a.classList.toggle('is-current', a.getAttribute('href') === '#' + s.id); });
    runCommand(s.getAttribute('data-cmd'));
  }
  if ('IntersectionObserver' in window) {
    var sheetIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) setSheet(e.target); });
    }, { rootMargin: '-45% 0px -54% 0px' });
    sheets.forEach(function (s) { sheetIO.observe(s); });
  }

  /* ------------------------------------------------------------------
     Sheet tabs: one group of sheets on screen at a time.
     Links to any sheet (#quote, #process...) open its tab.
     ------------------------------------------------------------------ */
  var TABS = [
    { id: 'top', label: 'Overview', sheets: ['top'] },
    { id: 'marine', label: 'Marine', sheets: ['marine'] },
    { id: 'parts', label: '3D parts', sheets: ['parts'] },
    { id: 'capabilities', label: 'Capabilities', sheets: ['capabilities', 'process'] },
    { id: 'about', label: 'About', sheets: ['about', 'industries'] },
    { id: 'quote', label: 'Contact us', sheets: ['quote'] },
    { id: 'poster', label: 'Poster', sheets: ['poster'] }
  ];
  var tabNav = $('[data-tabs]'), mainEl = $('#main'), tabOf = {}, activeTab = null, pager = null;
  var tabsOn = !!(tabNav && root.classList.contains('js-tabs'));
  TABS.forEach(function (t, i) {
    t.i = i;
    t.els = t.sheets.map(function (id) { return doc.getElementById(id); }).filter(Boolean);
    t.els.forEach(function (el) { tabOf[el.id] = t; });
  });
  function tabFor(el) { var sh = el && el.closest ? el.closest('.sheet') : null; return sh ? tabOf[sh.id] || null : null; }
  // Run a scroll with smooth scrolling off. Reading scrollTop makes the browser apply
  // the jump now; smooth scrolling comes back on the next frame.
  function instantly(fn) {
    root.style.scrollBehavior = 'auto'; fn('instant'); void root.scrollTop;
    requestAnimationFrame(function () { root.style.scrollBehavior = ''; });
  }
  function stripFade() { tabNav.classList.toggle('more-right', tabNav.scrollLeft + tabNav.clientWidth < tabNav.scrollWidth - 4); }
  function showTab(t) {
    if (t === activeTab) return false;
    activeTab = t;
    sheets.forEach(function (sh) {
      var on = tabOf[sh.id] === t;
      sh.classList.toggle('tab-off', !on);
      sh.classList.toggle('tab-first', on && sh === t.els[0]);
    });
    $$('a', tabNav).forEach(function (a) {
      if (a.getAttribute('data-tab') !== t.id) { a.removeAttribute('aria-current'); return; }
      a.setAttribute('aria-current', 'page');
      // keep the open tab visible in the strip (phones), after the page jump
      requestAnimationFrame(function () {
        if (tabNav.scrollWidth <= tabNav.clientWidth) return;
        var left = a.offsetLeft - (tabNav.clientWidth - a.offsetWidth) / 2;
        tabNav.scrollTo({ left: Math.max(0, left), behavior: reduced ? 'auto' : 'smooth' });
      });
    });
    var prev = TABS[t.i - 1], next = TABS[t.i + 1];
    var pagerHtml =
      (prev ? '<a class="pg-prev" href="#' + prev.id + '"><small>&larr; Previous sheet</small>' + prev.label + '</a>' : '') +
      (next ? '<a class="pg-next" href="#' + next.id + '"><small>Next sheet &rarr;</small>' + next.label + '</a>' : '');
    pager.forEach(function (p) { p.innerHTML = pagerHtml; });
    pager[0].hidden = !prev;   // no top pager on the first tab: the headline starts the page
    if (window.__paintScrollCue) window.__paintScrollCue();
    setSheet(t.els[0]);
    return true;
  }
  // Open the tab holding #id and scroll to it. Returns false if #id is not in a sheet.
  function go(hash, scroll) {
    if (!tabsOn) {
      var plain = doc.getElementById((hash || '').replace(/^#/, ''));
      if (plain && scroll !== false) plain.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      return !!plain;
    }
    var el = doc.getElementById((hash || '').replace(/^#/, '') || 'top'), t = tabFor(el);
    if (!t) return false;
    var changed = showTab(t);
    if (scroll === false) return true;
    var atTop = el === t.els[0];
    if (changed) instantly(function (b) { if (atTop) window.scrollTo({ top: 0, left: 0, behavior: b }); else el.scrollIntoView({ block: 'start', behavior: b }); });
    else if (atTop) window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    return true;
  }
  if (tabsOn) {
    // the same Previous / Next sheet buttons above and below the open tab
    pager = ['is-top', 'is-bottom'].map(function (where) {
      var p = doc.createElement('nav'); p.className = 'sheet-pager ' + where;
      p.setAttribute('aria-label', (where === 'is-top' ? 'Top' : 'Bottom') + ' previous and next sheet');
      return p;
    });
    mainEl.insertBefore(pager[0], mainEl.firstChild);
    mainEl.appendChild(pager[1]);
    tabNav.addEventListener('scroll', stripFade, { passive: true });
    window.addEventListener('resize', stripFade);
    doc.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var h = a.getAttribute('href'), el = h.length > 1 ? doc.getElementById(h.slice(1)) : null;
      if (!tabFor(el)) return;
      e.preventDefault();
      if (location.hash !== h && history.pushState) history.pushState(null, '', h);
      go(h);
    });
    window.addEventListener('hashchange', function () { go(location.hash); });
  }

  /* ------------------------------------------------------------------
     Command line
     ------------------------------------------------------------------ */
  var hist = $('[data-cmd-hist]'), typed = $('[data-cmd-typed]'), form = $('[data-cmd-form]'), input = $('[data-cmd-input]');
  var typeTimer = 0, lastTyped = '';
  function log(line) {
    var li = doc.createElement('li'); li.textContent = line; hist.appendChild(li);
    while (hist.children.length > 6) hist.removeChild(hist.firstChild);
  }
  function runCommand(cmd) {
    if (!cmd) return;
    if (lastTyped) log('Command: ' + lastTyped);
    lastTyped = cmd;
    clearInterval(typeTimer);
    if (reduced) { typed.textContent = cmd; return; }
    var i = 0; typed.textContent = '';
    typeTimer = setInterval(function () {
      i++; typed.textContent = cmd.slice(0, i);
      if (i >= cmd.length) clearInterval(typeTimer);
    }, 34);
  }
  var COMMANDS = {
    MARINE: '#marine', BOAT: '#marine', BOATS: '#marine',
    PARTS: '#parts', '3D': '#parts', '3DORBIT': '#parts', ORBIT: '#parts', VIEW: '#parts',
    CAP: '#capabilities', CAPS: '#capabilities', CAPABILITIES: '#capabilities',
    PROCESS: '#process', ROUTE: '#process', ROUTING: '#process',
    IND: '#industries', INDUSTRIES: '#industries',
    ABOUT: '#about', PROPERTIES: '#about', PROPS: '#about',
    QUOTE: '#quote', RFQ: '#quote', PLOT: '#quote', CONTACT: '#quote',
    TOP: '#top', HOME: '#top', OPEN: '#top', ZOOM: '#top', Z: '#top', ZE: '#top'
  };
  input.addEventListener('focus', function () { form.classList.add('is-focus'); });
  input.addEventListener('blur', function () { form.classList.remove('is-focus'); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var raw = input.value.trim().toUpperCase(), word = raw.split(/\s+/)[0];
    input.value = '';
    if (!raw) return;
    log('Command: ' + raw);
    if (COMMANDS[word]) {
      var t = $(COMMANDS[word]);
      if (t) {
        if (tabsOn && location.hash !== COMMANDS[word] && history.pushState) history.pushState(null, '', COMMANDS[word]);
        go(COMMANDS[word]); log('  Moving to ' + t.getAttribute('data-title') + '.');
      }
    } else if (word === 'HELP' || word === '?') {
      log('  MARINE  PARTS  CAPS  PROCESS  INDUSTRIES  ABOUT  QUOTE');
      log('  GRID  DIMS  LAYERS  CALL');
    } else if (word === 'GRID' || word === 'F7') { toggleLayer('grid'); log('  Grid ' + (layerOn('grid') ? 'on' : 'off') + '.'); }
    else if (word === 'DIM' || word === 'DIMS') { toggleLayer('dim'); log('  Dimensions ' + (layerOn('dim') ? 'on' : 'off') + '.'); }
    else if (word === 'LAYER' || word === 'LAYERS' || word === 'LA') { openLayers(); }
    else if (word === 'CALL' || word === 'PHONE') {
      if (phoneDigits) { log('  Calling ' + SITE.phone + '…'); location.href = 'tel:+' + phoneDigits; }
      else log('  Phone number to be added.');
    } else if (word === 'U' || word === 'UNDO') { log('  Nothing to undo. Everything is still here.'); }
    else log('  Unknown command "' + raw + '". Type HELP.');
  });

  /* ------------------------------------------------------------------
     Layers
     ------------------------------------------------------------------ */
  var LAYERS = ['grid', 'dim', 'ctr', 'hid', 'anno'];
  function layerOn(k) { return !doc.body.classList.contains('layer-off-' + k); }
  function setLayer(k, on, save) {
    doc.body.classList.toggle('layer-off-' + k, !on);
    $$('[data-layer="' + k + '"]').forEach(function (c) { c.checked = on; });
    $$('[data-layer-toggle="' + k + '"]').forEach(function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (save !== false) store('layer.' + k, on ? '1' : '0');
    doc.dispatchEvent(new CustomEvent('tp:layers'));
  }
  function toggleLayer(k) { setLayer(k, !layerOn(k)); }
  LAYERS.forEach(function (k) { if (store('layer.' + k) === '0') setLayer(k, false, false); });
  $$('[data-layer-toggle]').forEach(function (b) { b.addEventListener('click', function () { toggleLayer(b.getAttribute('data-layer-toggle')); }); });
  $$('[data-layer]').forEach(function (c) { c.addEventListener('change', function () { setLayer(c.getAttribute('data-layer'), c.checked); }); });
  var layersPanel = $('#layers'), layersBtn = $('[data-layers-open]');
  function openLayers() { layersPanel.hidden = false; layersBtn.setAttribute('aria-expanded', 'true'); }
  function closeLayers() { layersPanel.hidden = true; layersBtn.setAttribute('aria-expanded', 'false'); }
  layersBtn.addEventListener('click', function () { if (layersPanel.hidden) openLayers(); else closeLayers(); });
  doc.addEventListener('click', function (e) {
    if (!layersPanel.hidden && !layersPanel.contains(e.target) && !layersBtn.contains(e.target)) closeLayers();
  });

  /* ------------------------------------------------------------------
     Coordinates readout and drawing crosshair
     ------------------------------------------------------------------ */
  var coords = $('[data-coords]'), vp = $('[data-xhair]'), svg = $('[data-dwg-svg]');
  var mx = 0, my = 0, pending = false, overVp = false;
  function fmt(v) { var s = v.toFixed(3); return (v >= 0 ? ' ' : '') + s; }
  function updateCoords() {
    pending = false;
    var x, y;
    if (overVp && svg && svg.getScreenCTM()) {
      var pt = svg.createSVGPoint(); pt.x = mx; pt.y = my;
      var p = pt.matrixTransform(svg.getScreenCTM().inverse());
      x = (p.x - 200) / 80; y = (470 - p.y) / 80;
      var r = vp.getBoundingClientRect();
      vp.style.setProperty('--x', (mx - r.left) + 'px');
      vp.style.setProperty('--y', (my - r.top) + 'px');
    } else {
      x = (mx + window.scrollX) / 96;
      y = (doc.documentElement.scrollHeight - (my + window.scrollY)) / 96;
    }
    coords.textContent = 'X' + fmt(x) + '  Y' + fmt(y);
  }
  if (window.matchMedia('(pointer: fine)').matches) {
    doc.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      overVp = !!(vp && vp.contains(e.target));
      if (!pending) { pending = true; requestAnimationFrame(updateCoords); }
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     Routing sheet
     ------------------------------------------------------------------ */
  var rtChecks = $$('.rt input[type="checkbox"]'), flow = $('[data-routing-flow]'), count = $('[data-routing-count]');
  function renderRouting() {
    var items = [['010', 'Review']];
    rtChecks.forEach(function (c) {
      var tr = c.closest('tr'); tr.classList.toggle('is-on', c.checked);
      if (c.checked) items.push([c.getAttribute('data-op'), tr.querySelector('th').textContent]);
    });
    items.push(['100', 'Final check']);
    flow.innerHTML = items.map(function (it) { return '<li><span>' + it[0] + '</span>' + it[1] + '</li>'; }).join('');
    var n = items.length - 2;
    count.textContent = n === 0 ? 'Pick the operations your part needs.' :
      n + ' shop operation' + (n > 1 ? 's' : '') + ', all in one building.';
  }
  rtChecks.forEach(function (c) { c.addEventListener('change', renderRouting); });
  $$('.rt tr[data-op]').forEach(function (tr) {
    tr.addEventListener('click', function (e) {
      if (e.target.closest('label, input')) return;
      var c = tr.querySelector('input'); c.checked = !c.checked; renderRouting();
    });
  });
  $$('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () {
      var ops = b.getAttribute('data-preset').split(',');
      rtChecks.forEach(function (c) { c.checked = ops.indexOf(c.getAttribute('data-op')) >= 0; });
      renderRouting();
    });
  });
  var initialOps = ['030', '040', '090'];
  rtChecks.forEach(function (c) { c.checked = initialOps.indexOf(c.getAttribute('data-op')) >= 0; });
  renderRouting();

  /* ------------------------------------------------------------------
     Request for quote
     ------------------------------------------------------------------ */
  var rfq = $('[data-rfq]'), F = rfq.elements, rfqStatus = $('[data-rfq-status]'), rfqErr = $('[data-rfq-error]');
  var submitBtn = $('[data-rfq-submit]'), intro = $('[data-rfq-intro]');
  if (!SITE.email) {
    submitBtn.textContent = 'Copy request';
    intro.innerHTML = 'Fill this in and the page writes up your request so you can copy it. The shop\'s email address is ' +
      (SITE.showPlaceholders ? TBD : 'coming soon') + (SITE.phone ? '; until then, call <a href="tel:+' + phoneDigits + '">' + SITE.phone + '</a>.' : '.') +
      ' Nothing is sent from this page.';
  }
  if (!SITE.email) { var fine = $('[data-rfq-fine]'); if (fine) fine.textContent = 'Have drawings or photos? Mention them in your notes and the shop will tell you where to send them.'; }
  $$('[data-routing-use]').forEach(function (a) {
    a.addEventListener('click', function () {
      var chosen = rtChecks.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      $$('input[name="ops"]', rfq).forEach(function (c) { c.checked = chosen.indexOf(c.value) >= 0; });
      flash('Routing added to your request.');
    });
  });
  var prefill = '';
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('[data-quote-similar], [data-quote-industry]');
    if (!a) return;
    var ind = a.getAttribute('data-quote-industry');
    if (ind) F.industry.value = ind;
    var sim = a.getAttribute('data-quote-similar');
    if (sim) {
      var text = 'Something like example part ' + sim + ': ';
      if (!F.part.value || F.part.value === prefill) F.part.value = text;
      prefill = text;
      var p = window.TPViewer && window.TPViewer.catalog.filter(function (c) { return sim.indexOf(c.dwg) === 0; })[0];
      if (p) {
        F.industry.value = p.group === 'Marine' ? 'Marine' : p.group === 'Brewery' ? 'Brewery equipment' : p.group === 'Scientific' ? 'Scientific equipment' : p.group.indexOf('Automotive') === 0 ? 'Automotive' : 'Other';
        $$('input[name="ops"]', rfq).forEach(function (c) {
          var v = c.value.toLowerCase();
          c.checked = p.ops.some(function (o) { o = o.toLowerCase(); return o === v || (v.indexOf('drilling') === 0 && o.indexOf('drilling') === 0) || (v.indexOf('press brake') === 0 && o.indexOf('press brake') === 0); });
        });
      }
    }
  });
  function flash(msg) {
    rfqStatus.textContent = msg;
    clearTimeout(flash.t); flash.t = setTimeout(function () { rfqStatus.textContent = ''; }, 5000);
  }
  function buildRequest() {
    var f = F, ops = $$('input[name="ops"]:checked', rfq).map(function (c) { return c.value; });
    function block(rows) {
      return rows.filter(function (r) { return r[1]; }).map(function (r) { return r[0] + ': ' + r[1]; }).join('\n');
    }
    var parts = [
      'REQUEST FOR QUOTE: Technical Precision Corp.',
      block([['Name', f.name.value.trim()], ['Company / boat', f.company.value.trim()], ['Email', f.email.value.trim()], ['Phone', f.phone.value.trim()], ['Industry', f.industry.value]]),
      'Part:\n' + f.part.value.trim(),
      block([['Material', f.material.value.trim()], ['Quantity', f.qty.value.trim()], ['Needed by', f.date.value], ['Processes', ops.join(', ')], ['Finish', f.finish.value.trim()]]),
      f.notes.value.trim() ? 'Notes:\n' + f.notes.value.trim() : '',
      ''
    ];
    return parts.filter(Boolean).join('\n\n') + '\n';
  }
  function validate() {
    var bad = [];
    var email = F.email.value.trim(), phone = F.phone.value.replace(/\D/g, '');
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email), phoneOk = phone.length >= 10;
    var reachable = (emailOk || !email) && (emailOk || phoneOk);
    [['name', F.name.value.trim().length > 0], ['email', reachable || emailOk], ['phone', reachable || phoneOk], ['part', F.part.value.trim().length > 0]]
      .forEach(function (c) { F[c[0]].setAttribute('aria-invalid', c[1] ? 'false' : 'true'); if (!c[1]) bad.push(F[c[0]]); });
    if (bad.length) {
      rfqErr.hidden = false; rfqErr.textContent = 'Please fill in your name, what you need made, and a valid email or phone number so the shop can get back to you.';
      bad[0].focus(); return false;
    }
    rfqErr.hidden = true; return true;
  }
  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return new Promise(function (res, rej) {
      var ta = doc.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      doc.body.appendChild(ta); ta.select();
      try { doc.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); }
      doc.body.removeChild(ta);
    });
  }
  function doCopy() {
    if (!validate()) return;
    copyText(buildRequest()).then(function () {
      flash(SITE.phone && !SITE.email ? 'Copied. Call ' + SITE.phone + ' or paste it into a message to the shop.' : 'Request copied.');
    }, function () { flash('Copy failed. Select the fields and copy by hand.'); });
  }
  // The page sends the request itself through the form service (SITE.formEndpoint). If the customer left an
  // email it becomes the reply-to, so Dave can just hit Reply.
  rfq.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!SITE.email || !SITE.formEndpoint) { doCopy(); return; }
    if (!validate()) return;
    var sent = function () {
      rfq.reset(); rfqErr.hidden = true;
      rfqStatus.textContent = 'Sent! The shop will get back to you soon.';
    };
    if (F._honey.value) { sent(); return; }                 // a bot filled the hidden field
    var ops = $$('input[name="ops"]:checked', rfq).map(function (c) { return c.value; }).join(', ');
    var email = F.email.value.trim();
    var data = {
      _subject: 'Quote request: ' + (F.part.value.trim().split('\n')[0].slice(0, 60) || 'part') + ' (' + F.name.value.trim() + ')',
      'Name': F.name.value.trim(), 'Reply by email': email || '(none given)', 'Reply by phone': F.phone.value.trim() || '(none given)',
      'Company or boat': F.company.value.trim(), 'Industry': F.industry.value, 'Part': F.part.value.trim(),
      'Material': F.material.value.trim(), 'Quantity': F.qty.value.trim(), 'Needed by': F.date.value,
      'Processes': ops, 'Finish': F.finish.value.trim(), 'Notes': F.notes.value.trim()
    };
    if (email) data._replyto = email;
    submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; rfqStatus.textContent = '';
    fetch(SITE.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || String(j.success) === 'false') throw new Error(j.message || r.status); }); })
      .then(sent, function () {
        rfqErr.hidden = false;
        rfqErr.innerHTML = 'Sorry, that didn\'t go through. Please try again in a minute, or call <a href="tel:+' + phoneDigits + '">' + SITE.phone + '</a>.';
      })
      .then(function () { submitBtn.disabled = false; submitBtn.textContent = 'Send request'; });
  });
  ['name', 'email', 'phone', 'part'].forEach(function (k) {
    F[k].addEventListener('input', function () { if (F[k].value.trim()) F[k].setAttribute('aria-invalid', 'false'); });
  });

  /* ------------------------------------------------------------------
     3D viewer: load only when the parts sheet comes near
     ------------------------------------------------------------------ */
  var THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var THREE_SRI = 'sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu';
  var viewerRoot = $('[data-viewer]'), started = false;
  function load(src, sri) {
    return new Promise(function (res, rej) {
      var s = doc.createElement('script'); s.src = src; s.async = true;
      if (sri) { s.integrity = sri; s.crossOrigin = 'anonymous'; }
      s.onload = res; s.onerror = rej; doc.head.appendChild(s);
    });
  }
  function startViewer() {
    if (started || !viewerRoot) return; started = true;
    var three = window.THREE ? Promise.resolve() : load(THREE_SRC, THREE_SRI).catch(function () { return null; });
    three.then(function () { return load('js/viewer.js'); }).then(function () {
      window.TPViewer.init(viewerRoot);
    }).catch(function (err) {
      viewerRoot.classList.add('vw-no-gl');
      var fb = $('[data-vw="fallback"]', viewerRoot); if (fb) fb.hidden = false;
      if (window.console) console.warn('Viewer failed to load', err);
    });
  }
  if (viewerRoot) {
    if ('IntersectionObserver' in window) {
      var vIO = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { vIO.disconnect(); startViewer(); }
      }, { rootMargin: '900px 0px' });
      vIO.observe(viewerRoot);
    } else startViewer();
  }

  /* ------------------------------------------------------------------
     Poster sheet: print the PDF, or share the poster link (phone share sheet, else copy)
     ------------------------------------------------------------------ */
  var posterPrint = $('[data-poster-print]'), posterShare = $('[data-poster-share]');
  if (posterPrint) posterPrint.addEventListener('click', function () {
    var w = window.open('marketing/poster.pdf', '_blank');
    if (w) { try { w.addEventListener('load', function () { w.print(); }); } catch (e) { /* the PDF viewer has its own print button */ } }
  });
  if (posterShare) posterShare.addEventListener('click', function () {
    var url = new URL('marketing/poster.pdf', location.href).href;
    if (navigator.share) { navigator.share({ title: 'Technical Precision poster', url: url }).catch(function () {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
      function () { posterShare.textContent = 'Link copied'; setTimeout(function () { posterShare.textContent = 'Share'; }, 2500); },
      function () { location.href = url; });
  });

  /* ------------------------------------------------------------------
     Floating back-to-top: appears once you are a screen down, steps aside
     when the 3D viewer's zoom buttons pass underneath it
     ------------------------------------------------------------------ */
  // "Scroll" hint at the bottom of the Overview page, until the visitor starts scrolling.
  (function () {
    var cue = $('[data-scroll-cue]'), hero = $('#top'); if (!cue || !hero) return;
    var paint = function () {
      var onHero = !hero.classList.contains('tab-off') && hero.getBoundingClientRect().height > 0;
      var more = doc.documentElement.scrollHeight - window.innerHeight > 200;
      cue.classList.toggle('is-shown', onHero && more && window.scrollY < 40);
    };
    window.__paintScrollCue = paint;
    window.addEventListener('scroll', paint, { passive: true }); window.addEventListener('resize', paint);
    cue.addEventListener('click', function () { window.scrollBy({ top: window.innerHeight * 0.75, behavior: reduced ? 'auto' : 'smooth' }); });
    setTimeout(paint, 400);
  })();

  var toTop = $('[data-to-top]'), zoomBox = $('.vw-zoom'), topPending = false;
  function overlaps(a, b) { return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom; }
  function paintToTop() {
    topPending = false;
    var far = window.scrollY > Math.max(480, window.innerHeight * 0.75);
    if (far && zoomBox && zoomBox.offsetParent) far = !overlaps(toTop.getBoundingClientRect(), zoomBox.getBoundingClientRect());
    toTop.classList.toggle('is-shown', far);
    toTop.tabIndex = far ? 0 : -1;
  }
  if (toTop) {
    window.addEventListener('scroll', function () { if (!topPending) { topPending = true; requestAnimationFrame(paintToTop); } }, { passive: true });
    window.addEventListener('resize', paintToTop);
    toTop.addEventListener('click', function (e) {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      // keyboard users land on the open tab, not back on a button that is about to hide
      if (e.detail === 0) { var tab = $('[data-tabs] a[aria-current="page"]') || $('.brand'); if (tab) tab.focus({ preventScroll: true }); }
    });
    requestAnimationFrame(paintToTop);  // after the first layout, so it doesn't force one
  }

  /* ------------------------------------------------------------------
     Open the first tab (or the one in the address, e.g. #quote)
     ------------------------------------------------------------------ */
  if (tabsOn) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';  // a remembered spot belongs to another tab
    var startEl = location.hash.length > 1 ? doc.getElementById(location.hash.slice(1)) : null;
    if (tabFor(startEl)) go(location.hash); else go('#top', false);
    // The browser's own jump to #id can land after ours; for a tab's first sheet the top of the page is the spot,
    // so the Previous / Next buttons above it show.
    if (startEl && tabFor(startEl) && tabFor(startEl).els[0] === startEl) {
      window.addEventListener('load', function () {
        if (window.scrollY < 200) instantly(function (b) { window.scrollTo({ top: 0, left: 0, behavior: b }); });
      });
    }
    mainEl.classList.add('tabs-on');
    root.classList.add('tabs-ready');
    stripFade();
  }
})();
