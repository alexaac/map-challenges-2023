import * as THREE from '../../js/three/build/three.module.js';
import { OrbitControls } from '../../js/three/OrbitControls.js';
import { EffectComposer } from '../../js/three/EffectComposer.js';
import { RenderPass } from '../../js/three/RenderPass.js';
import { UnrealBloomPass } from '../../js/three/UnrealBloomPass.js';
import * as lil from '../../js/libs/lil-gui.module.min.js';

/** Constants */

const isMobile = window.innerWidth < 703;
const shiftRightPercent = isMobile ? 0 : 0;
const shiftBottomPercent = isMobile ? 0.2 : 0;
const globeRadius = 5;

let bloomComposer, renderer;

const globalUniforms = {
  exposure: 0.9,
  bloomThreshold: 0,
  bloomStrength: 3,
  bloomRadius: 1,
};

const sections = document.querySelectorAll('.content--fixedPageContent');
gsap.to(sections[0], {
  opacity: 1,
  visibility: 'visible',
  ease: 'power2.inOut',
});

/**
 * Debug
 */
const gui = new lil.GUI({ closed: true, title: '', hidden: true });

// gui.hide();
// gui.close();

/**
 * Loaders
 */

/**
 * Textures
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

const textureLoader = new THREE.TextureLoader(loadingManager);

const moonMap = textureLoader.load(
  './assets/textures/lroc_color_poles_2k.png' // https://svs.gsfc.nasa.gov/4720
);
moonMap.mapping = THREE.EquirectangularReflectionMapping;
moonMap.encoding = THREE.sRGBEncoding;

const displacementMap = textureLoader.load('./assets/textures/ldem_4_uint.png'); // https://svs.gsfc.nasa.gov/4720

/**
 * Base
 */

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

/**
 * Lights
 */

scene.add(new THREE.AmbientLight(0x404040));

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
  bloomComposer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Group
 */
const cameraGroup = new THREE.Group();
scene.add(cameraGroup);

const group = new THREE.Group();
group.rotation.set(0, -2 * Math.PI, 0);
scene.add(group);

/**
 * Camera
 */

// Base camera
const camera = new THREE.PerspectiveCamera(
  40,
  sizes.width / sizes.height,
  1,
  200
);
if (isMobile) {
  camera.position.set(0, 0, 1).setLength(25);
} else {
  camera.position.set(0, 0, 1).setLength(20);
}

cameraGroup.add(camera);

/**
 * Renderer
 */
renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  // alpha: true,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ReinhardToneMapping;

const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,
  0.4,
  0.85
);
bloomPass.exposure = Math.pow(globalUniforms.exposure, 4.0);
bloomPass.threshold = globalUniforms.bloomThreshold;
bloomPass.strength = globalUniforms.bloomStrength;
bloomPass.radius = globalUniforms.bloomRadius;

// const outputPass = new OutputPass();

bloomComposer = new EffectComposer(renderer);
// bloomComposer.renderToScreen = false;
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);
// bloomComposer.addPass(outputPass);

const folder = gui.addFolder('Bloom Parameters');

folder
  .add(globalUniforms, 'exposure', 0.1, 2)
  .onChange(function (value) {
    renderer.toneMappingExposure = Math.pow(value, 4.0);
  })
  .listen();

folder
  .add(globalUniforms, 'bloomThreshold', 0.0, 1.0)
  .onChange(function (value) {
    bloomPass.threshold = Number(value);
  });

folder
  .add(globalUniforms, 'bloomStrength', 0.0, 10.0)
  .onChange(function (value) {
    bloomPass.strength = Number(value);
  });

folder
  .add(globalUniforms, 'bloomRadius', 0.0, 1.0)
  .step(0.01)
  .onChange(function (value) {
    bloomPass.radius = Number(value);
  });

// scene.fog = new THREE.FogExp2(0x000000, 0.0006);

//

/**
 * Objects
 */

/**
 * Globe
 */

const globeGeometry = new THREE.SphereGeometry(globeRadius, 60, 60);
const globeMaterial = new THREE.MeshPhongMaterial({
  map: moonMap,
  bumpMap: displacementMap,
  bumpScale: 0.16,
  displacementMap: displacementMap,
  displacementScale: 0.17,
  sizeAttenuation: true,
  depthTest: false,
  transparent: true,
  // opacity: 0.8,
  blending: THREE.AdditiveBlending,
  // shininess: 0,
});

const earthGlobe = new THREE.Mesh(globeGeometry, globeMaterial);
earthGlobe.position.set(0, 0, 0);
group.add(earthGlobe);

/**
 * Controls
 */

// Controls
const controls = new OrbitControls(camera, canvas);
controls.autoRotate = false;
controls.autoRotateSpeed *= 0.5;

const rotateBtn = document.querySelector('#rotate-globe');
const stopBtn = document.querySelector('#stop-globe');

rotateBtn.addEventListener('click', (event) => {
  rotateBtn.classList.add('hidden');
  stopBtn.classList.remove('hidden');
  controls.autoRotate = true;
});

stopBtn.addEventListener('click', (event) => {
  rotateBtn.classList.remove('hidden');
  stopBtn.classList.add('hidden');
  controls.autoRotate = false;
});

/**
 * Animate
 */
const tick = () => {
  bloomComposer.render();

  renderer.toneMappingExposure = Math.pow(globalUniforms.exposure, 4.0);
  bloomPass.exposure = globalUniforms.exposure;
  bloomPass.threshold = globalUniforms.bloomThreshold;
  bloomPass.strength = globalUniforms.bloomStrength;
  bloomPass.radius = globalUniforms.bloomRadius;

  controls.update();

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
