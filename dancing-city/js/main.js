// https://jsfiddle.net/4q3p6u5v/
// https://threejs.org/docs/#api/en/audio/Audio
// https://threejs.org/examples/webaudio_visualizer

import * as THREE from '../../js/three/build/three.module.js';
// import { ObjectControls } from '../../js/three/ObjectControls.js';
// import { OrbitControls } from '../../js/three/OrbitControls.js';

import utils from './utils.js';
import { interpolateColour, rgba2hex } from './lerp.js';

import { Buildings } from './models/Buildings.js';

import audioVertexShader from './shaders/audio/vertex.js';
import audioFragmentShader from './shaders/audio/fragment.js';

// import * as THREE from './build/three.module.js';

const fftSize = 128;

let scene,
  camera,
  renderer,
  analyser,
  listener = new THREE.AudioListener(),
  sound = new THREE.Audio(listener);

let input = document.getElementById('audioInput');
audioControls = document.getElementById('audioControls');

sound.setMediaElementSource(audioControls);

mapboxgl.accessToken =
  'pk.eyJ1IjoiYWxleGFhYyIsImEiOiJja3o1OGdrcWUwZGN2MnRwa2xsa2pqNTI3In0.RenxXCa3uR7D7-tdvoYKGw';
const apiKey = 'wSVUkjoWKTD8fUSyzJd5';

const center = { lng: -74.01037933751888, lat: 40.70987189850888 };
const longitude = center.lng,
  latitude = center.lat;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v10',
  // style: 'mapbox://styles/mapbox/dark-v10',
  center: [longitude, latitude],
  zoom: 15,
  pitch: 60,
  bearing: 5,
  antialias: true,
});

let id;
const title = document.querySelector('.content--contentWrapper h1');
let color = interpolateColour('#2523e8', '#ffd439', 0.5);

// map.addControl(new mapboxgl.NavigationControl());

/**
 * Debug
 */

const parameters = {
  animate: false,
  // materialColor: '#409ebf',
  materialColor: '#dddddd',
  materialOpacity: 1,
  materialAmbientTerm: 0,
  materialSpecularTerm: 1,
  materialShininess: 2.8,

  lightColor: '#dddddd',
  ambientTerm: 0.3,
  specularTerm: 1,
  lightPosition: {
    x: 0,
    y: 2000,
    z: -20,
  },
  lightDirection: {
    x: -40,
    y: -30,
    z: 15,
  },
  lightCutOff: 0.95,
  // lightDirection: {
  //   x: 1,
  //   y: -0.5,
  //   z: 0.3,
  // },
  wireframe: false,
  lightSource: false,
  fixedLight: false,
  uTime: null,
  date: new Date(),
  initialTime: null,
  // directionalLight: new THREE.DirectionalLight(0xffffff, 0.5),
  spherePosition: -2,
  dxSphere: 0.01,
  frequency: 5,
  elapsedTime: null,
  longitude: longitude,
  latitude: latitude,

  preWave: 200.1,
  hWave: 300,
  postWave: 400.1,
  opacity: 1,

  center: {
    meters: mapboxgl.MercatorCoordinate.fromLngLat([longitude, latitude], 0),
  },
  zoom: map.getZoom(),

  resolution: [window.innerWidth / 2, window.innerHeight / 2],

  colorA: '#2523e8',
  colorB: '#ffd439',

  interpolatedColor: color,
  tAudioData: {},
  tAudioFreq: { value: 0 },
};

// The 'building' layer in the streets vector source contains building-height
// data from OpenStreetMap.

await map.once('load');

initThreeJS();

// Add daytime fog
map.setFog({
  range: [2, 8],
  'horizon-blend': 0.5,
  color: 'white',
  'high-color': '#add8e6',
  'space-color': '#d8f2ff',
  'star-intensity': 0.15,
});

// // Add nighttime fog
// map.setFog({
//   range: [2, 8],
//   'horizon-blend': 0.3,
//   color: '#242B4B',
//   'high-color': '#161B36',
//   'space-color': '#0B1026',
//   'star-intensity': 0.8,
// });

// Insert the layer beneath any symbol layer.
const layers = map.getStyle().layers;
const labelLayerId = layers.find(
  (layer) => layer.type === 'symbol' && layer.layout['text-field']
).id;

if (map.getLayer('building')) {
  map.removeLayer('building');
}

if (map.getSource('composite')) {
  map.addLayer(
    {
      id: '3d-buildings',
      source: 'composite',
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': '#ddd',
        'fill-extrusion-height': ['number', ['get', 'height'], 5],
        'fill-extrusion-base': ['number', ['get', 'min_height'], 0],
        'fill-extrusion-opacity': 0.0,
      },
    },
    labelLayerId
  );
}

map.addLayer(
  new Buildings('buildings', '3d-buildings', 1, parameters),
  '3d-buildings'
);

map.setLayoutProperty('road-label', 'visibility', 'none');

class searchControl {
  onAdd(map) {
    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl';
    const _input = document.createElement('input');
    _input.placeholder = 'Search...';
    this._container.appendChild(_input);
    const geocoder = new maptiler.Geocoder({
      input: _input,
      key: apiKey,
    });
    geocoder.on('select', function (item) {
      map.fitBounds(item.bbox);
    });
    return this._container;
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
}
map.addControl(new searchControl(), 'top-right');

parameters.initialTime = new Date().getTime();
// setInterval(onFrame, parameters.frequency / 1000);

// console.log(map.getStyle().layers);

function animate(timestamp) {
  let pct = Math.abs(Math.sin(parameters.uTime * 0.0008));

  const hexColor = color;
  // const hexColor = `#${rgba2hex(color)}`;
  // title.style.color = hexColor;
  title.style.opacity = 1 - pct / 5;
  if (analyser) {
    analyser.getFrequencyData();

    const tAudio = Math.abs(Math.sin(analyser.getAverageFrequency())) * 0.5; //timestamp === 0 ? 1000 : timestamp;

    parameters.uTime = tAudio;
    parameters.tAudioData.value.needsUpdate = true;
  }

  if (input != null) {
    loadAudio();
  }

  if (analyser) {
    if (analyser.getAverageFrequency() != 0) {
      // console.log(analyser.getAverageFrequency());
    }
  }

  renderer.render(scene, camera);

  id = requestAnimationFrame(animate);
}

const Animation = function (step) {
  let timerID;
  const innerStep = function (timestamp) {
    step(timestamp);
    timerID = requestAnimationFrame(innerStep);
  };
  return {
    start: function () {
      timerID = requestAnimationFrame(innerStep);
    },
    cancel: function () {
      cancelAnimationFrame(timerID);
    },
  };
};

const rotateCamera = new Animation((timestamp) => {
  // clamp the rotation between 0 -360 degrees
  // Divide timestamp by 100 to slow rotation to ~10 degrees / sec
  map.rotateTo((timestamp / 100) % 360, { duration: 0 });
});

const animateBtn = document.querySelector('#animate');
const stopBtn = document.querySelector('#stop-animation');

animateBtn.addEventListener('click', (event) => {
  animateBtn.classList.add('hidden');
  stopBtn.classList.remove('hidden');
  rotateCamera.start();
});

stopBtn.addEventListener('click', (event) => {
  animateBtn.classList.remove('hidden');
  stopBtn.classList.add('hidden');
  rotateCamera.cancel();
});

function initThreeJS() {
  const container = document.getElementById('container');

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.Camera();

  window.addEventListener('resize', onWindowResize);

  // Start the animation.
  animate(0);
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
}

document.querySelector('#list').addEventListener('click', (e) => {
  e.preventDefault();

  const elm = e.target;

  audioControls.removeAttribute('src');
  const source = document.getElementById('audioSource');
  source.src = `./assets/sounds/${elm.getAttribute('data-value')}.mp3`;
  document.querySelector('#song').innerHTML = elm.getAttribute('data-value');

  audioControls.load();
  audioControls.play();
  analyser = new THREE.AudioAnalyser(sound, fftSize);

  const format = renderer.capabilities.isWebGL2
    ? THREE.RedFormat
    : THREE.LuminanceFormat;
  // console.log(analyser.data);
  parameters.tAudioData.value = new THREE.DataTexture(
    analyser.data,
    fftSize / 2,
    1,
    format
  );

  console.log(parameters.tAudioData.value);
});

function loadAudio() {
  input.onchange = function () {
    const reader = new FileReader();
    let file = input.files[0];

    if (file) {
      document.querySelector('#song').innerHTML = input.files[0].name;
      reader.readAsArrayBuffer(file);

      audioControls.src = URL.createObjectURL(file);
      audioControls.play();
    }
  };
}

map.on('click', (e) => {
  console.log(e.lngLat.wrap(), map.getZoom(), map.getFreeCameraOptions());
});
