import * as THREE from '../../js/three/build/three.module.js';
import { OrbitControls } from '../../js/three/OrbitControls.js';
import * as dat from '../../js/libs/lil-gui.module.min.js';

/** Constants */

const isMobile = window.innerWidth < 703;
const shiftRightPercent = 0; //isMobile ? 0 : 0.4;
const shiftBottomPercent = 0; // isMobile ? 0.5 : 0.1;

const params = {
  color: 0xff3333,
  lightIntensity: 1,
  exposure: 1,
  earthS: 400.953427900472 * 1.2,
  heightScale: 1,
  widthScale: 1,
};

const sections = document.querySelectorAll('.content--fixedPageContent');
gsap.to(sections[0], {
  duration: 3,
  opacity: 1,
  visibility: 'visible',
  ease: 'power2.inOut',
});

/**
 * Debug
 */

const gui = new dat.GUI();

gui.addColor(params, 'color').onChange(function () {
  material.color.set(params.color);
});

gui
  .add(params, 'lightIntensity', 0, 1)
  .name('light intensity')
  .onChange(function () {
    spotLight1.intensity = spotLight2.intensity = params.lightIntensity;
  });

gui.add(params, 'exposure', 0, 1).onChange(function () {
  renderer.toneMappingExposure = params.exposure;
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

/**
 * Textures
 */

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
 * Environment map
 */

/**
 * Base
 */

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

/**
 * Overlay
 */

/**
 * Lights
 */

const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
scene.add(ambientLight);

const spotLight1 = new THREE.SpotLight(0xffffff, params.lightIntensity);
spotLight1.position.set(100, 200, 100);
spotLight1.angle = Math.PI / 6;
scene.add(spotLight1);

const spotLight2 = new THREE.SpotLight(0xffffff, params.lightIntensity);
spotLight2.position.set(-100, -200, -100);
spotLight2.angle = Math.PI / 6;
scene.add(spotLight2);

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
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = params.exposure;
renderer.gammaOutput = true;

/**
 * Camera
 */

// Base camera
const camera = new THREE.PerspectiveCamera(
  45,
  sizes.width / sizes.height,
  0.01,
  1000
);
camera.position.set(0, 0, 0.5);
// camera.lookAt(scene);

scene.add(camera);

/**
 * Group
 */

const mainGroup = new THREE.Group();
mainGroup.position.set(-0.25, -0.12, 0);

scene.add(mainGroup);

/**
 * Objects
 */

const material = new THREE.MeshStandardMaterial({
  color: 0xff3333,
});

/**
 * @description Fetch data
 * @param {string} url - file
 */
const getData = async (url) => {
  const response = fetch(url);

  const data = await (await response).json();

  return data;
};

const millerXY = (lng, lat) => {
  var L = params.earthS,
    W = params.widthScale * L,
    H = (params.heightScale * L) / 2,
    mill = 2.3,
    x = (lng * Math.PI) / 180,
    y = -(lat * Math.PI) / 180;

  y = 1.25 * Math.log(Math.tan(0.25 * Math.PI + 0.4 * y));

  x = W / 2 + (W / (2 * Math.PI)) * x;
  y = H / 2 - (H / (2 * mill)) * y;

  return [x, y];
};

// convert a GeoJSON geometry to webgl vertices
function geometryToVertices(geometry) {
  const vertices = [];

  const verticesFromPolygon = (coordinates, n) => {
    let shape = new THREE.Shape();
    // const start = [coordinates[0][0][0], coordinates[0][0][1]];
    const start = millerXY(coordinates[0][0][0], coordinates[0][0][1]);
    vertices.push(new THREE.Vector3(start[0], start[1], 0));
    shape.moveTo(start[0], start[1]);

    coordinates[0].forEach((point) => {
      // const [x, y] = MercatorCoordinate.fromLngLat([point[0], point[1]]);
      const [x, y] = millerXY(point[0], point[1]);
      if (!isNaN(x) && !isNaN(y)) {
        vertices.push(new THREE.Vector3(x, y, 0));

        shape.lineTo(x, y);
      }
    });
    vertices.push(new THREE.Vector3(start[0], start[1], 0));
    shape.lineTo(start[0], start[1]);

    let geometry = new THREE.ShapeGeometry(shape);

    // let mesh = new THREE.Mesh(geometry, material);
    let mesh = new THREE.Line(geometry, material);
    mesh.scale.set(0.001, 0.001, 0.001);
    mainGroup.add(mesh);

    return vertices;
  };

  if (geometry.type === 'Polygon') {
    return verticesFromPolygon(geometry.coordinates);
  }

  if (geometry.type === 'MultiPolygon') {
    const positions = [];
    geometry.coordinates.forEach((polygon, i) => {
      const vertices = verticesFromPolygon([polygon[0]], i);

      // doing an array.push with too many values can cause
      // stack size errors, so we manually iterate and append
      vertices.forEach((vertex) => {
        positions[positions.length] = vertex;
      });
    });
    return Float32Array.from(positions);
  }

  return new Float32Array();
}

/**
 * Countries
 * */

const countriesGeojson = await getData('data/ne_110m_landc.geojson', 'json');

// Make shapes
countriesGeojson.features.forEach((feature) => {
  geometryToVertices(feature.geometry);
});

/**
 * Model
 */

/**
 * Controls
 */

let controls = new OrbitControls(camera, canvas);
controls.mouseButtons = {
  RIGHT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  LEFT: THREE.MOUSE.PAN,
};
controls.enableRotate = false;

/**
 * Animate
 */

const tick = () => {
  // Update controls
  controls.update();

  // Update materials

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
