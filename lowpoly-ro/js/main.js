import * as THREE from '../../js/three/build/three.module.js';
import { OrbitControls } from '../../js/three/OrbitControls.js';
import { GLTFLoader } from '../../js/three/GLTFLoader.js';
import { RGBELoader } from '../../js/three/RGBELoader.js';

import * as dat from '../../js/libs/lil-gui.module.min.js';

import { mergeGeometries } from '../../js/three/BufferGeometryUtils.js';

/** Constants */

const MAX_HEIGHT = 7;
const STONE_HEIGHT = 1.09;
const DIRT_HEIGHT = 0.648;
const GRASS_HEIGHT = 0.288;
const SAND_HEIGHT = 0.02;
const DIRT2_HEIGHT = 0;

const isMobile = window.innerWidth < 703;
const shiftRightPercent = 0; //isMobile ? 0 : 0.4;
const shiftBottomPercent = 0; // isMobile ? 0.5 : 0.1;
const cameraZoom = isMobile ? 100 : 60;

/**
 * Debug
 */

const gui = new dat.GUI();
gui.hide();

/**
 * Loaders
 */

// GLTF loader
const gltfLoader = new GLTFLoader();
// gltfLoader.setDRACOLoader(dracoLoader);

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

let textures = {
  dirt: await textureLoader.loadAsync('./assets/textures/dirt.png'),
  dirt2: await textureLoader.loadAsync('./assets/textures/dirt2.jpg'),
  grass: await textureLoader.loadAsync('./assets/textures/grass.jpg'),
  sand: await textureLoader.loadAsync('./assets/textures/sand.jpg'),
  water: await textureLoader.loadAsync('./assets/textures/water.jpg'),
  stone: await textureLoader.loadAsync('./assets/textures/stone.png'),
};

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth + shiftRightPercent * window.innerWidth,
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
 * Base
 */

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color('#FFEECC');

/**
 * Lights
 */

const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
scene.add(ambientLight);

const spotLight1 = new THREE.SpotLight(0xffffff, 1);
spotLight1.position.set(100, 200, 100);
spotLight1.angle = Math.PI / 6;
scene.add(spotLight1);

const spotLight2 = new THREE.SpotLight(0xffffff, 1);
spotLight2.position.set(-100, -200, -100);
spotLight2.angle = Math.PI / 6;
scene.add(spotLight2);

const light = new THREE.PointLight(
  new THREE.Color('#FFCB8E').convertSRGBToLinear().convertSRGBToLinear(),
  80,
  200
);
light.position.set(10, 20, 10);

light.castShadow = true;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 500;
scene.add(light);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/**
 * Environment map
 */

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

const getCubeMapTexture = (path, format) => {
  // no envmap
  if (!path) return Promise.resolve({ envMap: null, cubeMap: null });

  if (format === '.hdr') {
    return new Promise((resolve, reject) => {
      new RGBELoader().load(
        path,
        (texture) => {
          const envmap = pmremGenerator.fromEquirectangular(texture).texture;
          pmremGenerator.dispose();

          resolve(envmap);
        },
        undefined,
        reject
      );
    });
  }
};

const path2 = './assets/environments/envmap.hdr';

getCubeMapTexture(path2, '.hdr').then((envmap) => {
  envmap.encoding = THREE.sRGBEncoding;

  /**
   * Objects
   */

  /**
   * Materials
   */

  function hexMesh(geo, map) {
    let mat = new THREE.MeshPhysicalMaterial({
      envMap: envmap,
      envMapIntensity: 0.135,
      flatShading: true,
      map,
    });
    let mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function hexGeometry(height, x, y) {
    // console.log(x, y, height);
    let geo = new THREE.CylinderGeometry(0.6, 0.6, height, 6, 1, false);
    geo.translate(x, height / 2, y);
    return geo;
  }

  function makeHex(height, x, y) {
    const position = { x, y };

    let geo = hexGeometry(height * 3, x, y);

    let material;

    if (height > STONE_HEIGHT) {
      material = textures.stone;
      // stoneGeo = mergeGeometries([geo, stoneGeo]);

      // if (Math.random() > 0.8) {
      //   stoneGeo = mergeGeometries([stoneGeo, stone(height, position)]);
      // }
    } else if (height > DIRT_HEIGHT) {
      material = textures.dirt;

      // dirtGeo = mergeGeometries([geo, dirtGeo]);
      // if (Math.random() > 0.8) {
      //   grassGeo = mergeGeometries([grassGeo, tree(height, position)]);
      // }
    } else if (height > GRASS_HEIGHT) {
      material = textures.grass;

      // grassGeo = mergeGeometries([geo, grassGeo]);
    } else if (height > SAND_HEIGHT) {
      material = textures.sand;

      // sandGeo = mergeGeometries([geo, sandGeo]);

      // if (Math.random() > 0.8 && stoneGeo) {
      //   stoneGeo = mergeGeometries([stoneGeo, stone(height, position)]);
      // }
    } else if (height > DIRT2_HEIGHT) {
      material = textures.dirt2;

      // dirt2Geo = mergeGeometries([geo, dirt2Geo]);
    }

    let mat = new THREE.MeshPhysicalMaterial({
      envMap: envmap,
      envMapIntensity: 0.135,
      flatShading: true,
      map: material,
    });
    mat.format = THREE.RGBAFormat;

    let mesh = new THREE.Mesh(geo, mat);
    // mesh.position.set(x, y, 0);

    return mesh;
  }

  function stone(height, position) {
    const px = Math.random() * 0.4;
    const pz = Math.random() * 0.4;

    const geo = new THREE.SphereGeometry(Math.random() * 0.3 + 0.1, 7, 7);
    geo.translate(position.x + px, height, position.y + pz);
    return geo;
  }

  function tree(height, position) {
    const treeHeight = Math.random() * 1 + 1.25;

    const geo = new THREE.CylinderGeometry(0, 1.5, treeHeight, 3);
    geo.translate(position.x, height + treeHeight * 0 + 1, position.y);

    const geo2 = new THREE.CylinderGeometry(0, 1.15, treeHeight, 3);
    geo2.translate(position.x, height + treeHeight * 0.6 + 1, position.y);

    const geo3 = new THREE.CylinderGeometry(0, 0.8, treeHeight, 3);
    geo3.translate(position.x, height + treeHeight * 1.25 + 1, position.y);

    return mergeGeometries([geo, geo2, geo3]);
  }

  function clouds() {
    let geo = new THREE.SphereGeometry(0, 0, 0);
    let count = Math.floor(Math.pow(Math.random(), 0.45) * 4);

    for (let i = 0; i < count; i++) {
      const puff1 = new THREE.SphereGeometry(1, 7, 7);
      const puff2 = new THREE.SphereGeometry(1.2, 7, 7);
      const puff3 = new THREE.SphereGeometry(0.8, 7, 7);

      puff1.translate(-1.55, Math.random() * 0.3, 0);
      puff2.translate(0, Math.random() * 0.3, 0);
      puff3.translate(1.55, Math.random() * 0.3, 0);

      const cloudGeo = mergeGeometries([puff1, puff2, puff3]);
      cloudGeo.translate(
        Math.random() * 30 - 10,
        Math.random() * 10 + 7,
        Math.random() * 30 - 10
      );
      cloudGeo.rotateY(Math.random() * Math.PI * 2);

      geo = mergeGeometries([geo, cloudGeo]);
    }

    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        envMap: envmap,
        envMapIntensity: 0.75,
        flatShading: true,
        transparent: true,
        opacity: 0.85,
      })
    );

    mainGroup.add(mesh);
  }

  let seaMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 30, MAX_HEIGHT * 0.2, 40),
    new THREE.MeshPhysicalMaterial({
      envMap: envmap,
      color: new THREE.Color('#55aaff').convertSRGBToLinear().multiplyScalar(3),
      ior: 1.4,
      transmission: 1,
      transparent: true,
      thickness: 1.5,
      envMapIntensity: 0.2,
      roughness: 1,
      metalness: 0.025,
      roughnessMap: textures.water,
      metalnessMap: textures.water,
    })
  );
  seaMesh.receiveShadow = true;
  seaMesh.position.set(0, MAX_HEIGHT * 0.06, 0);
  mainGroup.add(seaMesh);

  let mapContainer = new THREE.Mesh(
    new THREE.CylinderGeometry(30.3, 30.3, MAX_HEIGHT * 0.25, 40, 1, true),
    new THREE.MeshPhysicalMaterial({
      envMap: envmap,
      map: textures.dirt,
      envMapIntensity: 0.2,
      side: THREE.DoubleSide,
    })
  );
  mapContainer.receiveShadow = true;
  mapContainer.position.set(0, MAX_HEIGHT * 0.125, 0);
  mainGroup.add(mapContainer);

  let mapFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(31.5, 31.5, MAX_HEIGHT * 0.1, 40),
    new THREE.MeshPhysicalMaterial({
      envMap: envmap,
      map: textures.dirt2,
      envMapIntensity: 0.1,
      side: THREE.DoubleSide,
    })
  );
  mapFloor.receiveShadow = true;
  mapFloor.position.set(0, MAX_HEIGHT * 0.05, 0);
  mainGroup.add(mapFloor);
  clouds();

  let stoneGeo = new THREE.BoxGeometry(0, 0, 0);
  let dirtGeo = new THREE.BoxGeometry(0, 0, 0);
  let dirt2Geo = new THREE.BoxGeometry(0, 0, 0);
  let sandGeo = new THREE.BoxGeometry(0, 0, 0);
  let grassGeo = new THREE.BoxGeometry(0, 0, 0);

  let stoneMesh = hexMesh(stoneGeo, textures.stone);
  let dirtMesh = hexMesh(dirtGeo, textures.dirt);
  let dirt2Mesh = hexMesh(dirt2Geo, textures.dirt2);
  let grassMesh = hexMesh(grassGeo, textures.grass);
  let sandMesh = hexMesh(sandGeo, textures.sand);
  scene.add(stoneMesh, dirtMesh, dirt2Mesh, grassMesh, sandMesh);
  /**
   * Model
   */
  gltfLoader.load('./assets/models/rohex12000.gltf', (gltf) => {
    const hexGroup = new THREE.Group();

    gltf.scene.children[0].traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const model = child.clone();
        // console.log(model);
        const mesh2 = makeHex(
          // parseFloat(model.userData.properties[12].replaceAll(',', '.')) *
          //   0.001,

          // parseFloat(model.userData.properties[10].replaceAll(',', '.')) *
          //   0.00008,

          // -parseFloat(model.userData.properties[11].replaceAll(',', '.')) *
          //   0.00008

          parseFloat(model.userData.properties[10].replaceAll(',', '.')) *
            0.001,

          parseFloat(model.userData.properties[8].replaceAll(',', '.')) *
            0.00008,

          -parseFloat(model.userData.properties[9].replaceAll(',', '.')) *
            0.00008
        );
        hexGroup.add(mesh2);
        hexGroup.position.set(-29, 1, 24);
      }
    });

    mainGroup.add(hexGroup);
  });
});

/**
 * Camera
 */

// Base camera
const camera = new THREE.PerspectiveCamera(
  45,
  sizes.width / sizes.height,
  0.1,
  1000
);
camera.position.set(0, 30, cameraZoom);
camera.rotation.set(0, Math.PI, 0);

const mainGroup = new THREE.Group();
mainGroup.position.set(0, 5, 0);
mainGroup.rotation.set(0, Math.PI / 8, 0);
scene.add(mainGroup);

camera.lookAt(scene);
scene.add(camera);

/**
 * Controls
 */

let controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.damagingFactor = 0.05;
controls.enableDamping = true;

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

/**
 * Animate
 */

const tick = () => {
  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // scene.rotation.y -= 0.0015;

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
