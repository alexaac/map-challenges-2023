//            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
//                    Version 2, December 2004
//
// Copyright (C) 2004 Sam Hocevar <sam@hocevar.net>
//
// Everyone is permitted to copy and distribute verbatim or modified
// copies of this license document, and changing it is allowed as long
// as the name is changed.
//
//            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
//   TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION
//
//  0. You just DO WHAT THE FUCK YOU WANT TO.

import * as THREE from '../../../js/three/build/three.module.js';

export class Map3DGeometry extends THREE.BufferGeometry {
  constructor(data, innerRadius) {
    super();

    this.data = data;
    this.innerRadius = innerRadius;

    this.vertices = [];
    this.faces = [];

    this.compute();
  }

  compute() {
    if (
      arguments.length < 2 ||
      isNaN(parseFloat(this.innerRadius)) ||
      !isFinite(this.innerRadius) ||
      this.innerRadius < 0
    ) {
      // if no valid inner radius is given, do not extrude
      this.innerRadius = 42;
    }

    // this.data.vertices = [lat, lon, ...]
    // this.data.polygons = [[poly indices, hole i-s, ...], ...]
    // this.data.triangles = [tri i-s, ...]
    var i,
      uvs = [];
    for (i = 0; i < this.data.vertices.length; i += 2) {
      var lon = this.data.vertices[i];
      var lat = this.data.vertices[i + 1];
      // colatitude
      var phi = +(90 - lat) * 0.01745329252;
      // azimuthal angle
      var the = +(180 - lon) * 0.01745329252;
      // translate into XYZ coordinates
      var wx = Math.sin(the) * Math.sin(phi) * -1;
      var wz = Math.cos(the) * Math.sin(phi);
      var wy = Math.cos(phi);
      // equirectangular projection
      var wu = 0.25 + lon / 360.0;
      var wv = 0.5 + lat / 180.0;

      this.vertices.push(new THREE.Vector3(wx, wy, wz));

      uvs.push(new THREE.Vector2(wu, wv));
    }

    var n = this.vertices.length;

    if (this.innerRadius <= 1) {
      for (i = 0; i < n; i++) {
        var v = this.vertices[i];
        this.vertices.push(v.clone().multiplyScalar(this.innerRadius));
      }
    }

    let face_geom = new THREE.BufferGeometry();

    face_geom.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(this.data.triangles), 3)
    );
    face_geom.setAttribute(
      'uv',
      new THREE.BufferAttribute(new Float32Array(uvs), 3)
    );

    this.faces.push(face_geom);

    // for (i = 0; i < this.data.triangles.length; i += 3) {
    //   var a = this.data.triangles[i];
    //   var b = this.data.triangles[i + 1];
    //   var c = this.data.triangles[i + 2];

    //  this.faces.push(
    //     new THREE.Face3(a, b, c, [
    //       this.vertices[a],
    //       this.vertices[b],
    //       this.vertices[c],
    //     ])
    //   );
    //   this.faceVertexUvs[0].push([uvs[a], uvs[b], uvs[c]]);

    //   if (0 < this.innerRadius && this.innerRadius <= 1) {
    //     this.faces.push(
    //       new THREE.Face3(n + b, n + a, n + c, [
    //         this.vertices[b].clone().multiplyScalar(-1),
    //         this.vertices[a].clone().multiplyScalar(-1),
    //         this.vertices[c].clone().multiplyScalar(-1),
    //       ])
    //     );
    //     this.faceVertexUvs[0].push([uvs[b], uvs[a], uvs[c]]); // shitty uvs to make 3js exporter happy
    //   }
    // }

    // extrude
    // if (this.innerRadius < 1) {
    //   for (i = 0; i < this.data.polygons.length; i++) {
    //     var polyWithHoles = this.data.polygons[i];
    //     for (var j = 0; j < polyWithHoles.length; j++) {
    //       var polygonOrHole = polyWithHoles[j];
    //       for (var k = 0; k < polygonOrHole.length; k++) {
    //         var a = polygonOrHole[k],
    //           b = polygonOrHole[(k + 1) % polygonOrHole.length];
    //         var va1 = this.vertices[a],
    //           vb1 = this.vertices[b];
    //         var va2 = this.vertices[n + a],
    //           vb2 = this.vertices[n + b];
    //         var normal;
    //         if (j < 1) {
    //           // polygon
    //           normal = vb1
    //             .clone()
    //             .sub(va1)
    //             .cross(va2.clone().sub(va1))
    //             .normalize();
    //           this.faces.push(
    //             new THREE.Face3(a, b, n + a, [normal, normal, normal])
    //           );
    //           this.faceVertexUvs[0].push([uvs[a], uvs[b], uvs[a]]); // shitty uvs to make 3js exporter happy
    //           if (this.innerRadius > 0) {
    //             this.faces.push(
    //               new THREE.Face3(b, n + b, n + a, [normal, normal, normal])
    //             );
    //             this.faceVertexUvs[0].push([uvs[b], uvs[b], uvs[a]]); // shitty uvs to make 3js exporter happy
    //           }
    //         } else {
    //           // hole
    //           normal = va2
    //             .clone()
    //             .sub(va1)
    //             .cross(vb1.clone().sub(va1))
    //             .normalize();
    //           this.faces.push(
    //             new THREE.Face3(b, a, n + a, [normal, normal, normal])
    //           );
    //           this.faceVertexUvs[0].push([uvs[b], uvs[a], uvs[a]]); // shitty uvs to make 3js exporter happy
    //           if (this.innerRadius > 0) {
    //             this.faces.push(
    //               new THREE.Face3(b, n + a, n + b, [normal, normal, normal])
    //             );
    //             this.faceVertexUvs[0].push([uvs[b], uvs[a], uvs[b]]); // shitty uvs to make 3js exporter happy
    //           }
    //         }
    //       }
    //     }
    //   }
    // }

    this.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);
  }
}
