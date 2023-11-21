import * as THREE from '../../js/three/build/three.module.js';
import { OrbitControls } from '../../js/three/OrbitControls.js';
import { EffectComposer } from '../../js/three/EffectComposer.js';
import { RenderPass } from '../../js/three/RenderPass.js';
import { UnrealBloomPass } from '../../js/three/UnrealBloomPass.js';
import * as lil from '../../js/libs/lil-gui.module.min.js';

import atmosphereVertexShader from './shaders/atmosphere/vertex.js';
import atmosphereFragmentShader from './shaders/atmosphere/fragment.js';

/** Constants */

const isMobile = window.innerWidth < 703;
const shiftRightPercent = isMobile ? 0 : 0.5;
const shiftBottomPercent = isMobile ? 0.2 : 0.4;
const globeRadius = 3.5;

let bloomComposer, renderer;

const globalUniforms = {
  exposure: 0.76,
  bloomThreshold: 0.15,
  bloomStrength: 9.88,
  bloomRadius: 0, //0,
  scene: 'Scene with Glow',
  heartsNo: 10000,
  randomness: 0.11,
  randomnessPower: 3,
  radius: 2,
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
const parameters = {
  displacementScale: 0,
};
// gui.hide();

gui.add(globalUniforms, 'exposure', 0.1, 2).onChange(function (value) {
  renderer.toneMappingExposure = Math.pow(value, 4.0);
});

gui.add(globalUniforms, 'bloomThreshold', 0.0, 1.0).onChange(function (value) {
  bloomPass.threshold = Number(value);
});

gui.add(globalUniforms, 'bloomStrength', 0.0, 10.0).onChange(function (value) {
  bloomPass.strength = Number(value);
});

gui
  .add(globalUniforms, 'bloomRadius', 0.0, 1.0)
  .step(0.01)
  .onChange(function (value) {
    bloomPass.radius = Number(value);
  });

gui.close();

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
let globeTex = textureLoader.load('./assets/textures/night_lights_green.png');
let globeTex2 = textureLoader.load(
  './assets/textures/night_lights_green_simple.png'
);
// let globeTex = textureLoader.load('./assets/textures/night_lights_blue.png');
// let globeTex2 = textureLoader.load(
//   './assets/textures/night_lights_blue_simple.png'
// );
globeTex2.wrapS = THREE.RepeatWrapping;
globeTex2.repeat.x = -1;

/**
 * Base
 */

// Canvas
const canvas = document.querySelector('canvas.webgl');

const backgroundMap = () => {
  const textureLoader = new THREE.TextureLoader();

  const backgroundMap = textureLoader.load(globeTex2);
  backgroundMap.mapping = THREE.EquirectangularReflectionMapping;
  backgroundMap.encoding = THREE.sRGBEncoding;

  return backgroundMap;
};

// Scene
const scene = new THREE.Scene();
// scene.background = backgroundMap();

/**
 * Lights
 */

// scene.add(new THREE.AmbientLight(0xcccccc));
var light = new THREE.AmbientLight(0x404040, 3); // soft white light
scene.add(light);

var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
scene.add(directionalLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
hemiLight.color.setHSL(0, 0, 1);
hemiLight.groundColor.setHSL(0, 0, 1);
scene.add(hemiLight);

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
  45,
  sizes.width / sizes.height,
  1,
  2000
);
if (isMobile) {
  camera.position.set(0, 0, 1).setLength(33);
} else {
  camera.position.set(0, -0.5, 1).setLength(35);
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

scene.fog = new THREE.FogExp2(0x000000, 0.0006);

//

/**
 * Objects
 */

/**
 * Globe
 */

const globeGeometry = new THREE.SphereGeometry(globeRadius, 512, 256);
const globeMaterial = new THREE.MeshPhongMaterial({
  map: globeTex,
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  shininess: 0,
});

const earthGlobe = new THREE.Mesh(globeGeometry, globeMaterial);
earthGlobe.position.set(0, 0, 0);
group.add(earthGlobe);

const globeGeometry2 = new THREE.SphereGeometry(globeRadius * 30, 512, 256);
const globeMaterial2 = new THREE.MeshPhongMaterial({
  map: globeTex2,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  shininess: 1,
});

const earthGlobe2 = new THREE.Mesh(globeGeometry2, globeMaterial2);
earthGlobe2.position.set(0, -1, 0);
group.add(earthGlobe2);

// Black
const blackMaterial = new THREE.MeshPhongMaterial({
  color: 0x148fd6,
  opacity: 1,
  transparent: false,
  side: THREE.DoubleSide,
  depthWrite: false,
  shininess: 0,
});

const blackMesh = new THREE.Mesh(globeGeometry.clone(), blackMaterial);
blackMesh.scale.x = blackMesh.scale.y = blackMesh.scale.z = 0.9;

// group.add(blackMesh);

// Clouds

const cloudsMaterial = new THREE.MeshPhongMaterial({
  // color: 0x148fd6,
  opacity: 0.2,
  transparent: true,
  map: textureLoader.load('../../assets/textures/earthcloudmap.jpg'),
  side: THREE.DoubleSide,
  depthWrite: false,
  shininess: 1,
});

const cloudMesh = new THREE.Mesh(globeGeometry.clone(), cloudsMaterial);
cloudMesh.scale.x = cloudMesh.scale.y = cloudMesh.scale.z = 1.01;

cloudMesh.rotation.y = -(1 / 6) * Math.PI;

// group.add(cloudMesh);

/**
 * Atmosphere
 */
const customMaterial = new THREE.ShaderMaterial({
  uniforms: { glowColor: { type: 'c', value: new THREE.Color(0x348da1) } },
  vertexShader: atmosphereVertexShader,
  fragmentShader: atmosphereFragmentShader,
  side: THREE.BackSide,
  depthWrite: true,
  blending: THREE.AdditiveBlending,
  transparent: true,
  opacity: 0.1,
});

const earthGlow = new THREE.Mesh(globeGeometry.clone(), customMaterial);
if (isMobile) {
  earthGlow.scale.x = earthGlow.scale.y = earthGlow.scale.z = 1.01;
} else {
  earthGlow.scale.x = earthGlow.scale.y = earthGlow.scale.z = 1.05;
}
// earthGlow.rotation.y -= 1.55;

group.add(earthGlow);

/**
 * Controls
 */

// Controls
const controls = new OrbitControls(camera, canvas);
controls.autoRotate = true;
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
  earthGlobe.rotation.y += 0.005;

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
