import * as THREE from './build/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';
import { createBackground } from './libs/three-vignette.js';

import diffuseVertexShader from './shaders/diffuse/vertex.js';
import diffuseFragmentShader from './shaders/diffuse/fragment.js';

/** Constants */

const GLOBE_RADIUS = 5;

const diffuseMaps = [];
var elapsed = 0;
let mapMaterial, globeGeometry, planeGeometry;
var paused = false;

let bgColor1 = '#ffffff',
  bgColor2 = '#bbb2b2';

const monthText = document.querySelector('#month');
const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
months.forEach((month) => {
  const monthSpan = document.createElement('span');
  monthSpan.id = month;
  monthSpan.className = 'month';
  monthSpan.innerHTML = month;
  monthText.appendChild(monthSpan);
});

var diffuseUniforms = {
  diffuseSourceA: { type: 't', value: null },
  diffuseSourceB: { type: 't', value: null },
  mask: { type: 't', value: null },
  ratio: { type: 'f', value: 0 },
};

var dummyBlackMap = new THREE.DataTexture(4, 4, new THREE.Color(0xff0000));
dummyBlackMap.anisotropy = 8;

const isMobile = window.innerWidth < 703;
const shiftRightPercent = 0; //isMobile ? 0 : 0.4;
const shiftBottomPercent = isMobile ? 0.1 : 0.1;
const cameraZoom = isMobile ? 4 : 1.5;

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

const sections = document.querySelectorAll('.content--fixedPageContent');
gsap.to(sections[0], {
  duration: 3,
  opacity: 1,
  visibility: 'visible',
  ease: 'power2.inOut',
});

/**
 * Loaders
 */

const loadingManager = new THREE.LoadingManager();

loadingManager.onStart = () => {
  console.log('onStart');
};
loadingManager.onLoaded = () => {
  console.log('onLoaded');
};
loadingManager.onProgress = () => {
  console.log('onProgress');
};
loadingManager.onError = (err) => {
  console.error('onError: ', err);
};

/**
 * Textures
 */

const textureLoader = new THREE.TextureLoader(loadingManager);

const bumpMap = textureLoader.load(
  './assets/textures/bathymetry_bw_composite_4k.jpg'
);

const normalMapWater = textureLoader.load(
  './assets/textures/water_normals.jpg'
);
normalMapWater.wrapS = normalMapWater.wrapT = THREE.RepeatWrapping;
bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

/**
 * Base
 */

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

// https://svs.gsfc.nasa.gov/3895
const stars = './assets/textures/starmap_4k.jpg';

const backgroundMap = textureLoader.load(stars);
backgroundMap.mapping = THREE.EquirectangularReflectionMapping;
backgroundMap.encoding = THREE.sRGBEncoding;

// scene.background = backgroundMap;

/**
 * Lights
 */

var light = new THREE.AmbientLight(0x404040, 0.02); // soft white light
scene.add(light);

const light1 = new THREE.DirectionalLight(0xffffff, 1.5, 5000);
light1.position.set(0, 0.5, 1).multiplyScalar(500);
scene.add(light1);

const light2 = new THREE.HemisphereLight();
light2.intensity = 0.5;
scene.add(light2);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth + shiftRightPercent * window.innerWidth, // offset globe
  height: window.innerHeight + shiftBottomPercent * window.innerHeight,
};

window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth + shiftRightPercent * window.innerWidth;
  sizes.height = window.innerHeight + shiftBottomPercent * window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Renderer
 */
var pars = {
  antialias: true,
  tonemapping: THREE.ReinhardToneMapping,
  canvas: canvas,
  alpha: true,
};

const renderer = new THREE.WebGLRenderer(pars);
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.sortObjects = false; // Render in the order the objects were added to the scene
renderer.setClearColor('#f6f9fc', 0);

canvas.addEventListener('click', onClick, false);

let globalUniforms = {
  uTime: { value: 0 },

  uSize: { value: 0.005 * renderer.getPixelRatio() },

  color: { value: new THREE.Color(0xffffff) },
  opacity: { value: 0.9 },
};

/**
 * Camera
 */

// Base camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
scene.add(camera);

camera.position.set(0, 0, cameraZoom);

// gsap.to(camera.position, {
//   duration: 2,
//   x: 0,
//   y: 0,
//   z: cameraZoom,
//   // ease: 'power2.inOut',
// });

/**
 * Objects
 */

const meshGroup = new THREE.Group();
// meshGroup.rotation.y += 3.8;
scene.add(meshGroup);

const vignette = createBackground({
  aspect: camera.aspect,
  grainScale: 0.001, // mattdesl/three-vignette-background#1
  colors: [bgColor1, bgColor2],
});
meshGroup.add(vignette);

/**
 * Globe
 */

for (var i = 0; i < 12; i++) {
  var n = '0' + (i + 1);
  if (i < 9) n = '0' + n;

  var diffuseMap1 = textureLoader.load(
    './assets/textures/earth-seasons/2k/f' + n + '.jpeg'
  );

  diffuseMap1.wrapS = diffuseMap1.wrapT = THREE.RepeatWrapping;
  diffuseMap1.anisotropy = 16;

  diffuseMaps[i] = diffuseMap1;
}

var img = new Image();
img.crossOrigin = 'anonymous';
img.src = './assets/textures/earth-seasons/2k/001.jpg';

img.onload = async function () {
  globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 512, 256);
  planeGeometry = new THREE.PlaneGeometry(3, 1.5, 64, 64);

  console.log(diffuseMaps);
  diffuseUniforms['diffuseSourceA'].value = dummyBlackMap;

  mapMaterial = new THREE.ShaderMaterial({
    uniforms: diffuseUniforms,
    vertexShader: diffuseVertexShader,
    fragmentShader: diffuseFragmentShader,
  });

  if (!isMobile) {
    mapMaterial.bumpMap = bumpMap;
    mapMaterial.bumpScale = 0.5;
  }

  const earthMap = new THREE.Mesh(planeGeometry, mapMaterial);
  // earthMap.rotation.y = Math.PI / 2;

  earthMap.castShadow = true;
  earthMap.receiveShadow = true;

  meshGroup.add(earthMap);

  // scene.fog = new THREE.Fog(new THREE.Color(0xffaa44), 0.05, 1.3);
};

/**
 * Controls
 */

let controls = new OrbitControls(camera, canvas);
controls.minDistance = 1;
controls.maxDistance = 40;
controls.enableDamping = true;
// controls.autoRotate = true;
controls.autoRotateSpeed *= 1;

// const rotateBtn = document.querySelector('#rotate-globe');
// const stopBtn = document.querySelector('#stop-globe');

// rotateBtn.addEventListener('click', (event) => {
//   rotateBtn.classList.add('hidden');
//   stopBtn.classList.remove('hidden');
//   controls.autoRotate = true;
// });

// stopBtn.addEventListener('click', (event) => {
//   rotateBtn.classList.remove('hidden');
//   stopBtn.classList.add('hidden');
//   controls.autoRotate = false;
// });

/**
 * Animate
 */

const clock = new THREE.Clock();
let time = 0,
  nn = 0;

const getDelta = function () {
  var e = 0;

  var t = Date.now();
  (e = 0.001 * (t - this.oldTime)), (this.oldTime = t), (this.elapsedTime += e);

  return e;
};
const tick = () => {
  const elapsedTime = clock.getDelta();

  // Update material
  time += 0.3;
  globalUniforms.uTime.value = time;

  // update texture
  var frameTime = 0.3;
  var zn = 12;

  if (!paused) {
    if (elapsed >= frameTime) {
      nn = (nn + 1) % zn;

      document.querySelectorAll('.month').forEach((node) => {
        node.classList.remove('current');
      });
      const currentMonth = document.querySelector(`#${months[nn]}`);
      if (currentMonth) currentMonth.classList.add('current');

      diffuseUniforms['diffuseSourceA'].value = diffuseMaps[nn];
      diffuseUniforms['diffuseSourceB'].value = diffuseMaps[(nn + 1) % zn];

      elapsed = 0;
    }

    elapsed += elapsedTime;

    diffuseUniforms['ratio'].value = clamp(elapsed / frameTime, 0.0, 1.0);
    // meshGroup.rotation.y += 0.005;
  }
  controls.update();

  // Render
  renderer.render(scene, camera);

  // scene.rotation.y -= 0.0015;

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();

function onClick() {
  paused = !paused;
}
