import * as THREE from '../../../js/three/build/three.module.js';
import { GLTFLoader } from '../../../js/three/GLTFLoader.js';
import { OrbitControls } from '../../../js/three/OrbitControls.js';
import { Constants } from '../constants.js';

export class Antenna {
  type = 'custom';
  renderingMode = '3d';

  constructor(id, api, mapConfig, parameters) {
    this.id = id;
    this.api = api;
    this.mapConfig = mapConfig;
    this.parameters = parameters;
    this.coordinates = [parameters.longitude, parameters.latitude];
    this.scaleFactor = this.mapConfig.truck.scaleFactor;
    this.keys = this.parameters.keys;
    this.keys2 = this.parameters.keys2;

    this.animateParams = { velocity: 0.0, speed: 0.0, ds: 0.01 };
  }

  getTruck() {
    // console.log(this.truck);
    return this.truck;
  }

  onAdd(map, gl) {
    this.options = {
      type: this.mapConfig.truck.type, //model type
      obj: this.mapConfig.truck.model + '.' + this.mapConfig.truck.type,
      units: 'meters', // in meters
      scale: this.mapConfig.truck.scale, //x3 times is real size for this model
      rotation: this.mapConfig.truck.rotation, //default rotation
      anchor: 'top',
    };

    this.updateOrigin(this.coordinates);

    this.camera = new THREE.Camera();
    this.map = map;
    this.scene = this.makeScene();

    // Controls
    this.controls = new OrbitControls(this.camera, map.getCanvas());
    this.controls.enableDamping = true;

    // console.log(this.controls);

    // use the Mapbox GL JS map canvas for three.js
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });

    this.renderer.autoClear = false;
  }

  updateOrigin(coordinates) {
    const modelOrigin = { lng: coordinates[0], lat: coordinates[1] };
    const modelAltitude = coordinates[2] || 0 + 50;

    let rad = 0,
      yAxis = new THREE.Vector3(0, 1, 0);

    if (this.keys2 && this.truck) {
      // console.log(this.keys2.deg);
      const deg = this.keys2.deg;
      rad = toRad(deg);
      rad *= this.keys.d ? 1 : -1;
      this.truck.quaternion.setFromAxisAngle(yAxis, rad);
    }

    var modelRotate = [
      this.mapConfig.truck.startRotation.x,
      this.mapConfig.truck.startRotation.y,
      this.mapConfig.truck.startRotation.z,
    ];

    var modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
      modelOrigin,
      modelAltitude
    );

    // transformation parameters to position, rotate and scale the 3D model onto the map
    this.modelTransform = {
      translateX: modelAsMercatorCoordinate.x,
      translateY: modelAsMercatorCoordinate.y,
      translateZ: modelAsMercatorCoordinate.z,
      rotateX: modelRotate[0],
      rotateY: modelRotate[1],
      rotateZ: modelRotate[2],
      /* Since our 3D model is in real world meters, a scale transform needs to be
       * applied since the CustomLayerInterface expects units in MercatorCoordinates.
       */
      scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits(),
    };
  }

  makeScene() {
    const scene = new THREE.Scene();
    const skyColor = 0xb1e1ff; // light blue
    const groundColor = 0xb97a20; // brownish orange

    scene.add(new THREE.AmbientLight(0xffffff, 1));
    scene.add(new THREE.HemisphereLight(skyColor, groundColor, 0.25));

    this.parameters.directionalLight.position
      .set(
        this.parameters.lightDirection.x,
        this.parameters.lightDirection.y,
        this.parameters.lightDirection.z
      )
      .normalize();

    // Directional lights implicitly point at (0, 0, 0).
    scene.add(this.parameters.directionalLight);

    // use the three.js GLTF loader to add the 3D model to the three.js scene
    var loader = new GLTFLoader();

    let that = this;

    loader.load(this.options.obj, function (gltf) {
      const truck = gltf.scene;

      console.log(truck);
      truck.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      scene.add(truck);

      // const truckMesh = gltf.scene.children.find(
      //   (child) => child.name === 'Sketchfab_model'
      // );

      // console.log(truckMesh);
      // scene.add(truckMesh);
      truck.addEventListener(
        'ObjectChanged',
        (e) => this.onObjectChanged(e),
        false
      );

      that.truck = truck;

      that.init();
    });

    return scene;
  }

  init() {
    // this.keys = {
    //   a: false,
    //   s: false,
    //   d: false,
    //   w: false,
    // };

    // document.body.addEventListener('keydown', (e) => {
    //   const key = e.code.replace('Key', '').toLowerCase();
    //   if (this.keys[key] !== undefined) this.keys[key] = true;
    // });

    // document.body.addEventListener('keyup', (e) => {
    //   const key = e.code.replace('Key', '').toLowerCase();

    //   if (this.keys[key] !== undefined) this.keys[key] = false;
    // });

    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    let { velocity, speed, ds } = this.animateParams;

    if (!(this.keys.w || this.keys.s)) {
      if (velocity > 0) {
        speed = -this.api.inertia * ds;
      } else if (velocity < 0) {
        speed = this.api.inertia * ds;
      }
      if (velocity > -0.0008 && velocity < 0.0008) {
        speed = velocity = 0.0;
        return;
      }
    }

    if (this.keys.w) speed = -this.api.acceleration * ds;
    else if (this.keys.s) speed = this.api.acceleration * ds;

    velocity += (speed - velocity) * this.api.acceleration * ds;
    if (speed == 0.0) {
      velocity = 0;
      return;
    }

    const worldTranslate = new THREE.Vector3(0, -velocity, 0);
    this.truck.translateX(worldTranslate.x);
    this.truck.translateZ(worldTranslate.y);
    this.truck.translateY(worldTranslate.z);
    // console.log(this.truck.position);

    let c = this.projectToWorld(this.coordinates);
    this.position = c;

    let p = this.unprojectFromWorld(this.position);
    // console.log('worldTranslate', worldTranslate);
    // console.log('position ', this.truck.position);
    // console.log('p ', p);
    this.coordinates = p;

    this.updateOrigin(this.coordinates);

    // return;
    let options = {
      center: this.coordinates,
      bearing: this.map.getBearing(),
      easing: this.easing,
    };

    let deg = 1;
    let rad = toRad(deg);
    let yAxis = new THREE.Vector3(0, 1, 0);

    if (this.keys.a || this.keys.d) {
      rad *= this.keys.d ? 1 : -1;
      this.truck.quaternion.setFromAxisAngle(
        yAxis,
        this.truck.rotation.y + rad
      );

      options.bearing = -toDeg(this.truck.rotation.y);
    }

    this.animateParams = { velocity, speed, ds };

    const center = { lon: this.coordinates[0], lat: this.coordinates[1] };
    // console.log(center);
    this.map.setCenter(center);
    this.map.jumpTo({
      center: center,
      // bearing: options.bearing,
    });

    // this.map.jumpTo(options);
    this.map.triggerRepaint();
  }

  onObjectChanged(e) {
    // console.log('----------------------');
    // console.log(e);
    let model = e.detail.object; //here's the object already modified
    if (this.api.buildings) {
      let c = model.coordinates;
      let point = this.map.project(c);
      let features = this.map.queryRenderedFeatures(point, {
        layers: [this.mapConfig.names.compositeLayer],
      });
      if (features.length > 0) {
        this.light(features[0]); // crash!
      }
    }
  }

  projectToWorld(coords) {
    // Spherical mercator forward projection, re-scaling to WORLD_SIZE

    var projected = [
      -Constants.MERCATOR_A *
        Constants.DEG2RAD *
        coords[0] *
        Constants.PROJECTION_WORLD_SIZE,
      -Constants.MERCATOR_A *
        Math.log(
          Math.tan(Math.PI * 0.25 + 0.5 * Constants.DEG2RAD * coords[1])
        ) *
        Constants.PROJECTION_WORLD_SIZE,
    ];

    //z dimension, defaulting to 0 if not provided

    if (!coords[2]) projected.push(0);
    else {
      var pixelsPerMeter = this.projectedUnitsPerMeter(coords[1]);
      projected.push(coords[2] * pixelsPerMeter);
    }

    var result = new THREE.Vector3(projected[0], projected[1], projected[2]);

    return result;
  }

  //world units to lnglat
  unprojectFromWorld(worldUnits) {
    // console.log('worldUnits ', worldUnits);

    var unprojected = [
      -worldUnits.x /
        (Constants.MERCATOR_A *
          Constants.DEG2RAD *
          Constants.PROJECTION_WORLD_SIZE),
      (2 *
        (Math.atan(
          Math.exp(
            worldUnits.y /
              (Constants.PROJECTION_WORLD_SIZE * -Constants.MERCATOR_A)
          )
        ) -
          Math.PI / 4)) /
        Constants.DEG2RAD,
    ];
    // console.log('unprojected ', unprojected);

    var pixelsPerMeter = this.projectedUnitsPerMeter(unprojected[1]);

    //z dimension
    var height = worldUnits.z || 0;
    unprojected.push(height / pixelsPerMeter);

    return unprojected;
  }

  projectedUnitsPerMeter(latitude) {
    return Math.abs(
      Constants.WORLD_SIZE /
        Math.cos(Constants.DEG2RAD * latitude) /
        Constants.EARTH_CIRCUMFERENCE
    );
  }

  render(gl, matrix) {
    if (this.parameters.moving === true) {
      // console.log('moving');

      this.keys = this.parameters.keys;
      this.keys2 = this.parameters.keys2;
      // console.log('Keys: ', this.keys);

      this.updateOrigin([
        this.parameters.longitude,
        this.parameters.latitude,
        this.parameters.altitude,
      ]);
    }

    var rotationX = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(1, 0, 0),
      this.modelTransform.rotateX
    );
    var rotationY = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(0, 1, 0),
      this.modelTransform.rotateY
    );
    var rotationZ = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(0, 0, 1),
      this.modelTransform.rotateZ
    );

    var m = new THREE.Matrix4().fromArray(matrix);
    var l = new THREE.Matrix4()
      .makeTranslation(
        this.modelTransform.translateX,
        this.modelTransform.translateY,
        this.modelTransform.translateZ
      )
      .scale(
        new THREE.Vector3(
          this.modelTransform.scale * this.scaleFactor,
          -this.modelTransform.scale * this.scaleFactor,
          this.modelTransform.scale * this.scaleFactor
        )
      )
      .multiply(rotationX)
      .multiply(rotationY)
      .multiply(rotationZ);

    this.camera.projectionMatrix = m.multiply(l);
    this.renderer.state.reset();
    this.renderer.render(this.scene, this.camera);
    this.map.triggerRepaint();
  }
}

function toDeg(rad) {
  return (rad / Math.PI) * 180;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
