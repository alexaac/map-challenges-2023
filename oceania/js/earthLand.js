import * as THREE from '../../js/three/build/three.module.js';
import { Line2 } from './libs/Line2.js';
import { LineGeometry } from './libs/LineGeometry.js';
import { LineMaterial } from './libs/LineMaterial.js';

import { tObj } from './object.js';

export class earthLand extends tObj {
  constructor(landJson, lineColor, landTex, normalTex, noFace) {
    let container = new THREE.Object3D();
    super(container);
    this.lineColor = lineColor;
    this.landTex = landTex;
    this.normalTex = normalTex ? normalTex : null;
    this.pointMat = new THREE.SpriteMaterial({ color: this.lineColor });
    // this.lineMat = new LineMaterial({
    this.lineMat = new THREE.LineBasicMaterial({
      color: this.lineColor,
      opacity: 0.8,
      transparent: true,
      linewidth: 50,
    });
    this.meshMat = new THREE.MeshPhongMaterial({
      map: this.landTex,
      normalMap: this.normalTex,
      normalMapType: THREE.ObjectSpaceNormalMap,
      shininess: 4,
      transparent: true,
      opacity: 1,
    });

    let funMap = { point: Point, line: Line, mesh: Mesh };
    landJson.forEach((e) => {
      if (e.geometry) {
        // if (noFace) {
        //   if (e.type !== 'mesh') {
        //     funMap[e.type](e.geometry, this);
        //   }
        // } else {
        funMap[e.type](e.geometry, this);
        // }
      }
    });
  }
}
function Point(e, that) {
  let geo = new THREE.BufferGeometry();

  const vertices = [];
  for (let ind = 0; ind < e.length; ind++) {
    vertices.push(e[0].x, e[0].y, e[0].z);
  }

  geo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(vertices), 3)
  );

  that.mesh.add(new THREE.ParticleSystem(geo, that.pointMat));
}

function Line(e, that) {
  let geo = new THREE.BufferGeometry();

  const vertices = [];
  for (let i = 0; i < e.length; i++) {
    vertices.push(e[i].x, e[i].y, e[i].z);
  }

  geo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(vertices), 3)
  );

  that.mesh.add(new THREE.Line(geo, that.lineMat));

  // let geo = new LineGeometry();

  // const vertices = [];
  // for (let i = 0; i < e.length; i++) {
  //   vertices.push(e[i].x, e[i].y, e[i].z);
  // }

  // geo.setPositions(vertices);

  // const line = new Line2(geo, that.lineMat);
  // line.computeLineDistances();

  // that.mesh.add(line);
}

function Mesh(e, that) {
  let face_geom = new THREE.BufferGeometry();
  face_geom.setIndex(e.face);
  face_geom.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(e.position), 3)
  );
  face_geom.setAttribute(
    'uv',
    new THREE.BufferAttribute(new Float32Array(e.uv), 2)
  );

  that.mesh.add(new THREE.Mesh(face_geom, that.meshMat));
}
