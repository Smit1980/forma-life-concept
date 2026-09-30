import * as THREE from './vendor/three.module.js';

export function createHouseViewer(container, initial) {
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(max-width: 600px)').matches?1:1.75));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.22;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label','Трёхмерный эскиз дома Атриа. Перетаскивайте влево и вправо или используйте стрелки клавиатуры.');
  renderer.domElement.setAttribute('role','img');
  renderer.domElement.tabIndex=0;
  container.append(renderer.domElement);
  const scene=new THREE.Scene();
  const pmrem=new THREE.PMREMGenerator(renderer);pmrem.compileEquirectangularShader();
  let skyTexture=null,envTexture=null;
  function makeSky(dusk){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;const ctx=canvas.getContext('2d');const g=ctx.createLinearGradient(0,0,0,canvas.height);if(dusk){g.addColorStop(0,'#172337');g.addColorStop(.4,'#556674');g.addColorStop(.62,'#d09870');g.addColorStop(.72,'#ebc790');g.addColorStop(1,'#6e866e')}else{g.addColorStop(0,'#b9d4e5');g.addColorStop(.48,'#e8ecdd');g.addColorStop(.7,'#f2d2a5');g.addColorStop(1,'#a4bf95')}ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);for(let i=0;i<190;i++){const x=(i*149)%canvas.width,y=(i*53)%Math.floor(canvas.height*.55),r=(i%4)+.4;ctx.fillStyle=`rgba(255,255,255,${.08+(i%5)*.025})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}const texture=new THREE.CanvasTexture(canvas);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;return texture}
  function updateEnvironment(dusk){skyTexture?.dispose();envTexture?.dispose();skyTexture=makeSky(dusk);envTexture=pmrem.fromEquirectangular(skyTexture).texture;scene.background=skyTexture;scene.environment=envTexture;renderer.shadowMap.needsUpdate=true}
  updateEnvironment(false);
  const camera=new THREE.PerspectiveCamera(36,1,.1,150);
  const target=new THREE.Vector3(0,2.1,0);
  let azimuth=.70,elevation=.35,distance=23.5,visible=true,drag=null,frame=0,dirty=true;
  const mobile=()=>container.clientWidth<500;
  function cameraUpdate(){const d=mobile()?29:23.5;distance=d;camera.position.set(Math.sin(azimuth)*distance,Math.sin(elevation)*distance+3,Math.cos(azimuth)*distance);camera.lookAt(target);dirty=true}
  const ambient=new THREE.HemisphereLight('#e6f0ff','#697752',2.5);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff3d9',3.1);sun.position.set(-7,13,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.1,far:45});sun.shadow.bias=-.0005;sun.shadow.normalBias=.04;scene.add(sun);
function proceduralTexture(kind,repeatX=1,repeatY=1){const canvas=document.createElement('canvas');canvas.width=canvas.height=384;const ctx=canvas.getContext('2d');const rand=n=>{const x=Math.sin(n*98.743)*43758.5453;return x-Math.floor(x)};if(kind==='stone'){ctx.fillStyle='#c8c0af';ctx.fillRect(0,0,384,384);for(let i=0;i<1150;i++){const x=rand(i)*384,y=rand(i+1)*384,r=.4+rand(i+2)*1.7;ctx.fillStyle=`rgba(${85+rand(i+3)*50|0},${80+rand(i+4)*45|0},${68+rand(i+5)*40|0},.28)`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}ctx.strokeStyle='rgba(83,76,65,.24)';ctx.lineWidth=1;for(let y=22;y<384;y+=27){ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<384;x+=22)ctx.lineTo(x,y+(rand(x+y)*3-1.5));ctx.stroke()}for(let x=0;x<384;x+=70){ctx.beginPath();ctx.moveTo(x,0);for(let y=0;y<384;y+=28)ctx.lineTo(x+(rand(y+x)*8-4),y);ctx.stroke()}}if(kind==='wood'){ctx.fillStyle='#8a603e';ctx.fillRect(0,0,384,384);for(let y=0;y<384;y+=3){const v=70+Math.sin(y*.22)*18+rand(y)*22;ctx.fillStyle=`rgb(${Math.min(180,v+55)|0},${Math.min(130,v+22)|0},${Math.min(88,v)|0})`;ctx.fillRect(0,y,384,2)}for(let i=0;i<18;i++){ctx.strokeStyle='rgba(53,30,16,.35)';ctx.beginPath();ctx.ellipse(rand(i)*384,rand(i+30)*384,18+rand(i+55)*36,4+rand(i+72)*7,rand(i+84)*3,0,Math.PI*2);ctx.stroke()}}if(kind==='concrete'){ctx.fillStyle='#b9b8b0';ctx.fillRect(0,0,384,384);for(let i=0;i<2800;i++){const v=150+rand(i)*70|0;ctx.fillStyle=`rgba(${v},${v},${v-4},.22)`;ctx.fillRect(rand(i+2)*384,rand(i+3)*384,1+rand(i+4)*2,1+rand(i+5)*2)}}if(kind==='grass'){ctx.fillStyle='#647759';ctx.fillRect(0,0,384,384);for(let i=0;i<2400;i++){const hue=82+rand(i)*35|0;ctx.strokeStyle=`hsla(${hue},25%,${25+rand(i+4)*18|0}%,.55)`;ctx.beginPath();const x=rand(i+8)*384,y=rand(i+9)*384;ctx.moveTo(x,y);ctx.lineTo(x+rand(i+10)*3-1.5,y-2-rand(i+11)*6);ctx.stroke()}}const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeatX,repeatY);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return texture}
    const maps={stone:proceduralTexture('stone',2.2,1.3),wood:proceduralTexture('wood',3.4,1.8),concrete:proceduralTexture('concrete',2,2),grass:proceduralTexture('grass',7,6)};
  const materials={facade:new THREE.MeshStandardMaterial({map:maps.stone,color:'#efe7d5',roughness:.84}),wood:new THREE.MeshStandardMaterial({map:maps.wood,color:'#c69566',roughness:.76}),dark:new THREE.MeshStandardMaterial({color:'#1f2925',roughness:.31,metalness:.68}),glass:new THREE.MeshPhysicalMaterial({color:'#c8dfdc',roughness:.07,metalness:.05,transmission:.64,thickness:.13,ior:1.48,transparent:true,opacity:.88,side:THREE.DoubleSide}),slab:new THREE.MeshStandardMaterial({map:maps.concrete,color:'#dbd7c9',roughness:.91}),ground:new THREE.MeshStandardMaterial({map:maps.grass,color:'#91a57a',roughness:1}),path:new THREE.MeshStandardMaterial({map:maps.concrete,color:'#e2dfd2',roughness:.92}),inner:new THREE.MeshStandardMaterial({color:'#d1a772',roughness:.78,emissive:'#e8b16a',emissiveIntensity:.11}),black:new THREE.MeshStandardMaterial({color:'#101713',roughness:.38,metalness:.65})};
  const villa=new THREE.Group();scene.add(villa);
  function box(w,h,d,x,y,z,material,parent=villa){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  // Solid rear and side walls leave the front open to true glazing and interiors.
  box(15,.22,11,0,-.18,.4,materials.path);
  box(11,.20,7,0,.04,0,materials.slab);
  box(10,.18,6.3,0,.2,0,materials.wood);
  box(.23,2.8,6,-5,1.65,0,materials.facade);
  box(.23,2.8,6,5,1.65,0,materials.facade);
  box(10,2.8,.23,0,1.65,-3,materials.facade);
  box(.18,2.8,4.4,-1.5,1.65,-.8,materials.facade);
  box(10.7,.25,6.65,0,3.19,0,materials.dark);
  box(6.1,.17,5.15,1.3,3.39,-.38,materials.wood);
  box(6.1,2.45,.21,1.3,4.7,-2.84,materials.facade);
  box(.20,2.45,4.8,4.35,4.7,-.4,materials.facade);
  box(.20,2.45,4.8,-1.75,4.7,-.4,materials.facade);
  box(6.8,.23,5.7,1.3,6.06,-.38,materials.dark);
  box(6.3,.16,5.22,1.3,5.88,-.38,materials.facade);
  function windowWall(x,y,z,w,h){box(w,h,.045,x,y,z,materials.glass);for(let u=-w/2;u<=w/2+.02;u+=w/4)box(.045,h+.05,.1,x+u,y,z+.025,materials.dark);box(w+.06,.06,.09,x,y-h/2,z+.025,materials.dark);box(w+.06,.06,.09,x,y+h/2,z+.025,materials.dark)}
  windowWall(1.72,1.68,3.02,6.35,2.75);
  windowWall(1.32,4.72,2.02,5.84,2.3);
  // Timber vertical facade rhythm around the entrance and side volume.
  box(3.2,2.85,.16,-3.32,1.66,3.0,materials.wood);
  for(let i=0;i<31;i++)box(.065,2.8,.055,-4.86+i*.103,1.66,3.1,materials.wood);
  box(1.02,2.45,.09,-3.46,1.42,3.13,materials.dark);
  box(.035,.5,.08,-3.08,1.5,3.20,materials.slab);
  // Terrace, steps, pergola, and balcony rail.
  box(11,.18,2.75,.0,.15,4.35,materials.wood);
  for(let i=0;i<40;i++)box(10.95,.012,.015,0,.25,3.05+i*.069,materials.dark);
  box(4.3,.13,.5,-2.1,-.02,6.0,materials.slab);
  box(4.8,.12,.5,-2.1,-.10,6.5,materials.slab);
  for(const x of [-5,-1.6]){box(.13,3.0,.13,x,1.69,5.52,materials.dark);box(.12,.13,2.72,x,3.25,4.26,materials.dark)}
  box(3.65,.15,.14,-3.3,3.28,5.55,materials.dark);
  for(let i=0;i<12;i++)box(.085,.13,2.8,-5+i*.31,3.36,4.21,materials.wood);
  box(6.0,.96,.035,1.35,3.92,2.86,materials.glass);
  box(6.1,.035,.08,1.35,4.40,2.86,materials.dark);
  for(const x of [-1.7,1.3,4.4])box(.035,.93,.035,x,3.93,2.88,materials.dark);
  // Small architectural details make the concept read as a real, lived-in house.
  box(.72,1.38,.72,3.55,6.73,-1.82,materials.dark);box(.9,.12,.9,3.55,7.43,-1.82,materials.black);
  for(const x of [-4.83,4.83]){box(.11,.11,5.9,x,3.06,0,materials.dark);box(.11,2.72,.11,x,.62,-2.78,materials.dark)}
  for(const x of [-2.85,-1.25,2.95,4.3]){box(.25,.12,.08,x,2.02,3.17,materials.black);const s=new THREE.PointLight('#ffd19a',.18,2.3,2);s.position.set(x,1.93,3.28);scene.add(s)}
  // Readable interiors and terrace furniture.  box(2.3,.43,.85,1.4,.6,1.75,materials.inner);box(2.3,.40,.19,1.4,.98,1.38,materials.inner);
  box(1.0,.1,.65,1.6,.56,2.45,materials.wood);box(.1,.4,.1,1.6,.33,2.45,materials.dark);
  box(1.95,.5,2.15,1.1,3.75,-.7,materials.inner);box(1.96,.35,.17,1.1,4.05,-1.7,materials.wood);
  for(const x of [2.2,3.8]){box(.9,.22,1.5,x,.53,4.53,materials.inner);box(.90,.5,.2,x,.78,3.84,materials.wood);box(.07,.25,.07,x-.35,.31,4.9,materials.dark);box(.07,.25,.07,x+.35,.31,4.9,materials.dark)}
  // Landscape stays procedural and lightweight; no external model textures.
  const land=box(19,.25,16,0,-.4,0,materials.ground,scene);
  box(4,.04,6,-2.2,-.25,7,materials.path,scene);
  const leafMaterials=['#506b48','#708559','#88966b'].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:1}));
  const trunkMat=new THREE.MeshStandardMaterial({color:'#71604c',roughness:1});
  function tree(x,z,s=1){const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.09*s,.14*s,2.5*s,7),trunkMat);trunk.position.set(x,1.0*s,z);trunk.castShadow=true;scene.add(trunk);for(let i=0;i<3;i++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry((.8+i*.08)*s,1),leafMaterials[i]);crown.position.set(x+(i-1)*.35*s,(2.05+i*.36)*s,z+(i%2)*.3);crown.scale.set(1,1.15,1);crown.castShadow=true;scene.add(crown)}}
  tree(-7,-4.5,1.25);tree(7,-4.2,1.4);tree(-7.4,.9,.9);tree(7.5,2,1.0);
  for(let i=0;i<12;i++){const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(.38+(i%3)*.06,1),leafMaterials[i%3]);bush.position.set(-7.4+i*1.35,-.03,-6);bush.scale.y=.8;scene.add(bush)}
  const lightSources=[];for(const x of [-.5,2.7]){const lamp=new THREE.PointLight('#ffbc6c',0,7,2);lamp.position.set(x,2.4,1.3);scene.add(lamp);lightSources.push(lamp)}
  function setFacade(key){materials.facade.color.set({stone:'#d8d0be',wood:'#b08a63',graphite:'#4a5550'}[key]||'#d8d0be');dirty=true}
  function setLight(value){const dusk=value==='evening';updateEnvironment(dusk);ambient.intensity=dusk?.7:2.5;sun.intensity=dusk?1.25:3.1;sun.color.set(dusk?'#f7bc8b':'#fff3d9');sun.position.set(dusk?-10:-7,dusk?5:13,8);materials.glass.color.set(dusk?'#bb9f77':'#91a8a0');materials.glass.emissive.set(dusk?'#dd9650':'#000000');materials.glass.emissiveIntensity=dusk?.42:0;materials.inner.emissiveIntensity=dusk?.65:.1;lightSources.forEach(l=>l.intensity=dusk?24:0);dirty=true}
  function draw(){frame=0;if(!visible||document.hidden||!dirty)return;renderer.render(scene,camera);dirty=false}
  function requestDraw(){dirty=true;if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(draw)}
  const originalFacade=setFacade,originalLight=setLight;
  function resize(){renderer.setSize(container.clientWidth,container.clientHeight);camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();cameraUpdate();requestDraw()}
  new ResizeObserver(resize).observe(container);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)requestDraw()},{threshold:.01}).observe(container);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestDraw()});
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,a:azimuth,e:elevation};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;azimuth=drag.a-(e.clientX-drag.x)*.008;if(e.pointerType!=='touch')elevation=Math.max(.13,Math.min(.8,drag.e+(e.clientY-drag.y)*.003));cameraUpdate();requestDraw()});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
  const rotate=delta=>{azimuth+=delta;cameraUpdate();requestDraw()};
  canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();rotate(e.key==='ArrowLeft'?-.15:.15)}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();canvas.hidden=true;container.querySelector('#viewerFallback').hidden=false;container.querySelector('#viewerOverlay').hidden=false;container.querySelector('#start3d').hidden=true;container.querySelector('#viewerStatus').textContent='3D-просмотр недоступен. Сохранено изображение дома.';container.querySelector('#viewTools').hidden=true});
  originalFacade(initial.facade);originalLight(initial.light);resize();
  return {setFacade:key=>{originalFacade(key);requestDraw()},setLight:key=>{originalLight(key);requestDraw()},rotate,reset:()=>{azimuth=.70;elevation=.35;cameraUpdate();requestDraw()},getState:()=>({azimuth,elevation,triangles:renderer.info.render.triangles})};
}

