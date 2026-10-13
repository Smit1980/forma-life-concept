import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

// Local CC0 maps and instanced planting; no animation loop or external service.
export async function addLandscape(scene, renderer, bounds, compact) {
  const group = new THREE.Group(); group.name = 'garden'; scene.add(group);
  const groundY = bounds.min.y - .025;
  let seed = 14871;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const loader = new THREE.TextureLoader();
  async function texture(file, repeat, color = false) {
    try {
      const map = await loader.loadAsync(`assets/landscape/${file}`);
      if (color) map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(repeat, repeat);
      map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return map;
    } catch { return null; }
  }
  const [grass, normal, rough, gravel, gravelNormal, shrub] = await Promise.all([
    texture('grass-color.jpg', 230, true), texture('grass-normal.jpg', 230),
    texture('grass-roughness.jpg', 230), texture('gravel-color.jpg', 6, true),
    texture('gravel-normal.jpg', 6), new GLTFLoader().loadAsync('assets/landscape/shrub.glb').catch(() => null)
  ]);
  const terrain = new THREE.PlaneGeometry(480, 480, compact?32:64, compact?32:64); terrain.rotateX(-Math.PI / 2);
  const positions = terrain.attributes.position, colors = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const fade = THREE.MathUtils.smoothstep(Math.hypot(x, z), 21, 60);
    positions.setY(i, groundY + fade * Math.sin(x*.095)*Math.cos(z*.07)*.22);
    const tint = .88 + .08*Math.sin(x*.17+z*.12) + .04*Math.cos(z*.37-x*.08);
    colors.push(tint, tint, tint*.94);
  }
  terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); terrain.computeVertexNormals();
  const lawn = new THREE.Mesh(terrain, new THREE.MeshStandardMaterial({
    map: grass, normalMap: normal, normalScale: new THREE.Vector2(.6,.6), roughnessMap: rough,
    roughness: 1, color: grass ? 0xc8c4a9 : 0x6e784c, vertexColors: true, transparent: true, depthWrite: false
  }));
  // Fade the far field into the photographed horizon, keeping the near lawn opaque.
  lawn.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a *= 1.0-smoothstep(55.0,125.0,length(vViewPosition));\n#include <opaque_fragment>');};
  lawn.renderOrder=-1;
  lawn.receiveShadow = true; group.add(lawn);

  const stone = new THREE.MeshStandardMaterial({map:gravel,normalMap:gravelNormal,normalScale:new THREE.Vector2(.4,.4),color:0xd9d4c6,roughness:.96});
  stone.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),diffuseColor.rgb,.12);');};
  const bedMaterial = new THREE.MeshStandardMaterial({color:0x534b36,roughness:1});
  function ellipse(x,z,rx,rz,material) {
    const geometry = new THREE.CircleGeometry(1,48); geometry.rotateX(-Math.PI/2);
    const mesh = new THREE.Mesh(geometry,material); mesh.scale.set(rx,1,rz);
    mesh.position.set(x,groundY+(material===bedMaterial ? .028 : .012),z); mesh.receiveShadow=true; group.add(mesh);
  }
  ellipse(-8.6,1.6,2.15,7.2,stone); ellipse(9.0,1.0,1.9,6.5,stone);
  ellipse(-5.65,9.05,2.65,1.65,stone); ellipse(6.1,8.8,2.25,1.65,stone);
  ellipse(-8.65,1.6,1.35,6.3,bedMaterial); ellipse(9.0,1.0,1.05,5.7,bedMaterial);

  // Slabs meet the bottom step and continue towards the visitor at real scale.
  const slab = new THREE.BoxGeometry(4.0,.085,1.25);
  const paving = new THREE.MeshStandardMaterial({color:0xb1ae9e,roughness:.85,metalness:0});
  const path = new THREE.InstancedMesh(slab,paving,9), matrix = new THREE.Object3D();
  for(let i=0;i<9;i++) {
    matrix.position.set(.65,groundY+.05,bounds.max.z+.65+i*1.43);
    matrix.rotation.set(0,0,0);matrix.scale.set(1,1,1);matrix.updateMatrix();path.setMatrixAt(i,matrix.matrix);
  }
  path.receiveShadow=true;path.castShadow=true;group.add(path);

  // A soft grounding shadow supplements the sun beneath the deep terrace.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,10,64,64,64);
  gradient.addColorStop(0,'rgba(24,29,19,0.45)');gradient.addColorStop(.68,'rgba(24,29,19,0.24)');gradient.addColorStop(1,'rgba(24,29,19,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(22,18),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,opacity:.62}));
  contact.rotation.x=-Math.PI/2;contact.position.set(.3,groundY+.006,2.0);group.add(contact);

  if(shrub) {
    shrub.scene.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(shrub.scene),size=box.getSize(new THREE.Vector3()),mid=box.getCenter(new THREE.Vector3());
    const placements=[[-8.8,-3.8],[-8.8,-1.6],[-8.9,.5],[-8.6,2.5],[-8.8,4.7],[-8.2,6.8],[9.1,-3.6],[9.1,-1.2],[9.0,1.3],[9.0,3.5],[8.8,5.7],[-6.8,9.1],[-5.4,9.6],[-4.5,8.9],[5.7,9.0],[7.0,8.5],[-6.4,-6.3],[-3.8,-6.8],[.3,-6.6],[3.7,-6.7],[6.3,-6.1]].filter((_,i)=>!compact||[0,2,4,6,8,10,11,13,14,15,17,19].includes(i));
    shrub.scene.traverse(source=>{
      if(!source.isMesh) return;
      const geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);
      geometry.translate(-mid.x,-box.min.y,-mid.z);geometry.scale(1/size.y,1/size.y,1/size.y);
      const material=source.material;material.transparent=false;material.depthWrite=true;material.opacity=1;material.alphaTest=.45;material.side=THREE.DoubleSide;material.roughness=.92;material.envMapIntensity=.65;
      const plants=new THREE.InstancedMesh(geometry,material,placements.length);
      placements.forEach(([x,z],i)=>{
        const scale=.9+random()*.5;
        matrix.position.set(x,groundY,z);matrix.rotation.set(0,random()*Math.PI*2,0);matrix.scale.set(scale*1.45,scale,scale*1.45);matrix.updateMatrix();plants.setMatrixAt(i,matrix.matrix);
      });
      plants.castShadow=true;plants.receiveShadow=true;group.add(plants);source.geometry.dispose();
    });
  }

  // Short blades create a real silhouette around the planting, using one draw call.
  const blade=new THREE.BufferGeometry();
  blade.setAttribute('position',new THREE.Float32BufferAttribute([-.025,0,0,.025,0,0,.015,.15,.035,0,0,-.025,0,0,.025,.035,.12,.01],3));blade.computeVertexNormals();
  const count=compact?550:1100, blades=new THREE.InstancedMesh(blade,new THREE.MeshStandardMaterial({color:0x768046,roughness:1,side:THREE.DoubleSide}),count);
  for(let i=0;i<count;i++) {
    const angle=random()*Math.PI*2, radius=11+random()*10;
    let x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
    if(Math.abs(x-.65)<2.5 && z>7) x+=3.5;
    matrix.position.set(x,groundY,z);matrix.rotation.set(0,random()*Math.PI*2,0);matrix.scale.setScalar(.55+random()*.7);matrix.updateMatrix();blades.setMatrixAt(i,matrix.matrix);
    blades.setColorAt(i,new THREE.Color().setHSL(.19+random()*.045,.22+random()*.15,.3+random()*.1));
  }
  blades.receiveShadow=true;group.add(blades);
  group.userData.ready=!!grass&&!!normal&&!!shrub;
  return group;
}
