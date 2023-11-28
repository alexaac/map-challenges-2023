import * as THREE from '../../js/three/build/three.module.js';
import { OrbitControls } from '../../js/three/OrbitControls.js';

import { getData, formatData } from './helpers.js';

/** Constants */
const isMobile = window.innerWidth < 703;
const shiftRightPercent = 0; // isMobile ? 0 : 0.4;
const shiftBottomPercent = 0; //isMobile ? 0.5 : 0.1;
// const cameraZoom = isMobile ? 35 : 18;
const globeRadius = 0.5;

const sections = document.querySelectorAll('.content--fixedPageContent');
gsap.to(sections[0], {
  opacity: 1,
  visibility: 'visible',
  ease: 'power2.inOut',
});

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
const dotTexture = textureLoader.load('../assets/textures/plane64teal.png');
const noiseTexture = textureLoader.load('../assets/textures/clouds.png');

const bumpMap = textureLoader.load(
  '../assets/textures/earthbump1k.jpg' // http://planetpixelemporium.com/earth.html
);
bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

const diffuseMap = textureLoader.load('../assets/textures/earthmap1k.jpg');
diffuseMap.wrapS = diffuseMap.wrapT = THREE.RepeatWrapping;
diffuseMap.anisotropy = 16;

const specularMap = textureLoader.load('../assets/textures/earthspec1k.jpg');

const stars = textureLoader.load('../assets/textures/starmap_4k.jpg');
stars.mapping = THREE.EquirectangularReflectionMapping;
stars.encoding = THREE.sRGBEncoding;

const clouds = textureLoader.load('../assets/textures/earthcloudmap.jpg');
const cloudsAlpha = textureLoader.load(
  '../assets/textures/earthcloudmaptrans.jpg'
);

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

let spotLight = new THREE.SpotLight(0xffffff, 1, 0, 10, 2);

spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.heigth = 1024;
spotLight.shadow.camera.fov = 30;
spotLight.shadow.camera.near = 1;
spotLight.shadow.camera.far = 6;

spotLight.position.set(8, 2, 0);
scene.add(spotLight);

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

/**
 * Camera
 */

// Base camera
let aspect = window.innerWidth / window.innerHeight;
let camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1500);

camera.position.set(1, 1, 1.5);

scene.add(camera);

/**
 * Objects
 */

const meshGroup = new THREE.Group();
scene.add(meshGroup);

// Galaxy
let galaxyGeometry = new THREE.SphereGeometry(1000, 32, 32);
let galaxyMaterial = new THREE.MeshBasicMaterial({
  side: THREE.BackSide,
  map: stars,
});

let galaxy = new THREE.Mesh(galaxyGeometry, galaxyMaterial);
scene.add(galaxy);

/**
 * Globe
 */
const globeGeometry = new THREE.IcosahedronGeometry(globeRadius, 32, 32);
const globeMaterial = new THREE.MeshPhongMaterial({
  map: diffuseMap,
  bumpMap: bumpMap,
  bumpScale: 0.05,
  specularMap: specularMap,
  specular: new THREE.Color('grey'),
  shininess: 10,
});

const earthSurface = new THREE.Mesh(globeGeometry, globeMaterial);

earthSurface.receiveShadow = true;
earthSurface.castShadow = true;

meshGroup.add(earthSurface);

// Clouds
const cloudMaterial = new THREE.MeshPhongMaterial({
  map: clouds,
  alphaMap: cloudsAlpha,
  transparent: true,
  opacity: 0.8,
});

const earthClouds = new THREE.Mesh(globeGeometry.clone(), cloudMaterial);
earthClouds.scale.x = earthClouds.scale.y = earthClouds.scale.z = 1.003;
earthClouds.rotation.y = 11;
meshGroup.add(earthClouds);

// Glow
let glowMaterial = new THREE.ShaderMaterial({
  uniforms: {
    c: {
      type: 'f',
      value: 0.7,
    },
    p: {
      type: 'f',
      value: 7,
    },
    glowColor: {
      type: 'c',
      value: new THREE.Color(0x93cfef),
    },
    viewVector: {
      type: 'v3',
      value: camera.position,
    },
  },
  vertexShader: `
    uniform vec3 viewVector;
    uniform float c;
    uniform float p;
    varying float intensity;
    void main() {
      vec3 vNormal = normalize( normalMatrix * normal );
      vec3 vNormel = normalize( normalMatrix * viewVector );
      intensity = pow( c - dot(vNormal, vNormel), p );
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: `
    uniform vec3 glowColor;
    varying float intensity;
    void main() 
    {
      vec3 glow = glowColor * intensity;
      gl_FragColor = vec4( glow, 1.0 );
    }`,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  opacity: 0.8,
  transparent: true,
});

const earthGlow = new THREE.Mesh(globeGeometry.clone(), glowMaterial);
earthGlow.scale.x = earthGlow.scale.y = earthGlow.scale.z = 1.05;
meshGroup.add(earthGlow);

/**
 * Airports
 * */

// Get the data
const data = await getData('data/airports-extended.dat');
let airports = formatData(data);

// Particles

function calcPosFromLatLonRad(lat, lon, radius) {
  var phi = (90 - lat) * (Math.PI / 180);
  var theta = (lon + 180) * (Math.PI / 180);

  let x = -(radius * Math.sin(phi) * Math.cos(theta));
  let z = radius * Math.sin(phi) * Math.sin(theta);
  let y = radius * Math.cos(phi);

  return [x, y, z];
}

let globalUniforms = {
  uTime: { value: 0 },
  uDotTexture: { value: dotTexture },
  uNoiseTexture: { value: noiseTexture },
  uSize: { value: 0.005 * renderer.getPixelRatio() },
};
const markerCount = airports.length;
let markerInfo = []; // information on markers

let gMarker = new THREE.PlaneGeometry(0.003, 0.003);

// Material
const mMarker = new THREE.MeshBasicMaterial({
  color: 0xff3232,
  onBeforeCompile: (shader) => {
    shader.uniforms.uTime = globalUniforms.uTime;
    shader.uniforms.uDotTexture = globalUniforms.uDotTexture;
    shader.uniforms.uNoiseTexture = globalUniforms.uNoiseTexture;
    shader.depthWrite = false;
    shader.blending = THREE.AdditiveBlending;
    shader.vertexShader = `
      attribute float phase;
      varying float vPhase;
      ${shader.vertexShader}
      `.replace(
      `#include <begin_vertex>`,
      `#include <begin_vertex>
        vPhase = phase; // de-synch of ripples
      `
    );

    shader.fragmentShader = `
      uniform float uTime;
      uniform sampler2D uDotTexture;
      uniform sampler2D uNoiseTexture;

      varying float vPhase;

      ${shader.fragmentShader}
      `.replace(
      `vec4 diffuseColor = vec4( diffuse, opacity );`,
      `
        vec2 lUv = vUv;
        // vec2 lUv = (vUv - 0.8) * 2.;

        float val = 0.;
        float lenUv = length(lUv);
        // val = max(val, 1. - step(0.25, lenUv)); // central circle
        // val = max(val, step(0.4, lenUv) - step(0.5, lenUv)); // outer circle

        float tShift = fract(uTime * 0.2 + 2.0*vPhase);
        val = max(val, step(0.4 + (tShift * 0.6), lenUv) - step(0.5 + (tShift * 0.5), lenUv)); // ripple

        
        vec4 textureColor = texture2D(uDotTexture, lUv);
        vec4 noiseColor = texture2D(uNoiseTexture, vec2(lUv.x + uTime, lUv.y));
        float noiseAlpha = pow(noiseColor.r, 3.0);
        vec4 finalColor = vec4(textureColor.rgb, (textureColor.a * 1.0 * 1.0) * 1.0);
        
        vec4 diffuseColor = vec4( finalColor.rgb, opacity );
        if (val > 0.5) {
          diffuseColor =  vec4(1.,1.,1., 0.05);
          
        } 
        `
    );
  },
});

mMarker.defines = { USE_UV: ' ' }; // needed to be set to be able to work with UVs

let markers = new THREE.InstancedMesh(gMarker, mMarker, markerCount);

let airportPoint = new THREE.Object3D();
let phase = [];
for (let i = 0; i < markerCount; i++) {
  let pos = calcPosFromLatLonRad(
    airports[i].geometry.coordinates[0],
    airports[i].geometry.coordinates[1],
    globeRadius
  );

  airportPoint.position.set(pos[0], pos[1], pos[2]);
  airportPoint.lookAt(airportPoint.position.clone().setLength(globeRadius + 1));
  airportPoint.updateMatrix();
  markers.setMatrixAt(i, airportPoint.matrix);
  phase.push(Math.random());

  let airportInfo = airports[i].properties;
  airportInfo.crd = airportPoint.position.clone();
  markerInfo.push(airportInfo);
}

gMarker.setAttribute(
  'phase',
  new THREE.InstancedBufferAttribute(new Float32Array(phase), 1)
);

meshGroup.add(markers);

/**
 * Controls
 */

let controls = new OrbitControls(camera, canvas);

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
let cameraRotation = 0;
let cameraRotationSpeed = 0.001;
let cameraAutoRotation = false;

const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  earthSurface.rotation.y += (1 / 32) * 0.05;
  markers.rotation.y += (1 / 32) * 0.05;
  earthClouds.rotation.y += (1 / 16) * 0.05;

  if (cameraAutoRotation) {
    cameraRotation += cameraRotationSpeed;
    camera.position.y = 0;
    camera.position.x = 2 * Math.sin(cameraRotation);
    camera.position.z = 2 * Math.cos(cameraRotation);
    camera.lookAt(earthSurface.position);
  }

  globalUniforms.uTime.value = elapsedTime;
  controls.update();

  // Render
  renderer.render(scene, camera);

  // scene.rotation.y -= 0.0015;

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
