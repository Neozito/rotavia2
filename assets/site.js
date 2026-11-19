/* Funcionalidades do site: vídeo por scroll, menu, formulário WhatsApp, mapa e personalização. */
(function () {
  'use strict';

  const config = window.ROTAVIA_CONFIG || {};
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

  // Dados reais só são apresentados quando informados pelo responsável pelo site.
  const brand = String(config.nome || 'Rotavia').trim();
  $$('[data-brand]').forEach(el => { el.textContent = brand; });
  $$('[data-brand-html]').forEach(el => {
    el.textContent = '';
    const first = document.createTextNode(brand.length > 3 ? brand.slice(0, -3) : brand);
    const end = document.createElement('span');
    end.textContent = brand.length > 3 ? brand.slice(-3) : '';
    el.append(first, end);
  });
  $$('[data-tagline]').forEach(el => { el.textContent = (config.subtitulo || 'Rastreamento veicular').toUpperCase(); });
  document.title = brand + ' — Rastreamento veicular inteligente';
  $('#copyrightYear').textContent = new Date().getFullYear();

  const wa = String(config.whatsapp || '').replace(/\D/g, '');
  $$('.js-wa').forEach(el => {
    if (wa.length >= 12) {
      el.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(el.dataset.waMessage || 'Olá! Quero saber mais sobre rastreamento veicular.');
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    } else {
      el.href = '#contato';
      el.title = 'Ir para o formulário de contato';
    }
  });
  // CTAs do site direcionados ao WhatsApp, sem alterar links de navegação.
  const ctaSelectors = [
    '.header-actions .btn[href="#contato"]',
    '.story-step .btn[href="#contato"]',
    '.text-link[href="#contato"]',
    '.plan-cta[href="#contato"]',
    '.cta-banner .btn[href="#contato"]'
  ];
  if (wa.length >= 12) {
    $$(ctaSelectors.join(',')).forEach(el => {
      const message = el.dataset.waMessage || 'Olá! Gostaria de saber mais sobre rastreamento veicular.';
      el.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(message);
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    });
  }

  const address = [config.endereco, config.cidade].filter(Boolean).join(' — ');
  if (config.telefoneExibicao) $('#phoneDisplay').textContent = config.telefoneExibicao;
  else if (wa.length >= 12) $('#phoneDisplay').textContent = '+' + wa;
  if (config.email) $('#emailDisplay').textContent = config.email;
  if (address) {
    $('#addressDisplay').textContent = address;
    $('#contactAddress').textContent = address;
    $('#mapCaption').textContent = 'Confira nossa localização no mapa.';
  }
  const mapQuery = (config.endereco || config.mapaPesquisa || '').trim();
  if (mapQuery) {
    $('#mapIframe').src = 'https://www.google.com/maps?q=' + encodeURIComponent(mapQuery) + '&output=embed';
    $('#openMaps').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapQuery);
  }
  if (address) $('#mapIframe').title = 'Mapa da localização da empresa: ' + address;

  // Menu mobile / cabeçalho.
  const header = $('#header');
  const toggle = $('#menuToggle');
  const mobileNav = $('#mobileNav');
  const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 30);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.setAttribute('aria-label', expanded ? 'Abrir menu' : 'Fechar menu');
    header.classList.toggle('menu-open', !expanded);
  });
  $$('a', mobileNav).forEach(a => a.addEventListener('click', () => {
    header.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
  }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      header.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Retém o comportamento do vídeo original: posição da rolagem = tempo do vídeo.
  const hero = $('#hero');
  const video = $('#heroVideo');
  const loader = $('#videoLoader');
  const steps = $$('.story-step');
  const progressBar = $('#storyBar');
  const number = $('#storyNumber');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let duration = 10;
  let current = 0;
  let ready = false;
  let pendingFrame = -1;
  let activeStep = -1;

  function heroProgress() {
    const rect = hero.getBoundingClientRect();
    const total = Math.max(1, hero.offsetHeight - window.innerHeight);
    return Math.max(0, Math.min(1, -rect.top / total));
  }
  function updateStory(p) {
    const idx = p >= .75 ? 3 : p >= .50 ? 2 : p >= .25 ? 1 : 0;
    if (idx !== activeStep) {
      activeStep = idx;
      steps.forEach((step, i) => {
        step.classList.toggle('is-active', i === idx);
        step.setAttribute('aria-hidden', i === idx ? 'false' : 'true');
        // Prevent hidden links from receiving focus.
        $$('a', step).forEach(a => { a.tabIndex = i === idx ? 0 : -1; });
      });
      number.textContent = String(idx + 1).padStart(2, '0');
    }
    progressBar.style.width = (p * 100) + '%';
  }
  function finishLoading() {
    if (ready) return;
    duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 10;
    ready = true;
    loader.classList.add('done');
    current = heroProgress() * Math.max(0, duration - .04);
    try { video.currentTime = current; } catch (_) {}
    requestHeroTick();
  }
  video.addEventListener('loadedmetadata', finishLoading, { once: true });
  video.addEventListener('loadeddata', finishLoading, { once: true });
  video.addEventListener('error', () => {
    // Poster remains visible if browser can't decode video.
    loader.classList.add('done');
  });
  if (video.readyState >= 1) finishLoading();
  // Fallback for slow networks: show poster so layout never blocks indefinitely.
  window.setTimeout(() => loader.classList.add('done'), 3500);

  // Solicita frames apenas enquanto o HERO está visível ou em movimento.
  // Antes, um requestAnimationFrame infinito continuava ativo até no rodapé.
  let heroRAF = 0;
  function requestHeroTick() {
    if (!heroRAF) heroRAF = window.requestAnimationFrame(tick);
  }
  function tick() {
    heroRAF = 0;
    const rect = hero.getBoundingClientRect();
    if (rect.bottom < -30 || rect.top > window.innerHeight + 30 || document.hidden) return;
    const p = heroProgress();
    updateStory(p);
    if (!ready) return;
    const target = p * Math.max(0, duration - .04);
    current += (target - current) * (reduceMotion ? 1 : .22);
    if (Math.abs(target - current) < .015) current = target;
    const frameTime = Math.min(Math.round(current * 24) / 24, duration - .042);
    if (Math.abs(frameTime - pendingFrame) > .032 && !video.seeking && frameTime >= 0) {
      try { video.currentTime = frameTime; pendingFrame = frameTime; } catch (_) {}
    }
    if (Math.abs(target - current) > .019 || video.seeking) requestHeroTick();
  }
  window.addEventListener('scroll', requestHeroTick, { passive:true });
  window.addEventListener('resize', requestHeroTick, { passive:true });
  window.addEventListener('pageshow', requestHeroTick);
  video.addEventListener('seeked', requestHeroTick);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestHeroTick(); });
  requestHeroTick();

  // Reveal animation progressive enhancement.
  const reveal = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: .1, rootMargin: '0px 0px 25px 0px' });
    reveal.forEach(el => io.observe(el));
  } else reveal.forEach(el => el.classList.add('visible'));

  // Prefill solution choice when a plan CTA is clicked.
  $$('.plan-cta').forEach(link => link.addEventListener('click', () => {
    const select = $('#interest');
    if ($$('option', select).some(opt => opt.value === link.dataset.plan)) select.value = link.dataset.plan;
  }));

  // Generates a personalized message; opens WA if configured, otherwise offers copy.
  const form = $('#contactForm');
  const feedback = $('#formFeedback');
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const message = [
      '*Solicitação de orçamento — ' + brand + '*',
      'Nome: ' + data.get('nome'),
      'Telefone: ' + data.get('telefone'),
      data.get('email') ? 'E-mail: ' + data.get('email') : '',
      'Interesse: ' + data.get('interesse'),
      'Mensagem: ' + data.get('mensagem')
    ].filter(Boolean).join('\n');

    if (wa.length >= 12) {
      const url = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(message);
      feedback.innerHTML = 'Sua mensagem está pronta. Se o WhatsApp não abrir, <a target="_blank" rel="noopener noreferrer" style="color:var(--cyan);text-decoration:underline" href="' + url + '">clique aqui para enviar</a>.';
      feedback.classList.add('show');
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      feedback.textContent = 'Mensagem preparada. Para ativar o envio direto, configure o número de WhatsApp em assets/config.js.';
      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.textContent = 'Copiar mensagem';
      copyButton.addEventListener('click', async () => {
        try {
          if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(message);
          else {
            const temp = document.createElement('textarea');
            temp.value = message; temp.style.position = 'fixed'; temp.style.opacity = '0';
            document.body.appendChild(temp); temp.select();
            if (!document.execCommand('copy')) throw new Error('Cópia não permitida');
            temp.remove();
          }
          copyButton.textContent = 'Mensagem copiada!';
        } catch (_) { copyButton.textContent = 'Selecione e copie a mensagem abaixo'; const pre = document.createElement('pre'); pre.textContent = message; pre.style.whiteSpace = 'pre-wrap'; feedback.appendChild(pre); }
      });
      feedback.appendChild(document.createElement('br'));
      feedback.appendChild(copyButton);
      feedback.classList.add('show');
    }
  });
})();
