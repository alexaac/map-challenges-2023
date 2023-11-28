import * as THREE from '../../js/three/build/three.module.js';
import { OrbitControls } from '../../js/three/OrbitControls.js';
import * as dat from '../../js/libs/lil-gui.module.min.js';

/**
 * Loaders
 */
const textureLoader = new THREE.TextureLoader();

/**
 * Textures
 */
const tex1 = textureLoader.load('./assets/textures/blue1s.png');
const tex2 = textureLoader.load('./assets/textures/blue2s.png');
const tex3 = textureLoader.load('./assets/textures/blue3s.png');
const tex4 = textureLoader.load('./assets/textures/blue4s.png');
const tex5 = textureLoader.load('./assets/textures/blue5s.png');

/**
 * Debug
 */
const gui = new dat.GUI({ closed: true });

gui.hide();

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

/**
 * Objects
 */

// 1
const planeGeometry = new THREE.PlaneBufferGeometry(3, 4.24, 64, 64);
const materials = [
  new THREE.MeshBasicMaterial({ map: tex1 }),
  new THREE.MeshBasicMaterial({ map: tex2 }),
  new THREE.MeshBasicMaterial({ map: tex3 }),
  new THREE.MeshBasicMaterial({ map: tex4 }),
  new THREE.MeshBasicMaterial({ map: tex5 }),
];

const group = new THREE.Group();
scene.add(group);

const planesCount = 5;
let radius = 2;

let lastX = radius,
  lastY = radius;

for (let i = 0; i < planesCount; i++) {
  const mesh = new THREE.Mesh(planeGeometry, materials[i]);
  mesh.material.side = THREE.DoubleSide;

  mesh.position.x = lastX;
  mesh.position.z = lastY;

  // angle = ((2 * Math.PI) / planesCount) * (i + 1);
  // const radius = 2;
  // const x = Math.cos(angle) * radius;
  // const z = Math.sin(angle) * radius;

  // mesh.position.set(x, 0, z);

  const temp = lastX;
  lastX = lastY;
  lastY = -temp;

  mesh.lookAt(mesh.position.clone().setLength(radius));
  mesh.updateMatrix();

  group.add(mesh);
}

/**
 * Lights
 */

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

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
camera.position.set(0, 0, 0);

scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.target.copy(group.position);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  alpha: true,
});
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const rotateBtn = document.querySelector('#rotate-globe');
const stopBtn = document.querySelector('#stop-globe');
let yRotate = true;

rotateBtn.addEventListener('click', (event) => {
  rotateBtn.classList.add('hidden');
  stopBtn.classList.remove('hidden');
  yRotate = true;
});

stopBtn.addEventListener('click', (event) => {
  rotateBtn.classList.remove('hidden');
  stopBtn.classList.add('hidden');
  yRotate = false;
});

const tick = () => {
  // Render
  renderer.render(scene, camera);

  if (yRotate) {
    group.rotation.y += 0.005;
  }

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
