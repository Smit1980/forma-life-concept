// Frames are rendered from one consistent model: no generated cross-view morphing.
export function setupHouse360() {
  const viewport=document.querySelector('#house360Viewport');if(!viewport)return;
  const picture=viewport.querySelector('img'),start=document.querySelector('#startHouse360');
  const angle=document.querySelector('#house360Angle'),slider=document.querySelector('#house360Slider');
  const status=document.querySelector('#house360Status'),spin=document.querySelector('#house360Spin');
  const zoom=document.querySelector('#house360Zoom'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const count=72,step=360/count,folder=innerWidth<700?'assets/orbit-v2/mobile':'assets/orbit-v2';
  let images=[],index=0,ready=false,loading=false,visible=false,rotating=false,timer=0,previousTime=0,drag=null;
  const wrap=n=>(Math.round(n)%count+count)%count;
  function posterFallback(){if(!ready&&/\/orbit(?:-v2)?\//.test(picture.src)){picture.src='assets/house-large.webp';picture.alt='Исходная иллюстрация дома. Круговой обзор — отдельный архитектурный концепт.'}}
  picture.addEventListener('error',posterFallback);if(picture.complete&&!picture.naturalWidth)posterFallback();
  document.querySelectorAll('[data-house-angle]').forEach(b=>b.disabled=true);
  function render(n){
    const next=wrap(n);if(!images[next])return;
    index=next;picture.src=images[index].src;viewport.dataset.frame=String(index);
    angle.textContent=`${Math.round(index*step)}°`;slider.value=String(index);slider.setAttribute('aria-valuetext',`${Math.round(index*step)} градусов`);
    document.querySelectorAll('[data-house-angle]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.houseAngle)===index*step)));
  }
  function allowed(){return ready&&rotating&&visible&&!document.hidden&&!reduced.matches&&!document.documentElement.classList.contains('motion-paused')}
  function tick(now){timer=0;if(!allowed())return;if(now-previousTime>100){render(index+1);previousTime=now}timer=requestAnimationFrame(tick)}
  function sync(){
    cancelAnimationFrame(timer);timer=0;spin.disabled=reduced.matches;
    spin.textContent=reduced.matches?'Без автообзора':rotating?'Ⅱ Пауза':'▷ Автообзор';spin.setAttribute('aria-pressed',String(rotating));
    if(allowed())timer=requestAnimationFrame(tick);
  }
  function manual(n){rotating=false;render(n);sync()}
  async function load(){
    if(loading)return;loading=true;start.disabled=true;status.textContent='Загружаем ракурсы…';
    let completed=0,failed=0;const jobs=Array.from({length:count},(_,i)=>i);
    async function worker(){while(jobs.length){
      const i=jobs.shift();if(images[i]){completed++;continue}const image=new Image();image.decoding='async';
      try{image.src=`${folder}/frame-${String(i).padStart(3,'0')}.webp`;await image.decode();images[i]=image;completed++;if(completed%6===0)status.textContent=`Ракурсы: ${completed} из ${count}`}
      catch{failed++}
    }}
    await Promise.all(Array.from({length:6},worker));loading=false;
    if(failed){start.disabled=false;status.textContent='Не все ракурсы загрузились. Повторите загрузку.';return}
    ready=true;document.querySelectorAll('[data-house-angle]').forEach(b=>b.disabled=false);render(0);document.querySelector('#house360Overlay').hidden=true;
    document.querySelector('#house360Controls').hidden=false;viewport.tabIndex=0;
    viewport.setAttribute('aria-label','Обзор дома на 360 градусов. Стрелки влево и вправо меняют ракурс.');
    status.textContent='Все 72 ракурса загружены';viewport.focus({preventScroll:true});sync();
  }
  start.addEventListener('click',load);
  document.querySelector('#house360Left').onclick=()=>manual(index-1);
  document.querySelector('#house360Right').onclick=()=>manual(index+1);
  document.querySelector('#house360Reset').onclick=()=>manual(0);
  slider.addEventListener('input',()=>manual(Number(slider.value)));
  document.querySelectorAll('[data-house-angle]').forEach(b=>b.onclick=()=>manual(Number(b.dataset.houseAngle)/step));
  spin.onclick=()=>{rotating=!rotating;sync()};
  zoom.onclick=()=>{const on=viewport.classList.toggle('house360-zoom');zoom.setAttribute('aria-pressed',String(on));zoom.textContent=on?'− Масштаб':'+ Масштаб'};
  const fullscreen=document.querySelector('#house360Fullscreen'),area=viewport.closest('.house360-area');
  fullscreen.onclick=async()=>{try{if(document.fullscreenElement===area)await document.exitFullscreen();else await area.requestFullscreen()}catch{status.textContent='Полный экран недоступен на этом устройстве.'}};
  document.addEventListener('fullscreenchange',()=>fullscreen.setAttribute('aria-label',document.fullscreenElement===area?'Выйти из полного экрана':'Открыть обзор на весь экран'));
  viewport.addEventListener('keydown',event=>{if(!ready)return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();manual(index+(event.key==='ArrowRight'?1:-1))}if(event.key==='Home'){event.preventDefault();manual(0)}});
  viewport.addEventListener('pointerdown',event=>{if(!ready||!event.isPrimary||event.button!==0)return;drag={id:event.pointerId,x:event.clientX,index};viewport.setPointerCapture(event.pointerId);rotating=false;sync()});
  viewport.addEventListener('pointermove',event=>{if(drag?.id===event.pointerId)manual(drag.index+(drag.x-event.clientX)/7)});
  const end=()=>{drag=null};viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);viewport.addEventListener('lostpointercapture',end);picture.draggable=false;
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{threshold:.1}).observe(viewport);
  document.addEventListener('visibilitychange',sync);
  new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',()=>{if(reduced.matches)rotating=false;sync()});sync();
}
