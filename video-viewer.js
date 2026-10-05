export function setupArchitectureVideo() {
  const video=document.querySelector('#architectureVideo');
  const viewer=document.querySelector('#viewer');
  const play=document.querySelector('#tour3d');
  const start=document.querySelector('#start3d');
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  let mode='approach',started=false,userPaused=false,visible=false;
  const status=document.querySelector('#viewerStatus');
  const sync=()=>{
    const off=userPaused||preference.matches||document.hidden||!visible||document.documentElement.classList.contains('motion-paused');
    if(!started)return;
    if(off)video.pause();else video.play().catch(()=>{userPaused=true;updateButton()});
    updateButton();
  };
  function updateButton(){play.textContent=video.paused?'▷ Смотреть':'Ⅱ Пауза';play.setAttribute('aria-pressed',String(video.paused));}
  function load(){
    video.src=`assets/atria-${mode}.mp4`;video.load();
    document.querySelector('#tourCaption').textContent=mode==='glide'?'Вдоль фасада':'Ближе к дому';
    document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===mode)));
  }
  function show(){
    video.hidden=false;document.querySelector('#viewerFallback').hidden=true;document.querySelector('#viewerOverlay').hidden=true;
    for(const id of ['viewerBadge','viewTools','tourStory'])document.querySelector('#'+id).hidden=false;
    start.disabled=false;sync();
  }
  video.addEventListener('loadeddata',show);
  video.addEventListener('play',updateButton);video.addEventListener('pause',updateButton);
  video.addEventListener('error',()=>{
    video.hidden=true;document.querySelector('#viewerFallback').hidden=false;document.querySelector('#viewerOverlay').hidden=false;
    for(const id of ['viewerBadge','viewTools','tourStory'])document.querySelector('#'+id).hidden=true;
    status.textContent='Видео не загрузилось. Попробуйте ещё раз.';start.disabled=false;started=false;
  });
  start.onclick=()=>{start.disabled=true;status.textContent='Загружаем архитектурный обзор…';started=true;userPaused=false;load()};
  play.onclick=()=>{userPaused=!video.paused;sync()};
  document.querySelector('#reset3d').onclick=()=>{video.currentTime=0;sync()};
  document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>{mode=b.dataset.camera;if(started){load();sync()}else document.querySelectorAll('[data-camera]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{threshold:.1}).observe(viewer);
  new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);preference.addEventListener('change',sync);
}
