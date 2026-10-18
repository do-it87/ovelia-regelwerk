/* Ovelia Roleplay – Suche in den Gesetzen (oben rechts). Liest den Text direkt aus index.html, bleibt also automatisch aktuell. */
(function () {
  'use strict';
  var css = [
    '#ovs{position:fixed;top:14px;right:18px;z-index:70;width:min(360px,calc(100vw - 36px));font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}',
    '#ovs .ovs-box{display:flex;align-items:center;gap:8px;padding:0 12px;height:42px;border-radius:12px;border:1px solid rgba(80,130,255,.45);',
    'background:linear-gradient(145deg,rgba(14,48,150,.92),rgba(3,10,36,.94));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
    'box-shadow:0 6px 26px rgba(0,0,0,.45),0 0 18px rgba(47,107,255,.25);transition:border-color .2s,box-shadow .2s}',
    '#ovs .ovs-box:focus-within{border-color:#7ea9ff;box-shadow:0 6px 26px rgba(0,0,0,.5),0 0 22px rgba(126,169,255,.55)}',
    '#ovs svg{flex:0 0 auto;width:17px;height:17px;fill:none;stroke:#7ea9ff;stroke-width:2;stroke-linecap:round}',
    '#ovs input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#eaf0ff;font-size:.92rem;font-family:inherit}',
    '#ovs input::placeholder{color:#8fa6dc}',
    '#ovs input::-webkit-search-cancel-button{filter:invert(1) opacity(.7);cursor:pointer}',
    '#ovs .ovs-res{display:none;margin-top:8px;max-height:min(70vh,560px);overflow-y:auto;border-radius:12px;border:1px solid rgba(80,130,255,.45);',
    'background:rgba(4,12,42,.96);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 12px 40px rgba(0,0,0,.6)}',
    '#ovs.ovs-open .ovs-res{display:block}',
    '#ovs .ovs-cnt{padding:9px 14px;font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;color:#a6bbf0;border-bottom:1px solid rgba(80,130,255,.25)}',
    '#ovs a.ovs-hit{display:block;padding:10px 14px;text-decoration:none;border-bottom:1px solid rgba(80,130,255,.15);color:#eaf0ff}',
    '#ovs a.ovs-hit:last-child{border-bottom:0}',
    '#ovs a.ovs-hit:hover,#ovs a.ovs-hit.ovs-act{background:rgba(47,107,255,.28)}',
    '#ovs .ovs-law{font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:#7ea9ff;font-weight:700}',
    '#ovs .ovs-t{font-size:.92rem;font-weight:700;margin:1px 0 2px}',
    '#ovs .ovs-s{font-size:.8rem;color:#b9c9f5;line-height:1.45}',
    '#ovs mark{background:rgba(126,169,255,.35);color:#fff;border-radius:3px;padding:0 1px}',
    '#ovs .ovs-none{padding:14px;color:#a6bbf0;font-size:.88rem}',
    '.ovs-flash{outline:2px solid #7ea9ff!important;outline-offset:4px;border-radius:10px;box-shadow:0 0 28px rgba(126,169,255,.7)!important;transition:outline-color .6s,box-shadow .6s}',
    '@media(max-width:760px){#ovs{top:10px;right:10px;width:calc(100vw - 20px)}}'
  ].join('');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var wrap = document.createElement('div'); wrap.id = 'ovs'; wrap.setAttribute('role', 'search');
  wrap.innerHTML = '<div class="ovs-box"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
    '<input type="search" autocomplete="off" spellcheck="false" placeholder="Gesetze durchsuchen …" aria-label="Gesetze durchsuchen"></div><div class="ovs-res" role="listbox"></div>';
  document.body.appendChild(wrap);
  var input = wrap.querySelector('input'), res = wrap.querySelector('.ovs-res');

  var isIndex = !!document.querySelector('section.law');
  var items = null, loading = null, timer = null, active = -1, current = [];

  function norm(s) { return s.toLowerCase().replace(/[äöüß]/g, function (c) { return { 'ä': 'a', 'ö': 'o', 'ü': 'u', 'ß': 's' }[c]; }); }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }

  function collect(doc) {
    var out = [];
    [].forEach.call(doc.querySelectorAll('section.law'), function (law) {
      var h = law.querySelector('h1'), lawName = h ? txt(h) : '';
      [].forEach.call(law.querySelectorAll('article.par'), function (a) {
        var h3 = a.querySelector('h3'), body = [];
        [].forEach.call(a.querySelectorAll('p'), function (p) { body.push(txt(p)); });
        out.push({ id: a.id, law: lawName, title: h3 ? txt(h3) : '', text: body.join(' ') });
      });
      [].forEach.call(law.querySelectorAll('tr[id]'), function (tr) {
        var cells = [].map.call(tr.children, txt).filter(Boolean);
        out.push({ id: tr.id, law: lawName, title: cells[0] || '', text: cells.slice(1).join(' · ') });
      });
    });
    out.forEach(function (it) { it.nt = norm(it.title); it.nx = norm(it.text); });
    return out;
  }

  function load() {
    if (items) return Promise.resolve(items);
    if (loading) return loading;
    if (isIndex) { items = collect(document); return Promise.resolve(items); }
    loading = fetch('index.html', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (html) {
      items = collect(new DOMParser().parseFromString(html, 'text/html'));
      return items;
    }).catch(function () { items = collect(document); return items; });
    return loading;
  }

  function snippet(it, toks) {
    var t = it.text, nt = it.nx, pos = -1, i;
    for (i = 0; i < toks.length; i++) { var p = nt.indexOf(toks[i]); if (p >= 0 && (pos < 0 || p < pos)) pos = p; }
    if (pos < 0) return esc(t.slice(0, 140)) + (t.length > 140 ? ' …' : '');
    var s = Math.max(0, pos - 50), e = Math.min(t.length, s + 150);
    return (s > 0 ? '… ' : '') + mark(t.slice(s, e), norm(t.slice(s, e)), toks) + (e < t.length ? ' …' : '');
  }
  function mark(raw, n, toks) {
    var spans = [], i;
    toks.forEach(function (tk) { var p = 0, q; while ((q = n.indexOf(tk, p)) >= 0) { spans.push([q, q + tk.length]); p = q + tk.length; } });
    if (!spans.length) return esc(raw);
    spans.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [spans[0]];
    for (i = 1; i < spans.length; i++) { var l = merged[merged.length - 1]; if (spans[i][0] <= l[1]) l[1] = Math.max(l[1], spans[i][1]); else merged.push(spans[i]); }
    var o = '', c = 0;
    merged.forEach(function (m) { o += esc(raw.slice(c, m[0])) + '<mark>' + esc(raw.slice(m[0], m[1])) + '</mark>'; c = m[1]; });
    return o + esc(raw.slice(c));
  }

  function run() {
    var q = input.value.trim();
    if (q.length < 2) { wrap.classList.remove('ovs-open'); res.innerHTML = ''; current = []; return; }
    load().then(function (list) {
      var toks = norm(q).split(/\s+/).filter(Boolean), hits = [];
      list.forEach(function (it, idx) {
        var score = 0, ok = true;
        toks.forEach(function (tk) {
          var inT = it.nt.indexOf(tk) >= 0, inX = it.nx.indexOf(tk) >= 0;
          if (!inT && !inX) { ok = false; return; }
          score += (inT ? 10 : 0) + (inX ? 1 : 0);
        });
        if (ok) hits.push({ it: it, score: score, idx: idx });
      });
      hits.sort(function (a, b) { return b.score - a.score || a.idx - b.idx; });
      var total = hits.length; hits = hits.slice(0, 50); current = hits;
      var h = '<div class="ovs-cnt">' + (total ? total + (total === 1 ? ' Treffer' : ' Treffer') + (total > 50 ? ' (die ersten 50)' : '') : 'Keine Treffer') + '</div>';
      if (!total) h += '<div class="ovs-none">Nichts gefunden. Versuch es mit einem anderen Stichwort.</div>';
      hits.forEach(function (x, i) {
        var it = x.it, href = (isIndex ? '#' : 'index.html#') + it.id;
        h += '<a class="ovs-hit" role="option" data-i="' + i + '" href="' + esc(href) + '"><div class="ovs-law">' + esc(it.law) + '</div>' +
          '<div class="ovs-t">' + mark(it.title, it.nt, toks) + '</div><div class="ovs-s">' + snippet(it, toks) + '</div></a>';
      });
      res.innerHTML = h; res.scrollTop = 0; active = -1; wrap.classList.add('ovs-open');
    });
  }

  function flash(id) {
    setTimeout(function () {
      var el = document.getElementById(id); if (!el) return;
      el.scrollIntoView({ block: 'center' });
      el.classList.add('ovs-flash'); setTimeout(function () { el.classList.remove('ovs-flash'); }, 2600);
    }, 120);
  }

  res.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.ovs-hit'); if (!a) return;
    wrap.classList.remove('ovs-open');
    if (isIndex) {
      var id = a.getAttribute('href').slice(1);
      if (location.hash === '#' + id) { e.preventDefault(); flash(id); } else { flash(id); }
    } else {
      try { sessionStorage.setItem('ovsFlash', a.getAttribute('href').split('#')[1]); } catch (x) { }
    }
  });

  function setActive(n) {
    var links = res.querySelectorAll('a.ovs-hit'); if (!links.length) return;
    active = (n + links.length) % links.length;
    [].forEach.call(links, function (l, i) { l.classList.toggle('ovs-act', i === active); });
    links[active].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 120); });
  input.addEventListener('focus', function () { load(); if (input.value.trim().length >= 2) wrap.classList.add('ovs-open'); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { var l = res.querySelectorAll('a.ovs-hit'); var a = l[active >= 0 ? active : 0]; if (a) { e.preventDefault(); a.click(); if (!isIndex) location.href = a.getAttribute('href'); else if (location.hash !== '#' + a.getAttribute('href').slice(1)) location.hash = a.getAttribute('href'); } }
    else if (e.key === 'Escape') { wrap.classList.remove('ovs-open'); input.blur(); }
  });
  document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) wrap.classList.remove('ovs-open'); });
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) && tag !== 'input' && tag !== 'textarea') { e.preventDefault(); input.focus(); input.select(); }
  });

  if (isIndex) { try { var f = sessionStorage.getItem('ovsFlash'); if (f) { sessionStorage.removeItem('ovsFlash'); flash(f); } } catch (x) { } }
})();
