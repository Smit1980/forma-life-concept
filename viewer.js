import * as THREE from './vendor/three.module.js';

export function createHouseViewer(container, initial) {
  const small = () => container.clientWidth < 600;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, small() ? 1 : 1.5));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.95;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const canvas=renderer.domElement;
  canvas.setAttribute('aria-label','Интерактивная архитектурная модель дома Атриа. Перетаскивайте горизонтально или используйте стрелки.');
  canvas.setAttribute('role','img');canvas.tabIndex=0;
  container.append(canvas);
  const scene=new THREE.Scene();
  scene.fog=new THREE.FogExp2('#d6dbca',.011);
  const camera=new THREE.PerspectiveCamera(36,1,.1,180);
  const target=new THREE.Vector3(0,2.5,0);
  let azimuth=.64,elevation=.075,distance=22,visible=true,drag=null,frame=0,dirty=true;
  let touring=!preference.matches, tourTime=0, windTime=0, lastTime=0, renderedFrames=0;
  let twilight=initial.light==='evening'?1:0, twilightTarget=twilight;
  const pauseGlobal=()=>document.documentElement.classList.contains('motion-paused');
  const cameraTarget={a:azimuth,e:elevation,d:distance,y:2.5};
  const ambient=new THREE.HemisphereLight('#e9eff3','#72765c',1.8);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff2d5',3.2);sun.position.set(-9,14,10);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:.5,far:55});
  sun.shadow.bias=-.00025;sun.shadow.normalBias=.035;sun.shadow.radius=3;scene.add(sun);
  const pmrem=new THREE.PMREMGenerator(renderer);
  function environment(evening){
    const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');
    const g=x.createLinearGradient(0,0,0,256);
    const colors=evening?['#263346','#6c7480','#d4a37b','#71806b']:['#aacbdd','#e7eee9','#f4ddbb','#849975'];
    [0,.45,.63,1].forEach((s,i)=>g.addColorStop(s,colors[i]));x.fillStyle=g;x.fillRect(0,0,512,256);
    const t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;t.colorSpace=THREE.SRGBColorSpace;
    const result=pmrem.fromEquirectangular(t);t.dispose();return result;
  }
  const dayEnvironment=environment(false),nightEnvironment=environment(true);
  pmrem.dispose();scene.environment=dayEnvironment.texture;
  const skyUniforms={twilight:{value:twilight}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(100,24,12),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,uniforms:skyUniforms,
    vertexShader:'varying vec3 direction; void main(){ direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:`varying vec3 direction; uniform float twilight;
      void main(){vec3 d=normalize(direction);float h=smoothstep(-.08,.3,d.y);
      vec3 day=mix(vec3(.82,.86,.79),vec3(.38,.58,.72),h);
      vec3 night=mix(vec3(.68,.40,.23),vec3(.06,.10,.18),h);
      float glow=pow(max(dot(d,normalize(vec3(-.8,.12,.5))),0.),32.);
      gl_FragColor=vec4(mix(day,night,twilight)+vec3(.28,.12,.035)*glow,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`
  }));sky.renderOrder=-10;scene.add(sky);
function proceduralTexture(kind,repeatX=1,repeatY=1){const canvas=document.createElement('canvas');canvas.width=canvas.height=384;const ctx=canvas.getContext('2d');const rand=n=>{const x=Math.sin(n*98.743)*43758.5453;return x-Math.floor(x)};if(kind==='stone'){ctx.fillStyle='#c8c0af';ctx.fillRect(0,0,384,384);for(let i=0;i<1150;i++){const x=rand(i)*384,y=rand(i+1)*384,r=.4+rand(i+2)*1.7;ctx.fillStyle=`rgba(${85+rand(i+3)*50|0},${80+rand(i+4)*45|0},${68+rand(i+5)*40|0},.28)`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}ctx.strokeStyle='rgba(83,76,65,.24)';ctx.lineWidth=1;for(let y=22;y<384;y+=27){ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<384;x+=22)ctx.lineTo(x,y+(rand(x+y)*3-1.5));ctx.stroke()}for(let x=0;x<384;x+=70){ctx.beginPath();ctx.moveTo(x,0);for(let y=0;y<384;y+=28)ctx.lineTo(x+(rand(y+x)*8-4),y);ctx.stroke()}}if(kind==='wood'){ctx.fillStyle='#8a603e';ctx.fillRect(0,0,384,384);for(let y=0;y<384;y+=3){const v=70+Math.sin(y*.22)*18+rand(y)*22;ctx.fillStyle=`rgb(${Math.min(180,v+55)|0},${Math.min(130,v+22)|0},${Math.min(88,v)|0})`;ctx.fillRect(0,y,384,2)}for(let i=0;i<18;i++){ctx.strokeStyle='rgba(53,30,16,.35)';ctx.beginPath();ctx.ellipse(rand(i)*384,rand(i+30)*384,18+rand(i+55)*36,4+rand(i+72)*7,rand(i+84)*3,0,Math.PI*2);ctx.stroke()}}if(kind==='concrete'){ctx.fillStyle='#b9b8b0';ctx.fillRect(0,0,384,384);for(let i=0;i<2800;i++){const v=150+rand(i)*70|0;ctx.fillStyle=`rgba(${v},${v},${v-4},.22)`;ctx.fillRect(rand(i+2)*384,rand(i+3)*384,1+rand(i+4)*2,1+rand(i+5)*2)}}if(kind==='grass'){ctx.fillStyle='#647759';ctx.fillRect(0,0,384,384);for(let i=0;i<2400;i++){const hue=82+rand(i)*35|0;ctx.strokeStyle=`hsla(${hue},25%,${25+rand(i+4)*18|0}%,.55)`;ctx.beginPath();const x=rand(i+8)*384,y=rand(i+9)*384;ctx.moveTo(x,y);ctx.lineTo(x+rand(i+10)*3-1.5,y-2-rand(i+11)*6);ctx.stroke()}}const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeatX,repeatY);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return texture}
    const maps={stone:proceduralTexture('stone',2.2,1.3),wood:proceduralTexture('wood',3.4,1.8),concrete:proceduralTexture('concrete',2,2),grass:proceduralTexture('grass',7,6)};
  const materials={facade:new THREE.MeshStandardMaterial({map:maps.stone,color:'#efe7d5',roughness:.84}),wood:new THREE.MeshStandardMaterial({map:maps.wood,color:'#c69566',roughness:.76}),dark:new THREE.MeshStandardMaterial({color:'#1f2925',roughness:.31,metalness:.68}),glass:new THREE.MeshPhysicalMaterial({color:'#c8dfdc',roughness:.07,metalness:.05,transmission:0,thickness:.13,ior:1.48,transparent:true,opacity:.33,side:THREE.DoubleSide}),slab:new THREE.MeshStandardMaterial({map:maps.concrete,color:'#dbd7c9',roughness:.91}),ground:new THREE.MeshStandardMaterial({map:maps.grass,color:'#91a57a',roughness:1}),path:new THREE.MeshStandardMaterial({map:maps.concrete,color:'#e2dfd2',roughness:.92}),inner:new THREE.MeshStandardMaterial({color:'#d1a772',roughness:.78,emissive:'#e8b16a',emissiveIntensity:.11}),black:new THREE.MeshStandardMaterial({color:'#101713',roughness:.38,metalness:.65})};

  materials.facade.bumpMap=maps.stone;materials.facade.bumpScale=.045;
  materials.wood.bumpMap=maps.wood;materials.wood.bumpScale=.025;
  materials.path.bumpMap=maps.concrete;materials.path.bumpScale=.018;
  materials.ground.bumpMap=maps.grass;materials.ground.bumpScale=.01;maps.grass.repeat.set(95,95);materials.ground.color.set("#b9bca5");
  // Brushed metal, woven cushions and continuous glazing retain a restrained palette.
  materials.glass.envMapIntensity=1.2;
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
  function softBox(w,h,d,x,y,z,material){
    const radius=Math.min(.075,h*.2),shape=new THREE.Shape();
    shape.moveTo(radius,0);shape.lineTo(w-radius,0);shape.quadraticCurveTo(w,0,w,radius);shape.lineTo(w,h-radius);shape.quadraticCurveTo(w,h,w-radius,h);shape.lineTo(radius,h);shape.quadraticCurveTo(0,h,0,h-radius);shape.lineTo(0,radius);shape.quadraticCurveTo(0,0,radius,0);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.02,bevelThickness:.02,curveSegments:4});
    geometry.translate(-w/2,-h/2,-d/2);const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;villa.add(mesh);return mesh;
  }
  // Readable interiors and terrace furniture.
  softBox(2.3,.43,.85,1.4,.6,1.75,materials.inner);softBox(2.3,.40,.19,1.4,.98,1.38,materials.inner);
  box(1.0,.1,.65,1.6,.56,2.45,materials.wood);box(.1,.4,.1,1.6,.33,2.45,materials.dark);
  softBox(1.95,.5,2.15,1.1,3.75,-.7,materials.inner);box(1.96,.35,.17,1.1,4.05,-1.7,materials.wood);
  for(const x of [2.2,3.8]){softBox(.9,.22,1.5,x,.53,4.53,materials.inner);box(.90,.5,.2,x,.78,3.84,materials.wood);box(.07,.25,.07,x-.35,.31,4.9,materials.dark);box(.07,.25,.07,x+.35,.31,4.9,materials.dark)}
  // Continuous ground avoids the floating platform silhouette of a product mock-up.
  const land=box(150,.25,150,0,-.4,0,materials.ground,scene);
  box(2.6,.06,10,-2.2,-.24,10.8,materials.path,scene);
  const gravel=new THREE.MeshStandardMaterial({map:maps.concrete,color:'#8c8c77',roughness:1});
  box(1.9,.05,12,-6.6,-.25,0,gravel,scene);box(1.9,.05,12,6.6,-.25,0,gravel,scene);
  const random=n=>{const r=Math.sin(n*127.1+19.3)*43758.5453;return r-Math.floor(r)};
  const treeGroups=[];
  const bark=new THREE.MeshStandardMaterial({map:maps.wood,color:'#786d58',roughness:1});
  function leafTexture(){
    const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
    ctx.strokeStyle='#65694b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(64,117);ctx.lineTo(64,12);ctx.stroke();
    for(let i=0;i<10;i++){
      const x=i%2?76:50,y=18+i*9;ctx.save();ctx.translate(x,y);ctx.rotate(i%2?.6:-.6);
      const g=ctx.createLinearGradient(-15,-5,15,8);g.addColorStop(0,'#778765');g.addColorStop(.55,'#9da77e');g.addColorStop(1,'#506544');ctx.fillStyle=g;
      ctx.beginPath();ctx.moveTo(0,-17);ctx.bezierCurveTo(13,-9,13,7,0,17);ctx.bezierCurveTo(-13,7,-13,-9,0,-17);ctx.fill();
      ctx.strokeStyle='#c0c5a18c';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(0,14);ctx.stroke();ctx.restore();
    }
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
  }
  const foliageTexture=leafTexture();
  const leaf=new THREE.MeshStandardMaterial({map:foliageTexture,alphaTest:.4,side:THREE.DoubleSide,color:'#d9dcba',roughness:.8});
  function tree(x,z,s,seed){
    const group=new THREE.Group();group.position.set(x,-.25,z);scene.add(group);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.075*s,.16*s,3.4*s,9),bark);trunk.position.y=1.7*s;trunk.castShadow=true;group.add(trunk);
    const foliage=new THREE.InstancedMesh(new THREE.PlaneGeometry(.9,.9),leaf,360);
    const transform=new THREE.Object3D();
    for(let i=0;i<360;i++){
      const theta=random(seed+i)*Math.PI*2,radius=Math.sqrt(random(seed+i+151))*1.65*s;
      transform.position.set(Math.cos(theta)*radius,(3.05+random(seed+i+41)*1.7)*s,Math.sin(theta)*radius);
      const scale=(.65+random(i+seed+8)*.8)*s;transform.scale.setScalar(scale);
      transform.rotation.set(random(i+17)*3.14,theta,random(i+32)*3.14);transform.updateMatrix();foliage.setMatrixAt(i,transform.matrix);
      foliage.setColorAt(i,new THREE.Color().setHSL(.22+random(i+seed)*.03,.12,.6+random(i+seed+30)*.24));
    }
    foliage.castShadow=true;foliage.receiveShadow=true;group.add(foliage);treeGroups.push(group);
  }
  tree(-8.5,-4.8,1.1,21);tree(8,-5.8,1.25,63);tree(-10,2,.95,103);tree(9.5,1.5,.9,143);
  tree(-13,-10,1.6,183);tree(12,-12,1.7,223);
  const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.07,.75,3),new THREE.MeshStandardMaterial({color:'#859372',roughness:1}),small()?350:650);
  const blade=new THREE.Object3D();
  for(let i=0;i<grass.count;i++){
    const side=i%2?-1:1;
    blade.position.set(side*(6.05+random(i+7)*1.3),-.06,-5.5+random(i+13)*11);
    blade.scale.set(.5+random(i+19),.4+random(i+29)*.8,.35);blade.rotation.set(.1,random(i+39)*6,.1);blade.updateMatrix();grass.setMatrixAt(i,blade.matrix);
    grass.setColorAt(i,new THREE.Color().setHSL(.19+random(i+30)*.07,.15,.28+random(i+51)*.2));
  }
  grass.receiveShadow=true;scene.add(grass);
  const glowMaterial=new THREE.MeshStandardMaterial({color:'#e6d5ae',emissive:'#ffc380',emissiveIntensity:.05,roughness:.6});
  const lightSources=[];
  for(const x of [-.5,2.7]){const lamp=new THREE.PointLight('#ffd099',0,6,2);lamp.position.set(x,2.35,1.3);scene.add(lamp);lightSources.push(lamp)}
  for(const x of [-4.5,-1,2.5,4.5])box(.38,.018,.035,x,3.035,3.5,glowMaterial);
  for(const z of [7.1,9.7,12.3]){
    box(.07,.66,.07,-3.9,.07,z,materials.dark,scene);box(.15,.06,.15,-3.9,.41,z,glowMaterial,scene);
  }
  // Batch static boxes by material: one draw call per finish, rather than per board.
  scene.updateMatrixWorld(true);
  const batches=new Map();
  scene.traverse(mesh=>{
    if(!mesh.isMesh||mesh.geometry.type!=='BoxGeometry')return;
    if(!batches.has(mesh.material))batches.set(mesh.material,[]);
    batches.get(mesh.material).push(mesh);
  });
  for(const [material,meshes] of batches){
    const positions=[],normals=[],uvs=[];const normalMatrix=new THREE.Matrix3();
    for(const mesh of meshes){
      const g=mesh.geometry.toNonIndexed();const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
      normalMatrix.getNormalMatrix(mesh.matrixWorld);
      const v=new THREE.Vector3();
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);positions.push(v.x,v.y,v.z);v.fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize();normals.push(v.x,v.y,v.z);uvs.push(uv.getX(i),uv.getY(i))}
      g.dispose();mesh.geometry.dispose();mesh.removeFromParent();
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=material!==materials.glass;mesh.receiveShadow=true;scene.add(mesh);
  }
  const tourButton=container.querySelector('#tour3d');
  const caption=container.querySelector('#tourCaption');
  const progress=container.querySelector('#tourProgress');
  function syncTour(){
    tourButton.setAttribute('aria-pressed',String(touring));
    tourButton.textContent=touring?'Ⅱ Пауза обзора':'▷ Обзор дома';
    tourButton.disabled=preference.matches;
    tourButton.setAttribute('aria-label',preference.matches?'Автообзор отключён в настройках устройства':touring?'Остановить автоматический обзор':'Запустить автоматический обзор');
    container.dataset.touring=String(touring);
    caption.textContent=touring?'01 / Архитектура и сад':'Свободный ракурс';
  }
  function stopTour(){touring=false;twilightTarget=twilight;cameraTarget.a=azimuth;cameraTarget.e=elevation;cameraTarget.d=distance;cameraTarget.y=target.y;syncTour()}
  function cameraUpdate(){
    const d=distance*(small()?1.45:1);
    camera.position.set(Math.sin(azimuth)*d,Math.sin(elevation)*d+2.7,Math.cos(azimuth)*d);
    camera.lookAt(target);
  }
  const dayColor=new THREE.Color('#d6dbca'),eveningColor=new THREE.Color('#787f79');
  const daySun=new THREE.Color('#fff2d5'),eveningSun=new THREE.Color('#ffb879');
  const dayGlass=new THREE.Color('#d5e1df'),eveningGlass=new THREE.Color('#ddd2bd');

  function lightUpdate(){
    skyUniforms.twilight.value=twilight;
    scene.fog.color.lerpColors(dayColor,eveningColor,twilight);
    scene.environment=twilight>.55?nightEnvironment.texture:dayEnvironment.texture;
    document.querySelectorAll('[data-light]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.light===(twilight>.5?'evening':'day'))));
    ambient.intensity=THREE.MathUtils.lerp(1.8,.68,twilight);
    sun.intensity=THREE.MathUtils.lerp(3.2,1.5,twilight);
    sun.color.lerpColors(daySun,eveningSun,twilight);sun.position.set(-9-5*twilight,14-9*twilight,10);
    materials.glass.color.lerpColors(dayGlass,eveningGlass,twilight);
    materials.inner.emissiveIntensity=.08+twilight*.6;glowMaterial.emissiveIntensity=.05+twilight*3;
    lightSources.forEach(l=>l.intensity=twilight*19);
  }
  function setFacade(key){
    materials.facade.map=key==='wood'?maps.wood:maps.stone;
    materials.facade.bumpMap=materials.facade.map;
    materials.facade.color.set(key==='graphite'?'#66706b':key==='wood'?'#d8bd96':'#eee7d5');
    materials.facade.roughness=key==='graphite'?.65:.84;materials.facade.needsUpdate=true;requestDraw();
  }
  function setLight(value){stopTour();twilightTarget=value==='evening'?1:0;requestDraw()}
  const keyframes=[
    {t:0,a:.64,e:.075,d:22,y:2.5,l:0},
    {t:11,a:-.48,e:.075,d:21,y:2.4,l:0},
    {t:20,a:-.12,e:.045,d:17.2,y:1.9,l:.15},
    {t:30,a:.58,e:.075,d:21,y:2.4,l:1},
    {t:40,a:.64,e:.075,d:22,y:2.5,l:0}
  ];
  function tourUpdate(){
    const t=tourTime%40;let i=0;while(i<keyframes.length-2&&t>keyframes[i+1].t)i++;
    const from=keyframes[i],to=keyframes[i+1],u=(t-from.t)/(to.t-from.t),s=u*u*(3-2*u);
    for(const k of ['a','e','d','y'])cameraTarget[k]=THREE.MathUtils.lerp(from[k],to[k],s);
    twilightTarget=THREE.MathUtils.lerp(from.l,to.l,s);
    const label=t<11?'01 / Архитектура и сад':t<22?'02 / Терраса и материалы':'03 / Тёплый вечер';
    if(caption.textContent!==label)caption.textContent=label;
    progress.style.transform=`scaleX(${t/40})`;
  }
  function draw(now){
    frame=0;if(!visible||document.hidden)return;
    const dt=Math.min((now-(lastTime||now))/1000,.5);lastTime=now;
    const motionAllowed=!preference.matches&&!pauseGlobal();
    if(touring&&motionAllowed){tourTime+=dt;tourUpdate()}
    const factor=preference.matches?1:1-Math.exp(-dt*5);
    azimuth=THREE.MathUtils.lerp(azimuth,cameraTarget.a,factor);
    elevation=THREE.MathUtils.lerp(elevation,cameraTarget.e,factor);
    distance=THREE.MathUtils.lerp(distance,cameraTarget.d,factor);
    target.y=THREE.MathUtils.lerp(target.y,cameraTarget.y,factor);
    twilight=THREE.MathUtils.lerp(twilight,twilightTarget,factor);
    const moving=Math.abs(azimuth-cameraTarget.a)+Math.abs(elevation-cameraTarget.e)+Math.abs(distance-cameraTarget.d)+Math.abs(twilight-twilightTarget)>.002;
    if(motionAllowed){windTime+=dt;treeGroups.forEach((g,i)=>g.rotation.z=Math.sin(windTime*.6+i)*.008)}
    lightUpdate();cameraUpdate();renderer.render(scene,camera);renderedFrames++;dirty=false;
    if((touring&&motionAllowed)||moving)frame=requestAnimationFrame(draw);
  }
  function requestDraw(){dirty=true;if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(draw)}
  function resize(){if(!container.clientWidth||!container.clientHeight)return;renderer.setSize(container.clientWidth,container.clientHeight);camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();requestDraw()}
  const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(container);
  const viewportObserver=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;lastTime=0;if(visible)requestDraw();else if(frame){cancelAnimationFrame(frame);frame=0}},{threshold:.01});viewportObserver.observe(container);
  const onVisibility=()=>{lastTime=0;if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0}else if(!document.hidden)requestDraw()};document.addEventListener('visibilitychange',onVisibility);
  const onPreference=()=>{if(preference.matches)stopTour();syncTour();requestDraw()};preference.addEventListener('change',onPreference);
  const motionObserver=new MutationObserver(()=>{lastTime=0;requestDraw()});motionObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  tourButton.onclick=()=>{if(touring)stopTour();else{touring=true;tourTime=0;syncTour()}requestDraw()};
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;stopTour();drag={x:e.clientX,y:e.clientY,a:azimuth,e:elevation};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;cameraTarget.a=drag.a-(e.clientX-drag.x)*.006;cameraTarget.e=e.pointerType==='touch'?drag.e:THREE.MathUtils.clamp(drag.e+(e.clientY-drag.y)*.002,.03,.65);requestDraw()});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
  function rotate(delta){stopTour();cameraTarget.a+=delta;requestDraw()}
  canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();rotate(e.key==='ArrowLeft'?-.25:.25)}});
  canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();if(frame)cancelAnimationFrame(frame);frame=0;visible=false;
    canvas.hidden=true;container.querySelector('#viewerFallback').hidden=false;container.querySelector('#viewerOverlay').hidden=false;
    container.querySelector('#start3d').hidden=true;container.querySelector('#viewerStatus').textContent='3D-просмотр недоступен. Сохранено изображение дома.';
    container.querySelector('#viewTools').hidden=true;container.querySelector('.tour-story').hidden=true;
  });
  container.querySelector('.tour-story').hidden=false;
  setFacade(initial.facade);syncTour();resize();
  return {
    setFacade,setLight,rotate,
    reset:()=>{stopTour();Object.assign(cameraTarget,{a:.64,e:.075,d:22,y:2.5});requestDraw()},
    getState:()=>({azimuth,elevation,twilight,touring,visible,renderedFrames,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls}),
    dispose:()=>{if(frame)cancelAnimationFrame(frame);sizeObserver.disconnect();viewportObserver.disconnect();motionObserver.disconnect();document.removeEventListener('visibilitychange',onVisibility);preference.removeEventListener('change',onPreference);scene.traverse(o=>{o.geometry?.dispose()});new Set(Object.values(materials)).forEach(m=>m.dispose());Object.values(maps).forEach(t=>t.dispose());dayEnvironment.dispose();nightEnvironment.dispose();sky.material.dispose();foliageTexture.dispose();leaf.dispose();bark.dispose();gravel.dispose();glowMaterial.dispose();renderer.dispose();canvas.remove()}
  };
}
