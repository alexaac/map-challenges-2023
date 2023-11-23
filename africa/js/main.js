import * as THREE from '../../js/three/build/three.module.js';
import { OrbitControls } from '../../js/three/OrbitControls.js';

/** Constants */

const GLOBE_RADIUS = 0.2;

const isMobile = window.innerWidth < 703;
const shiftRightPercent = 0; //isMobile ? 0 : 0.4;
const shiftBottomPercent = 0; // isMobile ? 0.5 : 0.1;
const cameraZoom = isMobile ? 1 : 0.5;

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

/**
 * Textures
 */

const textureLoader = new THREE.TextureLoader(loadingManager);

const bumpMap = textureLoader.load(
  './assets/textures/bathymetry_bw_composite_4k.jpg'
);

const diffuseMap = textureLoader.load(
  './assets/textures/color_etopo1_ice_low.jpg'
);

const normalMapWater = textureLoader.load(
  './assets/textures/water_normals.jpg'
);
normalMapWater.wrapS = normalMapWater.wrapT = THREE.RepeatWrapping;
bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
diffuseMap.wrapS = diffuseMap.wrapT = THREE.RepeatWrapping;
diffuseMap.anisotropy = 16;

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

scene.background = backgroundMap;

/**
 * Lights
 */

var light = new THREE.AmbientLight(0x404040, 0.002); // soft white light
scene.add(light);

const dayLight = new THREE.DirectionalLight(0xffffff, 0.5);
dayLight.position.set(0, 0.5, 1).multiplyScalar(30);
dayLight.castShadow = true;
scene.add(dayLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.3);
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  alpha: true,
  antialias: false,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.sortObjects = false; // Render in the order the objects were added to the scene
renderer.setClearColor('#f6f9fc', 0);

/**
 * Camera
 */

// Base camera
const camera = new THREE.PerspectiveCamera(
  45,
  sizes.width / sizes.height,
  0.1,
  100
);

scene.add(camera);

camera.position.set(0, 0, cameraZoom);

/**
 * Objects
 */

const meshGroup = new THREE.Group();
meshGroup.rotation.y += 3.8;
scene.add(meshGroup);

/**
 * Globe
 */

const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 512, 256);
const globeMaterial = new THREE.MeshPhongMaterial({
  color: 0xffffff,
  map: diffuseMap,
  displacementMap: bumpMap,
  displacementScale: 0.01, //0.02,
  shininess: 0.5,
});

if (!isMobile) {
  globeMaterial.bumpMap = bumpMap;
  globeMaterial.bumpScale = 0.1;
}

const earthGlobe = new THREE.Mesh(globeGeometry, globeMaterial);

earthGlobe.castShadow = true;
earthGlobe.receiveShadow = true;
earthGlobe.rotation.y = Math.PI / 6;

meshGroup.add(earthGlobe);

/**
 * Controls
 */

let controls = new OrbitControls(camera, canvas);
// How far you can orbit vertically, upper and lower limits.
// Range is 0 to Math.PI radians.
controls.minPolarAngle = Math.PI / 4; // radians
controls.maxPolarAngle = Math.PI / 2; // radians

// How far you can orbit horizontally, upper and lower limits.
// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
controls.minAzimuthAngle = -Math.PI / 6; // radians
controls.maxAzimuthAngle = Math.PI / 6; // radians

/**
 * Animate
 */

const tick = () => {
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
