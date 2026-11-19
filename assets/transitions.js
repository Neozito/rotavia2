/* Rotavia — efeitos de transição. Depende só do que já existe na página; não altera nenhum outro script. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* 1) Entrada da página */
  var intro = document.getElementById('pageIntro');
  if (intro) {
    if (reduce) {
      intro.remove();
    } else {
      var started = Date.now(), closed = false;
      var closeIntro = function () {
        if (closed) return;
        closed = true;
        intro.classList.add('is-done');
        setTimeout(function () { intro.classList.add('is-gone'); }, 1100);
      };
      var tryClose = function () {
        var wait = Math.max(0, 950 - (Date.now() - started));
        setTimeout(closeIntro, wait);
      };
      if (document.readyState === 'complete') tryClose();
      else window.addEventListener('load', tryClose, { once: true });
      setTimeout(closeIntro, 3200); // limite máximo, mesmo com rede lenta
      window.addEventListener('pageshow', function (e) { if (e.persisted) { closed = false; closeIntro(); } });
    }
  }

  /* 3) Escalonamento dos elementos .reveal (mesmo grupo = entrada em sequência) */
  var parents = new Set();
  Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) { parents.add(el.parentElement); });
  parents.forEach(function (parent) {
    var kids = Array.prototype.filter.call(parent.children, function (c) { return c.classList.contains('reveal'); });
    if (kids.length < 2) return;
    kids.forEach(function (el, i) { el.style.setProperty('--rd', Math.min(i * 90, 450) + 'ms'); });
  });
  document.addEventListener('transitionend', function (e) {
    var el = e.target;
    if (e.propertyName === 'opacity' && el.classList && el.classList.contains('reveal') && el.style.getPropertyValue('--rd')) {
      el.style.removeProperty('--rd');
    }
  });

  if (reduce || !('IntersectionObserver' in window)) return;

  /* 2) Transição entre seções: linha de luz + entrada do conteúdo */
  var sections = Array.prototype.slice.call(document.querySelectorAll('.section, .platform-scroll'));
  root.classList.add('sx-ready');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('sx-in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -8% 0px' });
  sections.forEach(function (s) { io.observe(s); });
  // Segurança: se algo impedir a observação, nada fica escondido.
  setTimeout(function () {
    sections.forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) s.classList.add('sx-in');
    });
  }, 2500);
  /* 4b) Títulos: separa em palavras para subirem em sequência */
  var heads = document.querySelectorAll('.section .headline');
  Array.prototype.forEach.call(heads, function (h) {
    var idx = 0, nodes = [], walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var frag = document.createDocumentFragment();
      n.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement('span'), i = document.createElement('span');
        w.className = 'hl-w';
        i.textContent = part;
        i.style.setProperty('--i', idx++);
        w.appendChild(i);
        frag.appendChild(w);
      });
      n.parentNode.replaceChild(frag, n);
    });
  });
  if (heads.length) root.classList.add('hl-ready');

  /* 4c) Barra de progresso de leitura */
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  var fill = document.createElement('span');
  bar.appendChild(fill);
  document.body.appendChild(bar);
  var raf = 0;
  function paintBar() {
    raf = 0;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    fill.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0) + ')';
  }
  function queueBar() { if (!raf) raf = requestAnimationFrame(paintBar); }
  window.addEventListener('scroll', queueBar, { passive: true });
  window.addEventListener('resize', queueBar, { passive: true });
  paintBar();

  /* 4d) FAQ: abertura e fechamento suaves */
  Array.prototype.forEach.call(document.querySelectorAll('.faq details'), function (d) {
    var sum = d.querySelector('summary'), p = d.querySelector('p');
    if (!sum || !p || !d.animate) return;
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      var start = d.offsetHeight;
      if (d._a) { d._a.cancel(); d._a = null; }
      var bb = parseFloat(getComputedStyle(d).borderBottomWidth) || 0;
      var closedH = sum.offsetHeight + bb;
      var opening = !d.open;
      d.style.overflow = 'hidden';
      if (opening) { d.open = true; d.classList.remove('is-closing'); }
      else d.classList.add('is-closing');
      var end = opening ? d.offsetHeight : closedH;
      var ease = 'cubic-bezier(.2,.7,.2,1)';
      var a = d.animate({ height: [start + 'px', end + 'px'] }, { duration: 380, easing: ease, fill: 'forwards' });
      var pa = p.animate({ opacity: opening ? [0, 1] : [1, 0] }, { duration: 300, delay: opening ? 90 : 0, easing: 'ease', fill: 'both' });
      d._a = a;
      a.onfinish = function () {
        d.open = opening;
        d.classList.remove('is-closing');
        d.style.overflow = '';
        d._a = null;
        a.cancel(); pa.cancel();
      };
      a.oncancel = function () { pa.cancel(); };
    });
  });
  /* 5) Divisórias com formas (morfam ao rolar) + camadas de parallax */
  var DH = 112; // altura (em unidades do viewBox) da divisória
  function bgOf(el) {
    while (el && el !== document.documentElement) {
      var c = getComputedStyle(el).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
      el = el.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  // x: 0→1 enquanto a emenda atravessa a tela. A curva fica mais marcada no centro e relaxa nas bordas.
  function curve(variant, x) {
    var H = DH, a = Math.sin(Math.PI * clamp01(x)), sk = (clamp01(x) - .5) * 2, c = { c1x: 380, c2x: 1060 };
    if (variant === 0) {            // onda em S
      c.y0 = H * (.5 + .18 * sk); c.y3 = H * (.5 - .18 * sk);
      c.c1y = H * (.5 + .85 * a); c.c2y = H * (.5 - .85 * a);
    } else if (variant === 1) {     // diagonal que se inclina
      c.y0 = H * (.5 - .35 * a + .15 * sk); c.y3 = H * (.5 + .35 * a - .15 * sk);
      c.c1x = 480; c.c2x = 960;
      c.c1y = c.y0 + (c.y3 - c.y0) / 3; c.c2y = c.y0 + 2 * (c.y3 - c.y0) / 3;
    } else {                        // arco
      c.y0 = c.y3 = H * (.62 - .12 * sk); c.c1x = 480; c.c2x = 960;
      c.c1y = c.c2y = H * (.62 - .12 * sk - .75 * a);
    }
    return c;
  }
  function strokeD(c, off) {
    return 'M0,' + (c.y0 + off) + ' C' + c.c1x + ',' + (c.c1y + off) + ' ' + c.c2x + ',' + (c.c2y + off) + ' 1440,' + (c.y3 + off);
  }
  function fillD(c, where) {
    var edge = where === 'top' ? 0 : DH;
    return 'M0,' + edge + ' L1440,' + edge + ' L1440,' + c.y3 + ' C' + c.c2x + ',' + c.c2y + ' ' + c.c1x + ',' + c.c1y + ' 0,' + c.y0 + ' Z';
  }

  var dividers = [], layers = [], activeD = new Set(), activeL = new Set();

  var io1 = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) activeD.add(e.target._d); else activeD.delete(e.target._d); });
    queuePx();
  }, { rootMargin: '25% 0px 25% 0px' });
  var io2 = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) activeL.add(e.target._layer); else activeL.delete(e.target._layer); });
    queuePx();
  }, { rootMargin: '30% 0px 30% 0px' });
  var io3 = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('d-in'); io3.unobserve(e.target); } });
  }, { threshold: .4 });
  var main = document.querySelector('main') || document.body;
  var order = Array.prototype.slice.call(main.querySelectorAll(':scope > .section, :scope > .platform-scroll'));
  var secCount = 0;

  order.forEach(function (sec, i) {
    var prev = sec.previousElementSibling;
    var isPlatform = sec.classList.contains('platform-scroll');

    /* camada de parallax de fundo (só nas seções comuns) */
    if (!isPlatform) {
      secCount++;
      var layer = document.createElement('div');
      layer.className = 'px-layer ' + (secCount % 2 ? 'px-r' : 'px-l');
      layer.setAttribute('aria-hidden', 'true');
      layer.innerHTML = '<span class="px-orb"></span><span class="px-ring"></span><span class="px-num">' + (secCount < 10 ? '0' : '') + secCount + '</span>';
      sec.insertBefore(layer, sec.firstChild);
      layers.push({ host: sec, orb: layer.children[0], ring: layer.children[1], num: layer.children[2] });
      io2.observe(sec);
      sec._layer = layers[layers.length - 1];
    }

    /* divisória na emenda com a seção anterior */
    if (!prev) return;
    var host = isPlatform ? prev : sec;
    var where = isPlatform ? 'bottom' : 'top';
    var color = isPlatform ? bgOf(sec) : bgOf(prev);
    var wrap = document.createElement('div');
    wrap.className = 'sx-div sx-div-' + where + (i % 2 ? ' flip' : '');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML =
      '<svg class="sx-fill" viewBox="0 0 1440 ' + DH + '" preserveAspectRatio="none"><path></path></svg>' +
      '<svg class="sx-stroke" viewBox="0 0 1440 ' + DH + '" preserveAspectRatio="none"><path class="s2"></path><path class="s1"></path></svg>' +
      '<span class="sx-shape sx-ring2 sx-s1"></span><span class="sx-shape sx-dia sx-s2"></span><span class="sx-shape sx-plus sx-s3"></span>';
    wrap.querySelector('.sx-fill path').style.fill = color;
    if (where === 'top') host.insertBefore(wrap, host.firstChild); else host.appendChild(wrap);
    var d = {
      el: wrap, where: where, variant: i % 3,
      fill: wrap.querySelector('.sx-fill path'),
      s1: wrap.querySelector('.sx-stroke .s1'),
      s2: wrap.querySelector('.sx-stroke .s2'),
      sh: wrap.querySelectorAll('.sx-shape')
    };
    wrap._d = d;
    dividers.push(d);
    io1.observe(wrap);
    io3.observe(wrap);
  });

  var SH = [ { y: -.22, r: 220, b: 0 }, { y: .16, r: -160, b: 45 }, { y: -.10, r: 300, b: 0 } ];
  function updateDivider(d, vh) {
    var r = d.el.getBoundingClientRect();
    var p = 1 - (r.top + r.height / 2) / vh;
    var x = clamp01((p - .05) / .9);
    var c = curve(d.variant, x);
    d.fill.setAttribute('d', fillD(c, d.where));
    d.s1.setAttribute('d', strokeD(c, 0));
    d.s2.setAttribute('d', strokeD(curve(d.variant, clamp01(x + (d.variant % 2 ? -.14 : .14))), 10));
    for (var k = 0; k < d.sh.length; k++) {
      d.sh[k].style.transform = 'translate3d(0,' + ((p - .5) * vh * SH[k].y).toFixed(1) + 'px,0) rotate(' + (SH[k].b + (p - .5) * SH[k].r).toFixed(1) + 'deg)';
    }
  }
  function updateLayer(l, vh) {
    var r = l.host.getBoundingClientRect();
    var cy = r.top + r.height / 2 - vh / 2;
    l.orb.style.transform = 'translate3d(0,' + (-cy * .14).toFixed(1) + 'px,0)';
    l.ring.style.transform = 'translate3d(0,' + (cy * .09).toFixed(1) + 'px,0) rotate(' + (cy * .04).toFixed(1) + 'deg)';
    l.num.style.transform = 'translate3d(0,' + (-cy * .07).toFixed(1) + 'px,0)';
  }
  var raf2 = 0;
  function pxFrame() {
    raf2 = 0;
    var vh = window.innerHeight;
    activeD.forEach(function (d) { updateDivider(d, vh); });
    activeL.forEach(function (l) { updateLayer(l, vh); });
  }
  function queuePx() { if (!raf2) raf2 = requestAnimationFrame(pxFrame); }
  window.addEventListener('scroll', queuePx, { passive: true });
  window.addEventListener('resize', queuePx, { passive: true });
  window.addEventListener('load', queuePx);
  dividers.forEach(function (d) { updateDivider(d, window.innerHeight); });
  layers.forEach(function (l) { updateLayer(l, window.innerHeight); });
  queuePx();
})();
