import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { HDRLoader } from './vendor/loaders/HDRLoader.js';
import { addLandscape } from './house-landscape.js?v=realism-1';

// One geometric model, continuously rendered from the visitor's camera.
export function setupHouse360() {
  const area = document.querySelector('.house360-area');
  if (!area) return;
  const viewport = document.querySelector('#house360Viewport');
  const status = document.querySelector('#house360Status');
  const overlay = document.querySelector('#house360Overlay');
  const retry = document.querySelector('#house360Retry');
  const touchButton = document.querySelector('#house360Touch');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 700px)');
  const presets = [...document.querySelectorAll('[data-house-view]')];
  let renderer, camera, scene, controls, model, environment;
  let ready = false, loading = false, visible = false, frame = 0, tween = null;
  let activeTouch = false, homeDistance = 30, lost = false, renderCount = 0;
  const center = new THREE.Vector3();
  const homeTheta = -.55, homePhi = 1.30;
  const viewAngles = {front:[0,1.25], right:[Math.PI/2,1.25], back:[Math.PI,1.25], left:[-Math.PI/2,1.25], top:[homeTheta,.18]};

  function motionAllowed() { return !reduced.matches && !document.documentElement.classList.contains('motion-paused'); }
  function requestDraw() {
    if (!ready || lost || !visible || document.hidden || frame) return;
    frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = 0;
    if (!ready || lost || !visible || document.hidden) return;
    if (tween) {
      const t = Math.min(1, (now - tween.start)/650);
      const k = 1 - Math.pow(1-t,3);
      camera.position.lerpVectors(tween.from,tween.to,k);
      if (t >= 1) tween = null;
    }
    const changed = controls.update();
    renderer.render(scene,camera);
    viewport.dataset.renderCount = String(++renderCount);
    viewport.dataset.yaw = controls.getAzimuthalAngle().toFixed(3);
    viewport.dataset.pitch = controls.getPolarAngle().toFixed(3);
    viewport.dataset.distance = controls.getDistance().toFixed(3);
    viewport.dataset.triangles = String(renderer.info.render.triangles);
    viewport.dataset.drawCalls = String(renderer.info.render.calls);
    document.querySelector('#house360Angle').textContent = `${Math.round((controls.getAzimuthalAngle()*180/Math.PI+360)%360)}°`;
    if (changed || tween) requestDraw();
  }
  function selectPreset(name) { presets.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.houseView===name))); }
  function moveTo(theta,phi,distance,name='') {
    if (!ready) return;
    selectPreset(name);
    const target = new THREE.Vector3().setFromSpherical(new THREE.Spherical(distance,phi,theta)).add(center);
    // Drain any residual drag before a deliberate viewpoint choice.
    controls.enableDamping = false; controls.update(); controls.target.copy(center);
    controls.enableDamping = motionAllowed();
    if (motionAllowed()) tween = {from:camera.position.clone(),to:target,start:performance.now()};
    else {tween=null;camera.position.copy(target);controls.update();}
    requestDraw();
  }
  function zoom(factor) {
    moveTo(controls.getAzimuthalAngle(),controls.getPolarAngle(),THREE.MathUtils.clamp(controls.getDistance()*factor,controls.minDistance,controls.maxDistance));
  }
  function touchMode(on) {
    activeTouch = on;
    if (controls) controls.enabled = !compact.matches || on;
    viewport.classList.toggle('touch-active',on);
    if (renderer) renderer.domElement.style.touchAction = compact.matches&&!on?'pan-y':'none';
    touchButton.textContent = on?'Готово · листать страницу':'Обзор 360';
    touchButton.setAttribute('aria-pressed',String(on));
  }
  function resize() {
    if (!renderer) return;
    const w=viewport.clientWidth,h=viewport.clientHeight;
    if (!w||!h) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio,compact.matches?1.25:1.75));
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();requestDraw();
  }
  function fallback(message) {
    ready=false;loading=false;viewport.dataset.state='error';overlay.hidden=false;
    viewport.querySelector('img').hidden=false;
    if (renderer) renderer.domElement.hidden=true;
    document.querySelector('#house360Loading').textContent=message;
    retry.hidden=false;status.textContent='Фотография доступна. Можно повторить загрузку 3D.';
    document.querySelector('#house360Controls').hidden=true;
    presets.forEach(b=>b.disabled=true);
  }
  function cleanScene() {
    controls?.dispose();
    if(scene?.background?.isTexture)scene.background.dispose();
    if(scene) scene.traverse(o=>{if(o.isMesh){o.geometry?.dispose();for(const m of [].concat(o.material || [])){for(const value of Object.values(m))if(value?.isTexture)value.dispose();m.dispose();}}});
    environment?.dispose();renderer?.dispose();renderer?.domElement.remove();
    renderer=null;environment=null;model=null;scene=null;tween=null;
  }
  async function load() {
    if (loading||ready) return;
    loading=true;lost=false;retry.hidden=true;viewport.dataset.state='loading';
    document.querySelector('#house360Loading').textContent='Создаём пространство…';
    try {
      cleanScene();
      renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.82;
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
      const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','3D-модель дома. Стрелки — вращение и наклон, плюс и минус — масштаб, Home — исходный вид, Escape — прокрутка страницы.');
      viewport.prepend(canvas);
      scene=new THREE.Scene();scene.background=new THREE.Color('#c1d0d8');scene.fog=new THREE.Fog('#7e8b79',65,200);
      camera=new THREE.PerspectiveCamera(38,1,.1,650);
      controls=new OrbitControls(camera,canvas);
      controls.enablePan=false;controls.enableDamping=motionAllowed();controls.dampingFactor=.12;
      controls.rotateSpeed=.65;controls.zoomSpeed=.7;controls.minPolarAngle=.08;controls.maxPolarAngle=1.48;
      // Wheel normally scrolls the document; Ctrl/Cmd + wheel deliberately zooms the house.
      canvas.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)e.stopImmediatePropagation();},{capture:true,passive:true});
      controls.addEventListener('start',()=>{tween=null;selectPreset('');canvas.focus({preventScroll:true});});
      controls.addEventListener('change',requestDraw);
      const sky=new THREE.HemisphereLight(0xe3efff,0x65604a,.4);scene.add(sky);
      const sun=new THREE.DirectionalLight(0xffeed8,2.6);sun.position.set(-16,25,15);sun.castShadow=true;
      sun.shadow.mapSize.set(compact.matches?1024:2048,compact.matches?1024:2048);
      Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:75});sun.shadow.normalBias=.015;sun.shadow.bias=-.0001;sun.shadow.radius=3;sun.shadow.blurSamples=6;scene.add(sun);
      // Environment is an optional enhancement; geometry remains usable if it is unavailable.
      const hdrTask=new HDRLoader().loadAsync('assets/architecture-environment.hdr').catch(()=>null);
      const gltf=await new GLTFLoader().loadAsync('assets/models/atria-house.glb',e=>{
        // ProgressEvent can report more loaded bytes than its estimated total.
        const percent=e.total>0?Math.min(100,Math.max(0,Math.round(e.loaded/e.total*100))):null;
        document.querySelector('#house360Loading').textContent=percent===null?'Загружаем 3D-модель…':`Загружаем 3D-модель · ${percent}%`;
      });
      model=gltf.scene;scene.add(model);
      model.traverse(o=>{if(o.isMesh){
        const glass=/glass|glazing/i.test(o.material?.name||'');
        o.castShadow=!glass;o.receiveShadow=!glass;
        if(o.material){o.material.envMapIntensity=.8;
          // Thin architectural panes need transparency and reflections, not an
          // extra full-scene refraction pass on every gesture.
          if(glass){o.material.transmission=0;o.material.transparent=true;o.material.opacity=.48;o.material.depthWrite=false;o.material.color.set('#b7c9c6');o.material.roughness=.075;o.material.envMapIntensity=1.35;o.material.needsUpdate=true;}
          if(/graphite|aluminium/i.test(o.material.name)){o.material.color.set('#383c39');o.material.metalness=.55;o.material.roughness=.48;}
          if(/concrete/i.test(o.material.name)){o.material.color.set('#b7b3a6');o.material.roughness=.9;}
        }
      }});
      const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
      bounds.getCenter(center);center.y=bounds.min.y+size.y*.43;
      const garden=await addLandscape(scene,renderer,bounds,compact.matches);viewport.dataset.landscape=garden.userData.ready?'ready':'fallback';
      homeDistance=Math.max(size.x,size.z)*1.7*(compact.matches?1.25:1);
      controls.target.copy(center);controls.minDistance=Math.max(size.x,size.z)*.8;controls.maxDistance=homeDistance*1.85;
      camera.position.setFromSpherical(new THREE.Spherical(homeDistance,homePhi,homeTheta)).add(center);
      controls.update();resize();
      const hdr=await hdrTask;
      if(hdr){hdr.mapping=THREE.EquirectangularReflectionMapping;const pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromEquirectangular(hdr);scene.environment=environment.texture;scene.background=hdr;scene.backgroundBlurriness=.012;scene.backgroundIntensity=1.15;scene.environmentIntensity=.8;pmrem.dispose();}
      loading=false;ready=true;viewport.dataset.state='ready';viewport.dataset.renderer='webgl';
      renderer.shadowMap.needsUpdate=true;viewport.querySelector('img').hidden=true;overlay.hidden=true;
      document.querySelector('#house360Controls').hidden=false;presets.forEach(b=>b.disabled=false);
      status.textContent='Дом готов. Выберите фасад или поверните модель сами.';
      touchMode(false);requestDraw();
      canvas.addEventListener('keydown',e=>{
        if(e.key==='Escape'){touchMode(false);canvas.blur();return;}
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;
        e.preventDefault();
        if(e.key==='Home')return moveTo(homeTheta,homePhi,homeDistance);
        if(['+','=','-'].includes(e.key))return zoom(e.key==='-'?1.16:1/1.16);
        const theta=controls.getAzimuthalAngle()+({'ArrowLeft':-.2,'ArrowRight':.2}[e.key]||0);
        const phi=THREE.MathUtils.clamp(controls.getPolarAngle()+({'ArrowUp':-.15,'ArrowDown':.15}[e.key]||0),.08,1.48);
        moveTo(theta,phi,controls.getDistance());
      });
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;fallback('3D приостановлено устройством. Повторите загрузку.');});
    } catch(error) {
      console.warn('House model unavailable:',error.message);
      fallback('Не удалось открыть 3D. Попробуйте ещё раз или используйте другой браузер.');
    }
  }
  retry.onclick=load;
  touchButton.onclick=()=>touchMode(!activeTouch);
  document.querySelector('#house360Reset').onclick=()=>moveTo(homeTheta,homePhi,homeDistance);
  document.querySelector('#house360ZoomIn').onclick=()=>zoom(1/1.18);
  document.querySelector('#house360ZoomOut').onclick=()=>zoom(1.18);
  presets.forEach(b=>{b.disabled=true;b.onclick=()=>{const [theta,phi]=viewAngles[b.dataset.houseView];moveTo(theta,phi,homeDistance,b.dataset.houseView);};});
  const fullscreen=document.querySelector('#house360Fullscreen');
  fullscreen.onclick=async()=>{try{
    if(document.fullscreenElement===area)await document.exitFullscreen();
    else if(area.requestFullscreen)await area.requestFullscreen();
    else{area.classList.toggle('house360-expanded');document.body.classList.toggle('model-expanded',area.classList.contains('house360-expanded'));fullscreen.setAttribute('aria-label',area.classList.contains('house360-expanded')?'Выйти из полного экрана':'На весь экран');resize();}
  }catch{status.textContent='Полный экран недоступен в этом браузере.';}};
  document.addEventListener('fullscreenchange',()=>{fullscreen.setAttribute('aria-label',document.fullscreenElement?'Выйти из полного экрана':'На весь экран');resize();});
  new ResizeObserver(resize).observe(viewport);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){load();requestDraw();}else{cancelAnimationFrame(frame);frame=0;touchMode(false);}},{rootMargin:'180px'}).observe(viewport);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else requestDraw();});
  function motionChanged(){if(controls)controls.enableDamping=motionAllowed();if(!motionAllowed()&&tween){camera.position.copy(tween.to);tween=null;}requestDraw();}
  reduced.addEventListener('change',motionChanged);
  new MutationObserver(motionChanged).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  compact.addEventListener('change',()=>{touchMode(false);resize();});
}
