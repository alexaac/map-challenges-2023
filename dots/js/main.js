import * as THREE from '../../js/three/build/three.module.js';
import { OrbitControls } from '../../js/three/OrbitControls.js';
import * as dat from '../../js/libs/lil-gui.module.min.js';
import { geoInterpolate } from 'https://cdn.skypack.dev/d3-geo@3';

import splineVertexShader from './shaders/spline/vertex.js';
import splineFragmentShader from './shaders/spline/fragment.js';

/**
 * Constants
 */

const CURVE_SEGMENTS = 44;
const DEFAULT_TUBE_RADIUS = 0.0055;
const TUBE_RADIUS_SEGMENTS = 8;
const GLOBE_RADIUS = 5;
const DEGREE_TO_RADIAN = Math.PI / 180;
const CURVE_MIN_ALTITUDE = 2;
const CURVE_MAX_ALTITUDE = 2.5;

const dotColor = new THREE.Color(0xffffff);
const markerColor = new THREE.Color(0xaa90f3);

const splineUniforms = {
  uTime: { value: 0 },
  color: { value: new THREE.Color(0xffffff) },
  opacity: { value: 0.3 },
};

let drawCount;
let flow = [];
let globRadius = 5;
let path, points;

const sections = document.querySelectorAll('.content--fixedPageContent');
gsap.to(sections[0], {
  opacity: 1,
  visibility: 'visible',
  ease: 'power2.inOut',
});

/**
 * Loaders
 */
const textureLoader = new THREE.TextureLoader();

/**
 * Textures
 */

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
 * Lights
 */

var light = new THREE.AmbientLight(0x404040, 3); // soft white light
scene.add(light);

var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
scene.add(directionalLight);

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

let camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 1, 2000);
camera.position.set(0.5, 1.0, 0.5).setLength(18);

scene.add(camera);

// Controls
let controls = new OrbitControls(camera, canvas);
controls.enablePan = false;
controls.minDistance = 6;
controls.maxDistance = 16;
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed *= 0.25;

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
 * Renderer
 */

let renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true,
});
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor('#f6f9fc');

let globalUniforms = {
  time: { value: 0 },
};

let imgTexture;

textureLoader.load('./assets/map_fill_1000x500.jpg', (texture) => {
  // read texture data
  imgTexture = texture;
  const canvas = document.createElement('canvas');
  canvas.width = texture.image.width;
  canvas.height = texture.image.height;

  const context = canvas.getContext('2d');
  context.drawImage(texture.image, 0, 0);

  draw();
});

/**
 * Objects
 */

const draw = () => {
  // <GLOBE>
  // https://web.archive.org/web/20120107030109/http://cgafaq.info/wiki/Evenly_distributed_points_on_sphere#Spirals
  let counter = 100000;

  let spherical = new THREE.Spherical();
  let pts = [];
  let clr = [];
  let c = new THREE.Color();
  let uvs = [];

  for (let i = 0; i < counter; i++) {
    c.setHSL(0.669, 1, 0.76);
    c.toArray(clr, i * 3);
  }

  for (let i = counter; i > 0; i--) {
    const phi = Math.acos(-1 + (2 * i) / counter);
    const theta = Math.sqrt(counter * Math.PI) * phi;

    const vector = new THREE.Vector3();
    vector.setFromSphericalCoords(5, phi, theta);
    pts.push(vector);

    spherical.setFromVector3(vector);
    const uvx = (spherical.theta + Math.PI) / (Math.PI * 2);
    const uvy = 1.0 - spherical.phi / Math.PI;

    uvs.push(uvx, uvy);
  }

  let globeGeometry = new THREE.BufferGeometry().setFromPoints(pts);
  globeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(clr, 3));
  globeGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  let globeMaterial = new THREE.PointsMaterial({
    color: dotColor,
    size: 0.075,
    vertexColors: true,
    onBeforeCompile: (shader) => {
      shader.uniforms.globeTexture = {
        value: imgTexture,
      };
      shader.vertexShader = `
        uniform sampler2D globeTexture;
        varying float vVisibility;
        varying vec3 vNormal;
        varying vec3 vMvPosition;
        ${shader.vertexShader}
      `.replace(
        `gl_PointSize = size;`,
        `
          vVisibility = texture(globeTexture, uv).g ; // get value from texture
          gl_PointSize = size * (vVisibility < 0.5 ? 1. : 0.0); // size depends on the value
          vNormal = normalMatrix * normalize(position);
          vMvPosition = -mvPosition.xyz;
          gl_PointSize *= 0.4 + (dot(normalize(vMvPosition), vNormal) * 0.6); // size depends position in camera space
        `
      );
      shader.fragmentShader = `
        varying float vVisibility;
        varying vec3 vNormal;
        varying vec3 vMvPosition;
        ${shader.fragmentShader}
      `.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `
          bool circ = length(gl_PointCoord - 0.5) > 0.5; // make points round
          bool vis = dot(vMvPosition, vNormal) < 0.; // visible only on the front side of the sphere
          if (circ ) discard;
          
          vec3 col = diffuse ; // make oceans brighter
          
          vec4 diffuseColor = vec4( col, opacity );
        `
      );
    },
  });
  let globe = new THREE.Points(globeGeometry, globeMaterial);
  globe.rotation.y += 3;

  function coordinateToPosition(lat, lng, radius) {
    const phi = (90 - lat) * DEGREE_TO_RADIAN;
    const theta = (lng + 180) * DEGREE_TO_RADIAN;

    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function getSplineFromCoords(coords) {
    const startLat = coords[0];
    const startLng = coords[1];
    const endLat = coords[2];
    const endLng = coords[3];

    // spline vertices
    const start = coordinateToPosition(startLat, startLng, GLOBE_RADIUS);
    const end = coordinateToPosition(endLat, endLng, GLOBE_RADIUS);
    const altitude = clamp(
      start.distanceTo(end) * 0.75,
      CURVE_MIN_ALTITUDE,
      CURVE_MAX_ALTITUDE
    );
    const interpolate = geoInterpolate([startLng, startLat], [endLng, endLat]);
    const midCoord1 = interpolate(0.25);
    const midCoord2 = interpolate(0.75);
    const mid1 = coordinateToPosition(
      midCoord1[1],
      midCoord1[0],
      GLOBE_RADIUS + altitude
    );
    const mid2 = coordinateToPosition(
      midCoord2[1],
      midCoord2[0],
      GLOBE_RADIUS + altitude
    );

    return {
      start,
      end,
      spline: new THREE.CubicBezierCurve3(start, mid1, mid2, end),
    };
  }
  // https://medium.com/@xiaoyangzhao/drawing-curves-on-webgl-globe-using-three-js-and-d3-draft-7e782ffd7ab
  function getCurve(p1, p2) {
    let v1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
    let v2 = new THREE.Vector3(p2[0], p2[1], p2[2]);

    let points = [];
    for (let i = 0; i <= 50; i++) {
      let p = new THREE.Vector3().lerpVectors(v1, v2, i / 50);
      p.normalize();
      p.multiplyScalar(5.2 + 1 * Math.sin((Math.PI * i) / 50));
      points.push(p);
    }

    path = new THREE.CatmullRomCurve3(points, false);

    const tubeGeometry = new THREE.TubeBufferGeometry(
      path,
      CURVE_SEGMENTS,
      DEFAULT_TUBE_RADIUS,
      TUBE_RADIUS_SEGMENTS,
      false
    );

    const meshMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const mesh = new THREE.Mesh(tubeGeometry, meshMaterial);
    group.add(mesh);
  }

  const splineMaterial = new THREE.ShaderMaterial({
    splineUniforms,
    vertexShader: splineVertexShader,
    fragmentShader: splineFragmentShader,
    wireframe: true,
  });

  function TubeAnim(coords) {
    // Particles

    const markerCount = 2;
    let markerInfo = []; // information on markers
    let gMarker = new THREE.PlaneGeometry();
    let mMarker = new THREE.MeshBasicMaterial({
      color: markerColor,
      onBeforeCompile: (shader) => {
        shader.uniforms.time = globalUniforms.time;
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
    uniform float time;
    varying float vPhase;
    ${shader.fragmentShader}
  `.replace(
          `vec4 diffuseColor = vec4( diffuse, opacity );`,
          `
    vec2 lUv = (vUv - 0.5) * 2.;
    float val = 0.;
    float lenUv = length(lUv);
    val = max(val, 1. - step(0.25, lenUv)); // central circle
    val = max(val, step(0.4, lenUv) - step(0.5, lenUv)); // outer circle
    
    float tShift = fract(time * 0.5 + vPhase);
    val = max(val, step(0.4 + (tShift * 0.6), lenUv) - step(0.5 + (tShift * 0.5), lenUv)); // ripple
    
    if (val < 0.5) discard;
    
    vec4 diffuseColor = vec4( diffuse, opacity );`
        );
      },
    });
    mMarker.defines = { USE_UV: ' ' }; // needed to be set to be able to work with UVs
    let markers = new THREE.InstancedMesh(gMarker, mMarker, markerCount);

    let dummy = new THREE.Object3D();

    let points = [
      { lat: coords[0], long: coords[1] },
      { lat: coords[2], long: coords[3] },
    ];

    let phase = [];
    for (let i = 0; i < markerCount; i++) {
      let pos = calcPosFromLatLonRad(points[i].lat, points[i].long, globRadius);

      dummy.position.set(pos[0], pos[1], pos[2]);

      dummy.lookAt(dummy.position.clone().setLength(globRadius + 1));
      dummy.updateMatrix();

      markers.setMatrixAt(i, dummy.matrix);

      phase.push(Math.random());

      markerInfo.push({
        id: i + 1,
        mag: THREE.MathUtils.randInt(1, 10),
        crd: dummy.position.clone(),
      });
    }
    gMarker.setAttribute(
      'phase',
      new THREE.InstancedBufferAttribute(new Float32Array(phase), 1)
    );

    const { spline } = getSplineFromCoords(coords);

    const splineGeometry = new THREE.TubeBufferGeometry(
      spline,
      CURVE_SEGMENTS,
      DEFAULT_TUBE_RADIUS,
      TUBE_RADIUS_SEGMENTS,
      false
    );
    splineGeometry.computeBoundingBox();

    const count = splineGeometry.attributes.position.count;
    const customColor = new THREE.Float32BufferAttribute(count * 3, 3);
    splineGeometry.setAttribute('customColor', customColor);

    const color = new THREE.Color(0xffffff);

    for (let i = 0, l = customColor.count; i < l; i++) {
      color.setHSL(i / l, 1.0, 0.7);
      color.toArray(customColor.array, i * customColor.itemSize);
    }

    // Material
    splineMaterial.uniforms.bboxMin = splineGeometry.boundingBox.min;
    splineMaterial.uniforms.bboxMax = splineGeometry.boundingBox.max;

    const meshMaterial = new THREE.ShaderMaterial({
      uniforms: {
        bboxMin: {
          value: splineGeometry.boundingBox.min,
        },
        bboxMax: {
          value: splineGeometry.boundingBox.max,
        },
        time: { value: 0 },
      },
      vertexShader: splineVertexShader,
      fragmentShader: splineFragmentShader,
      // wireframe: true,
      // transparent: true,
    });

    const splines = new THREE.Mesh(splineGeometry, meshMaterial);
    group.add(splines);
    group.add(markers);

    let startTime = 0;

    const drawDirectedAnimatedLine = ({ reverse }) => {
      const drawAnimatedLine = () => {
        let drawRangeCount = splineGeometry.drawRange.count;
        const timeElapsed = performance.now() - startTime;

        // Animate the curve for 2.5 seconds
        const progress = timeElapsed / 5000;

        // Arcs are made up of roughly 3000 vertices
        drawRangeCount = (reverse ? 1 - progress : progress) * 3000;

        if (progress < 0.999) {
          // Update the draw range to reveal the curve
          splineGeometry.setDrawRange(0, drawRangeCount);
          requestAnimationFrame(drawAnimatedLine);
        } else {
          if (reverse === false) {
            startTime = performance.now();

            splineGeometry.setDrawRange(0, 3000);
            drawDirectedAnimatedLine({ reverse: true });
          } else {
            setTimeout(function () {
              group.remove(markers);
              group.remove(splines);
            }, 1000);
          }
        }
      };

      return drawAnimatedLine();
    };

    drawCount = 2;
    splineGeometry.setDrawRange(0, drawCount);
    drawDirectedAnimatedLine({ reverse: false });
  }

  const globeGeometry2 = new THREE.IcosahedronGeometry(globRadius, 14);
  const globeMaterial2 = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
  });
  const blackGlobe = new THREE.Mesh(globeGeometry2, globeMaterial2);
  blackGlobe.scale.setScalar(0.98);
  globe.add(blackGlobe);

  var geometry = new THREE.SphereGeometry(globRadius, 132, 132);
  var material = new THREE.MeshPhongMaterial({});
  var earthGlobe = new THREE.Mesh(geometry, material);
  earthGlobe.scale.setScalar(0.999);
  scene.add(earthGlobe);
  scene.add(globe);

  const group = new THREE.Group();
  scene.add(group);

  const App = {
    init: function () {
      this.fps = 15;
      this.then = Date.now();
      this.interval = 5000 / this.fps;

      App.draw();
    },

    draw: function () {
      let randomInterval = parseInt((Math.random() * 5000) % 5000) + 4000;
      App.interval = randomInterval / App.fps;

      generatePointsRandomly(2);

      App.now = Date.now();
      App.delta = App.now - App.then;
      App.animationId = window.requestAnimationFrame(App.draw);

      if (App.delta > App.interval) {
        for (var i = App.flow.length - 1; i >= 0; i--) {
          if (App.flow[i + 1]) {
            TubeAnim([
              App.flow[i].pointA.position.x,
              App.flow[i].pointA.position.y,
              App.flow[i].pointB.position.x,
              App.flow[i].pointB.position.y,
            ]);
          }
        }

        App.then = App.now - (App.delta % App.interval);
      }
    },
  };

  const generatePointsRandomly = (n) => {
    flow = [];

    let rad = 180;

    for (var i = 0; i < n; i++) {
      const x1 = Math.floor(Math.random() * rad);
      const y1 = Math.floor(Math.random() * rad);
      const x2 = Math.floor(Math.random() * rad);
      const y2 = Math.floor(Math.random() * rad);

      let type;

      var randomType = parseInt((Math.random() * 3) % 3);
      if (randomType == 0) type = 'infection';
      else if (randomType == 1) type = 'attack';
      else type = 'spam';

      flow.push({
        pointA: {
          position: {
            x: x1,
            y: y1,
            z: 2,
          },
        },
        pointB: {
          position: {
            x: x2,
            y: y2,
            z: 2,
          },
        },
        type: type,
      });
    }

    App.flow = flow;
    points = flow;
  };

  window.onload = function (e) {
    App.init();
  };

  const geometry1 = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const material1 = new THREE.MeshNormalMaterial();
  const boxMesh = new THREE.Mesh(geometry1, material1);
  scene.add(boxMesh);
};

let clock = new THREE.Clock();
const duration = 5;
let time = 0;

const tick = () => {
  // Render

  time += clock.getDelta();
  const t = Math.min(time / duration, 1);
  if (t === 1) time = 0;

  const elapsedTime = clock.getElapsedTime();

  // Update material
  splineUniforms.uTime.value = elapsedTime;
  splineUniforms.color.value.offsetHSL(0.0005, 0, 0);
  globalUniforms.time.value = t;
  scene.rotation.y -= 0.0015;

  controls.update();

  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();

function calcPosFromLatLonRad(lat, lon, radius) {
  var phi = (90 - lat) * (Math.PI / 180);
  var theta = (lon + 180) * (Math.PI / 180);

  let x = -(radius * Math.sin(phi) * Math.cos(theta));
  let z = radius * Math.sin(phi) * Math.sin(theta);
  let y = radius * Math.cos(phi);

  return [x, y, z];
}

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}
