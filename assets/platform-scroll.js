/* Rotavia — seis telas estáticas WebP; cada etapa é selecionada pelo scroll.
   Nenhum vídeo é decodificado nessa seção: a troca é leve até via file://. */
(() => {
  'use strict';
  const section=document.getElementById('aplicativo');
  if(!section) return;
  const items=[
    {menu:'Painel',a:'Seu veículo.',b:'Sempre à vista.',desc:'Localização, status e informações importantes em um único painel, com tudo fácil de acompanhar.',p1:'Localização no mapa',p2:'Status em tempo real'},
    {menu:'Veículos',a:'Sua frota.',b:'Em um só lugar.',desc:'Acompanhe os veículos cadastrados e veja rapidamente quais estão conectados.',p1:'Gestão de veículos',p2:'Conexão online ou offline'},
    {menu:'Rotas',a:'Cada trajeto.',b:'No seu mapa.',desc:'Visualize trajetos e pontos importantes com uma leitura clara dos percursos.',p1:'Mapa com rotas',p2:'Trajetos organizados'},
    {menu:'Histórico',a:'Sua história.',b:'Em detalhes.',desc:'Consulte viagens anteriores, horários e registros de deslocamento.',p1:'Histórico de viagens',p2:'Registros de trajetos'},
    {menu:'Alertas',a:'Saiba primeiro.',b:'Aja melhor.',desc:'Centralize os avisos do veículo e identifique rapidamente eventos que exigem atenção.',p1:'Alertas de movimento',p2:'Notificações de segurança'},
    {menu:'Relatórios',a:'Dados claros.',b:'Mais controle.',desc:'Transforme registros em gráficos e indicadores para entender o uso do veículo ou da frota.',p1:'Gráficos de atividade',p2:'Indicadores de desempenho'}
  ];
  const nav=[...section.querySelectorAll('.platform-chapter')];
  const layers=[document.getElementById('platformImageA'),document.getElementById('platformImageB')];
  const copy=document.getElementById('platformDynamicCopy');
  const one=document.getElementById('platformHeadingOne');
  const two=document.getElementById('platformHeadingTwo');
  const desc=document.getElementById('platformDescription');
  const p1=document.getElementById('platformPointOne');
  const p2=document.getElementById('platformPointTwo');
  const count=document.getElementById('platformCount');
  const progress=document.getElementById('platformProgress');
  const bar=document.getElementById('platformTimeline');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current=0,layer=0,frame=0,copyTimer;
  const paths=items.map((_,i)=>`assets/menus/menu-${String(i+1).padStart(2,'0')}.webp`);
  // Precarregamento extremamente leve: as seis imagens somam menos de 300 KB.
  const preload=()=>paths.forEach(src=>{const im=new Image();im.src=src;});
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){preload();io.disconnect();}},{rootMargin:'800px 0px'});
    io.observe(section);
  }else preload();
  function show(n){
    n=Math.max(0,Math.min(5,n));
    if(n===current) return;
    current=n;
    const content=items[n];
    clearTimeout(copyTimer);
    if(!reduced)copy.classList.add('is-changing');
    one.textContent=content.a;
    two.textContent=content.b;
    desc.textContent=content.desc;
    p1.textContent=content.p1;
    p2.textContent=content.p2;
    count.innerHTML=`${String(n+1).padStart(2,'0')} <small>/ 06</small>`;
    count.setAttribute('aria-label',`Menu ${n+1} de 6: ${content.menu}`);
    progress.style.width=`${((n+1)/6)*100}%`;
    bar.setAttribute('aria-valuenow',String(n+1));
    nav.forEach((node,i)=>{node.classList.toggle('is-active',i===n);if(i===n)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');});
    layer=1-layer;
    const incoming=layers[layer],outgoing=layers[1-layer];
    incoming.src=paths[n];
    incoming.alt=`Menu ${content.menu} da plataforma Rotavia, apresentado em um computador`;
    incoming.removeAttribute('aria-hidden');
    outgoing.setAttribute('aria-hidden','true');
    incoming.classList.add('is-active');
    outgoing.classList.remove('is-active');
    copyTimer=setTimeout(()=>copy.classList.remove('is-changing'),140);
  }
  // Região sticky: mesma distância de rolagem para todos os seis menus.
  function sync(){
    frame=0;
    const start=window.scrollY+section.getBoundingClientRect().top;
    const travel=Math.max(1,section.offsetHeight-window.innerHeight);
    const fraction=Math.max(0,Math.min(.999999,(window.scrollY-start)/travel));
    show(Math.min(5,Math.floor(fraction*6)));
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(sync);}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('pageshow',schedule);
  function go(n){
    const ix=Math.max(0,Math.min(5,n));
    const top=window.scrollY+section.getBoundingClientRect().top;
    const distance=Math.max(1,section.offsetHeight-window.innerHeight);
    window.scrollTo({top:top+distance*((ix+.48)/6),behavior:reduced?'instant':'smooth'});
  }
  nav.forEach((button,i)=>{button.addEventListener('click',()=>go(i));button.addEventListener('keydown',e=>{
    if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
    e.preventDefault();const target=Math.max(0,Math.min(5,i+(e.key==='ArrowRight'?1:-1)));
    go(target);nav[target].focus();
  });});
  schedule();
})();
