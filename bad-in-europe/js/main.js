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
const tex = textureLoader.load('./assets/textures/wordcloud.png');

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

const globalUniforms = {
  u_texture: { value: tex },
};

// 1
const geometry = new THREE.PlaneBufferGeometry(3, 3, 64, 64);

const material = new THREE.ShaderMaterial({
  uniforms: globalUniforms,
  vertexShader: `
    // Define the uv we want to pass to our fragment shader
    varying vec2 vUv;
    
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: `
    // Read our uv and textures
    uniform sampler2D u_texture;
    varying vec2 vUv;
    
    void main(){
      // Mix our pixels together based on fade value
      gl_FragColor = texture2D( u_texture, vUv );
    }
    
  `,
});

// Mesh
const plane = new THREE.Mesh(geometry, material);
plane.material.side = THREE.DoubleSide;
scene.add(plane);

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
camera.position.x = 0;
camera.position.y = 0;
camera.position.z = 2;

scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);

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

const tick = () => {
  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
