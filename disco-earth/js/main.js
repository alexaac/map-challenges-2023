// After https://www.shadertoy.com/view/7lfGzl

import * as THREE from '../../js/three/build/three.module.js';
import { OrbitControls } from '../../js/three/OrbitControls.js';
import * as BufferGeometryUtils from './BufferGeometryUtils.js';

/** Constants */

const GLOBE_RADIUS = 0.2;
const isMobile = window.innerWidth < 703;
const shiftRightPercent = 0; //isMobile ? 0 : 0.4;
const shiftBottomPercent = 0; // isMobile ? 0.5 : 0.1;

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

const texture1 = textureLoader.load(
  '../../assets/textures/color_etopo1_ice_low_flip.jpg'
);

texture1.mapping = THREE.EquirectangularReflectionMapping;
texture1.wrapS = THREE.RepeatWrapping;
texture1.repeat.x = -1;

/**
 * Base
 */

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();
scene.background = texture1;

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
  antialias: true,
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

if (isMobile) {
  camera.position.set(0, 0, 1);
} else {
  camera.position.set(0, 0, 0.7);
}

scene.add(camera);

/**
 * Objects
 */

const meshGroup = new THREE.Group();
meshGroup.rotation.y += 3.8;
scene.add(meshGroup);

function createDiscoBall(idx) {
  // After https://codepen.io/ksenia-k/pen/ZEjJxWQ
  const dummy = new THREE.Object3D();

  const mirrorMaterial = new THREE.MeshBasicMaterial({
    color: 'white',
    envMap: texture1,
    refractionRatio: 0.05,
    premultipliedAlpha: false,
    roughness: 0,
    metalness: 1.0,
  });
  mirrorMaterial.envMap.mapping = THREE.EquirectangularReflectionMapping;

  let geometryOriginal = objects[idx].geometry;
  geometryOriginal.deleteAttribute('normal');
  geometryOriginal.deleteAttribute('uv');
  geometryOriginal = BufferGeometryUtils.mergeVertices(geometryOriginal);
  geometryOriginal.computeVertexNormals();

  const mirrorGeometry = new THREE.PlaneGeometry(
    objects[idx].mirrorSize,
    objects[idx].mirrorSize
  );
  let instancedMirrorMesh = new THREE.InstancedMesh(
    mirrorGeometry,
    mirrorMaterial,
    geometryOriginal.attributes.position.count
  );

  const positions = geometryOriginal.attributes.position.array;
  const normals = geometryOriginal.attributes.normal.array;
  for (let i = 0; i < positions.length; i += 3) {
    dummy.position.set(positions[i], positions[i + 1], positions[i + 2]);
    dummy.lookAt(
      positions[i] + normals[i],
      positions[i + 1] + normals[i + 1],
      positions[i + 2] + normals[i + 2]
    );
    dummy.updateMatrix();
    instancedMirrorMesh.setMatrixAt(i / 3, dummy.matrix);
  }

  const obj = new THREE.Group();
  const innerGeometry = geometryOriginal.clone();
  const ballInnerMaterial = new THREE.MeshBasicMaterial({
    color: 0x222222,
    transparent: true,
    opacity: 0.2,
  });
  const innerMesh = new THREE.Mesh(innerGeometry, ballInnerMaterial);
  obj.add(innerMesh, instancedMirrorMesh);

  return obj;
}

// Black
const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS + 0.005, 64, 32);
const blackMaterial = new THREE.MeshPhongMaterial({
  color: 0x000000,
  opacity: 1,
  transparent: false,
  side: THREE.DoubleSide,
  depthWrite: false,
  shininess: 0,
});

const blackMesh = new THREE.Mesh(globeGeometry, blackMaterial);
meshGroup.add(blackMesh);

// Disco Earth
const objects = [
  {
    geometry: new THREE.SphereGeometry(GLOBE_RADIUS + 0.005, 128, 64),
    mirrorSize: 0.009,
  },
];

const discoMesh = createDiscoBall(0);
meshGroup.add(discoMesh);

/**
 * Controls
 */

let controls = new OrbitControls(camera, canvas);

/**
 * Animate
 */
const tick = () => {
  // Render
  renderer.render(scene, camera);

  scene.rotation.y -= 0.0015;
  meshGroup.rotation.y += 0.004;

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
