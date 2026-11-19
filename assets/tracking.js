/* Rotavia: cena cinematográfica limpa + abas acessíveis dos recursos.
   Vídeo independente; não interfere no hero controlado pelo scroll. */
(() => {
  'use strict';
  const root = document.getElementById('trackingShowcase');
  if (!root) return;
  const tabs = [...root.querySelectorAll('.tracking-tab')];
  const detail = document.getElementById('trackingDetail');
  const title = document.getElementById('trackingInfoTitle');
  const desc = document.getElementById('trackingInfoDesc');
  const icon = document.getElementById('trackingInfoIconUse');
  const indexLabel = document.getElementById('trackingIndex');
  const video = document.getElementById('trackingVideo');
  const toggle = document.getElementById('trackingMotionToggle');
  const symbol = toggle?.querySelector('.tracking-control-symbol');
  const label = toggle?.querySelector('.tracking-control-text');
  const progress = document.getElementById('trackingPlaybackProgress');
  const features = {
    gps: {title:'Saiba onde seu veículo está', desc:'Consulte a localização e acompanhe deslocamentos pelo sistema.', symbol:'#i-pin', number:'01'},
    alertas: {title:'Fique por dentro de cada evento', desc:'Receba avisos de movimentação e ignição, conforme seu plano.', symbol:'#i-bell', number:'02'},
    rotas: {title:'Relembre os caminhos percorridos', desc:'Visualize os trajetos registrados e consulte seu histórico.', symbol:'#i-route', number:'03'},
    bloqueio: {title:'Mais opções de proteção', desc:'Conheça o bloqueio remoto autorizado, quando disponível.', symbol:'#i-shield', number:'04'},
    cerca: {title:'Crie áreas de atenção', desc:'Acompanhe entradas e saídas de regiões definidas no sistema.', symbol:'#i-satellite', number:'05'}
  };
  function selectFeature(key, focus=false) {
    const item=features[key]; if(!item) return;
    for (const tab of tabs) {
      const active=tab.dataset.feature===key;
      tab.classList.toggle('is-selected',active);
      tab.setAttribute('aria-selected',String(active));
      tab.tabIndex=active?0:-1;
      if (active){ detail.setAttribute('aria-labelledby',tab.id); if(focus) {tab.focus();tab.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});} }
    }
    title.textContent=item.title;
    desc.textContent=item.desc;
    icon.setAttribute('href',item.symbol);
    indexLabel.textContent=`${item.number} — 05`;
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>selectFeature(tab.dataset.feature));
    tab.addEventListener('keydown', e=>{
      let next=-1;
      if(e.key==='ArrowRight') next=(i+1)%tabs.length;
      if(e.key==='ArrowLeft') next=(i-1+tabs.length)%tabs.length;
      if(e.key==='Home') next=0;
      if(e.key==='End') next=tabs.length-1;
      if(next>=0){e.preventDefault();selectFeature(tabs[next].dataset.feature,true);}
    });
  });
  selectFeature('gps');
  if(!video || !toggle) return;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let userPaused=reducedMotion;
  let visible=false;
  let raf=0;
  video.muted=true; video.defaultMuted=true;video.playsInline=true;
  function showControl(){
    const paused=video.paused || userPaused;
    toggle.setAttribute('aria-label',paused?'Reproduzir vídeo':'Pausar vídeo');
    toggle.setAttribute('aria-pressed',String(!paused));
    toggle.title=paused?'Reproduzir cena':'Pausar cena';
    symbol.textContent=paused?'▶':'Ⅱ';
    label.textContent=paused?'Reproduzir':'Pausar';
  }
  function updateProgress(){
    if(video.duration>0 && isFinite(video.duration)) progress.style.width=`${Math.min(100,100*video.currentTime/video.duration)}%`;
    raf=0;
    if(!video.paused && visible && !document.hidden) raf=requestAnimationFrame(updateProgress);
  }
  function sync(){
    if(userPaused || !visible || document.hidden){video.pause();showControl();return;}
    video.muted=true;
    const attempt=video.play();
    if(attempt && typeof attempt.catch==='function') attempt.catch(()=>{video.pause();showControl();});
    showControl();
  }
  toggle.addEventListener('click',()=>{userPaused=!userPaused;sync();});
  video.addEventListener('play',()=>{showControl();if(!raf) raf=requestAnimationFrame(updateProgress);});
  video.addEventListener('pause',()=>{showControl();if(raf)cancelAnimationFrame(raf);raf=0;updateProgress();});
  video.addEventListener('ended',()=>{progress.style.width='0%';});
  video.addEventListener('error',()=>{userPaused=true;toggle.disabled=true;toggle.title='Vídeo indisponível';});
  if('IntersectionObserver' in window){new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);sync();},{threshold:.08}).observe(root);}
  else{visible=true;sync();}
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',()=>video.pause());
  showControl();
})();
