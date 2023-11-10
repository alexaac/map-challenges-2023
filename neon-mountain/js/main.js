import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

import * as THREE from '../../js/three/build/three.module.js';
import { OrbitControls } from '../../js/three/OrbitControls.js';

import { EffectComposer } from '../../js/three/EffectComposer.js';
import { RenderPass } from '../../js/three/RenderPass.js';
import { ShaderPass } from '../../js/three/ShaderPass.js';
import { UnrealBloomPass } from '../../js/three/UnrealBloomPass.js';

import * as dat from '../../js/libs/lil-gui.module.min.js';

import { Util } from './libs/Util.js';

/** Constants */

/**
 * @description Fetch data
 * @param {string} url - file
 */
const getData = async (url) => {
  const response = fetch(url);

  const data = await (await response).json();

  return data;
};

const ENTIRE_SCENE = 0,
  BLOOM_SCENE = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);

const isMobile = window.innerWidth < 703;
const shiftRightPercent = isMobile ? 0 : 0.2;
const shiftBottomPercent = isMobile ? 0.2 : 0.1;
const globeRadius = 5.5;

const globalUniforms = {
  exposure: 1,
  bloomStrength: 0.3, //1.5,
  bloomThreshold: 0,
  bloomRadius: 1, //0,
  scene: 'Scene with Glow',
  heartsNo: 10000,
  randomness: 0.11,
  randomnessPower: 3,
  radius: 2,
};

const util = new Util();
const range = (1 - Math.log(util.getRandomInt(2, 256)) / Math.log(256)) * 2 * 4;

const sections = document.querySelectorAll('.content--fixedPageContent');
gsap.to(sections[0], {
  opacity: 1,
  visibility: 'visible',
  ease: 'power2.inOut',
});

/**
 * Debug
 */
const gui = new dat.GUI({ closed: true, title: '', hidden: true });
const parameters = {
  displacementScale: 0,
};
// gui.hide();

gui.add(globalUniforms, 'exposure', 0.1, 2).onChange(function (value) {
  renderer.toneMappingExposure = Math.pow(value, 4.0);
  render();
});

gui.add(globalUniforms, 'bloomThreshold', 0.0, 1.0).onChange(function (value) {
  bloomPass.threshold = Number(value);
  render();
});

gui.add(globalUniforms, 'bloomStrength', 0.0, 10.0).onChange(function (value) {
  bloomPass.strength = Number(value);
  render();
});

gui
  .add(globalUniforms, 'bloomRadius', 0.0, 1.0)
  .step(0.01)
  .onChange(function (value) {
    bloomPass.radius = Number(value);
    render();
  });

// gui
//   .add(globalUniforms, 'heartsNo', 0, 10000, 100)
//   .onChange(function (value) {
//     setupScene(value);
//     render();
//   })
//   .listen();

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

/**
 * Base
 */

// Canvas
const canvas = document.querySelector('canvas.webgl');

const backgroundMap = () => {
  const textureLoader = new THREE.TextureLoader();
  // https://svs.gsfc.nasa.gov/3895
  const stars = './assets/textures/starmap_4k.jpg';

  const backgroundMap = textureLoader.load(stars);
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Group
 */
const cameraGroup = new THREE.Group();
scene.add(cameraGroup);

const group = new THREE.Group();
// group.rotation.set(0, -10, 0);
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
  camera.position.set(0.5, 0.5, 1).setLength(20);
}

cameraGroup.add(camera);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  // alpha: true,
  antialias: false,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

const finalPass = new ShaderPass(
  new THREE.ShaderMaterial({
    uniforms: {
      baseTexture: { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture },
    },
    vertexShader: document.getElementById('vertexshader').textContent,
    fragmentShader: document.getElementById('fragmentshader').textContent,
    defines: {},
  }),
  'baseTexture'
);
finalPass.needsSwap = true;

const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(renderScene);
finalComposer.addPass(finalPass);

//

scene.fog = new THREE.FogExp2(0x000000, 0.0006);

//

/**
 * Objects
 */

const getXyzCordsMulti = (data, xoff, yoff) => {
  const C = [];
  let cTemp = [];
  let lineType = '';
  let elev = 0;
  for (const d of data.features) {
    lineType = d.geometry.type;

    if (lineType == 'MultiLineString') {
      let cord = d.geometry.coordinates.map((c) => {
        let subCord = [];
        for (let cxyz of c) {
          subCord.push([
            (cxyz[0] - xoff) / 1000,
            (cxyz[1] - yoff) / 10,
            cxyz[2] / 100,
          ]);
        }
        return subCord;
      });
      cTemp = _.flatten(cord);
    } else {
      cTemp = d.geometry.coordinates.map((c) => {
        return [(c[0] - xoff) / 1000, (c[1] - yoff) / 10, c[2] / 100];
      });
    } // end if multi linestring
    C.push({ lineType, cord: cTemp });
  }
  return C;
};

// Get the data
const data = await getData('./data/tracks.geojson');
console.log(data);
const bbox = await getData('./data/tracks_bbox.geojson');
console.log(bbox);

const bounds = [
  bbox.features[0].geometry.coordinates[0][0][0],
  bbox.features[0].geometry.coordinates[0][0][1],
  bbox.features[0].geometry.coordinates[0][2][0],
  bbox.features[0].geometry.coordinates[0][2][1],
];

const xoff = bounds[0] + (bounds[2] - bounds[0]) / 2 + 1750; // center of the contours map
const yoff = bounds[1] + (bounds[3] - bounds[1]) / 2 + 30;
console.log(xoff, yoff);
const xyzCordsMulti = getXyzCordsMulti(data, xoff, yoff);
console.log(xyzCordsMulti);

// https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_lines_indexed.html
const geometries = [];
let positions = [],
  indices = [],
  next = 0;

// We can only address up to 256*256 (0xFFFF) indices.
// "Committing" means we store the collected positions and indices
// in a new BufferGeometry. Then we empty out the positions and
// indices array so that we can start to count from 0 again.
const commit = () => {
  if (!indices.length || !positions.length) return;
  const geometry = new THREE.BufferGeometry();

  geometry.setIndex(indices);
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometries.push(geometry);
  indices = [];
  positions = [];
  next = 0;
};

for (let { cord } of xyzCordsMulti) {
  console.log(cord);
  const points = cord;

  //console.assert(points.length > 1, "Contains at least 2 points");
  if (points.length < 2) continue;
  // console.log('aici');
  // If the next array of coordinates would exceed the maximum
  // index length, start a new BufferGeometry.
  if (positions.length + points.length * 3 > 0xffff) commit();
  // console.log('aici2', points.length);

  for (let i = 0; i < points.length; i += 3) {
    const [x, y, z] = [points[i], points[i + 1], points[i + 2]];
    console.log(x, y, z);

    if (i > 0) indices.push(next - 1, next);

    positions.push(x, Math.max(0, z || 0), -y);

    // console.log(positions);
    next++;
  }
}
commit();
console.log(positions);

const elevation_range = [372, 2910];
// d3.extent(
//   data.features.map((d) => {
//     return d.properties.elevation;
//   })
// );

export const colorScaleRed2 = d3
  .scaleQuantize()
  .domain(elevation_range)
  .range(d3.schemeReds[9]);

// const quantize = d3
//   .scaleQuantize()
//   .domain(elevation_range) // pass only the extreme values to a scaleQuantize’s domain
//   .range(colours);

for (const geometry of geometries) {
  console.log(geometry);
  const line = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: colorScaleRed2(geometry.attributes.position.array[1] * 100),
      linewidth: 1,
      opacity: 1.0,
    })
  );

  line.layers.enable(BLOOM_SCENE);

  group.add(line);
}
console.log(group);

/**
 * Controls
 */

// Controls
const controls = new OrbitControls(camera, canvas);
controls.autoRotate = false;
controls.autoRotateSpeed *= 1;

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

animate();

/**
 * Animate
 */
function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  renderer.toneMappingExposure = Math.pow(globalUniforms.exposure, 4.0);
  bloomPass.exposure = globalUniforms.exposure;
  bloomPass.threshold = globalUniforms.bloomThreshold;
  bloomPass.strength = globalUniforms.bloomStrength;
  bloomPass.radius = globalUniforms.bloomRadius;

  controls.update();

  // scene.rotation.y -= 0.0015;

  // render scene with bloom
  renderBloom(true);

  // render the entire scene, then render bloom scene on top
  finalComposer.render();
}

function renderBloom() {
  camera.layers.set(BLOOM_SCENE);
  bloomComposer.render();
  camera.layers.set(ENTIRE_SCENE);
}
