const d2r = Math.PI / 180,
  r2d = 180 / Math.PI,
  mercatorScale = 1.7;

const convert = (name, content, options) => {
  var results = {};

  // content.bbox - 4 numbers
  // content.features - []
  // c.f.geometry.type - "Polygon" or "MultiPolygon"
  // c.f.geometry.coordinates - [[[74.92,37.24],... or [[[[-68.64,-54.79]...
  var features = content.features;
  for (var i = 0; i < features.length; i++) {
    var name = 'feature ' + i;
    if (features[i].properties && features[i].properties.name) {
      name = features[i].properties.name;
    }

    var geometry = features[i].geometry;
    if (geometry == null) {
      console.warn('no geometry for ' + name + ', skipping...');
      continue;
    }

    var groupOfPolysWithHoles = null;
    switch (geometry.type) {
      case 'Polygon':
        groupOfPolysWithHoles = [geometry.coordinates];
        break;
      case 'MultiPolygon':
        groupOfPolysWithHoles = geometry.coordinates;
        break;
    }

    if (!groupOfPolysWithHoles) {
      console.warn(
        'Unsupported geometry type (' +
          geometry.type +
          ') for ' +
          name +
          ', skipping...'
      );
      continue;
    }

    if (groupOfPolysWithHoles.length < 1) {
      console.warn('empty geometry for ' + name + ', skipping...');
      continue;
    }

    var result = { vertices: [], polygons: [], triangles: [] };
    results[name] = result;

    var retries = 13;
    for (var j = 0; j < groupOfPolysWithHoles.length; j++) {
      try {
        var polyWithHoles = groupOfPolysWithHoles[j].map(preparePoints);

        var poly = polyWithHoles[0];
        if (poly.length > 2) {
          var triangulator = new poly2tri.SweepContext(poly, {
            cloneArrays: true,
          });
          polyWithHoles.slice(1).forEach(function (hole) {
            if (hole.length > 2) triangulator.addHole(hole);
          });
          triangulator.addPoints(generateSteinerPointsFor(poly, options));
          triangulator.triangulate();

          var triangles = triangulator.getTriangles() || [];

          var k, m;
          // dump all vertices x and y together
          for (k = 0; k < polyWithHoles.length; k++) {
            var polyOrHole = polyWithHoles[k];
            for (m = 0; m < polyOrHole.length; m++) {
              result.vertices.push(polyOrHole[m].x, polyOrHole[m].y);
            }
          }

          // function to find the vertex
          var findVertexIndex = function (p) {
            var vs = result.vertices;
            for (var k = 0; k < vs.length; k += 2) {
              if (Math.abs(vs[k] - p.x) + Math.abs(vs[k + 1] - p.y) < 1e-2) {
                return k / 2;
              }
            }
            return -1;
          };

          // map polyWithHoles
          var polys = [];
          for (k = 0; k < polyWithHoles.length; k++) {
            polys[k] = polyWithHoles[k].map(findVertexIndex);
          }

          result.polygons.push(polys);

          // also map triangles
          var tris = result.triangles;
          for (k = 0; k < triangles.length; k++) {
            var t = triangles[k];
            for (m = 0; m < 3; m++) {
              var vertex = t.GetPoint(m);
              var index = findVertexIndex(vertex);
              if (index > -1) {
                tris.push(index);
              } else {
                // need to add this vertex
                tris.push(result.vertices.length / 2);
                result.vertices.push(vertex.x, vertex.y);
              }
            }
          }
        } else {
          console.warn('zero area feature in ' + name + ', skipping...');
        }
      } catch (e) {
        if (retries-- > 0) {
          // triangulation could fail because random()-based hack in preparePoints() did not work - try again, if so
          j--;
        } else {
          console.error('failed to triangulate ' + name, i, j, e.toString());
          retries = 13;
        }
      }
    }

    // undo mercator, round off
    for (var j = 0; j < result.vertices.length; j += 2) {
      result.vertices[j + 1] =
        (2 *
          Math.atan(Math.exp((result.vertices[j + 1] * d2r) / mercatorScale)) -
          Math.PI / 2) *
        r2d;

      result.vertices[j] = Math.round(result.vertices[j] * 100) / 100;
      result.vertices[j + 1] = Math.round(result.vertices[j + 1] * 100) / 100;
    }
  }

  return results;
};

function preparePoints(points) {
  var i,
    pts = [];
  for (i = 0; i < points.length; i++) {
    var p = points[i];
    // equirectangular to scaled mercator
    pts[i] = [
      p[0],
      Math.log(Math.tan(Math.PI / 4 + (d2r * p[1]) / 2)) * r2d * mercatorScale,
    ];
  }

  var done;
  do {
    done = true;
    // remove duplicates
    for (i = 0; i < pts.length; i++) {
      var p = pts[i];
      var q = pts[(i + 1) % pts.length];
      if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) < 1e-5) {
        pts.splice(i, 1);
        i = Math.max(-1, i - 2);
        done = false;
      }
    }
    // remove collinear edges
    for (i = 0; i < pts.length; i++) {
      var o = pts[(i - 1 + pts.length) % pts.length];
      var p = pts[i];
      var q = pts[(i + 1) % pts.length];
      var a = { x: o[0] - p[0], y: o[1] - p[1] };
      var b = { x: q[0] - p[0], y: q[1] - p[1] };
      if (
        Math.abs(
          (a.x * b.x + a.y * b.y) /
            Math.sqrt((a.x * a.x + a.y * a.y) * (b.x * b.x + b.y * b.y))
        ) >
        1 - 1e-5
      ) {
        // debug output for wolfram alpha
        //console.log ("plot {{" + o + "},{" + p + "},{" + q + "}}");
        pts.splice(i, 1);
        i = Math.max(-1, i - 2);
        done = false;
      }
    }
  } while (!done);

  // now some edges might be too long
  // undo this by adding points to it
  for (i = 0; i < pts.length; ) {
    var p = pts[i];
    var q = pts[(i + 1) % pts.length];
    var dx = q[0] - p[0];
    var dy = q[1] - p[1];
    var d = Math.sqrt(dx * dx + dy * dy);
    var n = Math.ceil(d / 7); // one point every ~7°
    for (var j = 1; j < n; j++) {
      // we add orthogonal vector at every 2nd point to create non-collinear edges
      var xj = p[0] + (dx * j) / n - dy * (j % 2) * 1e-6;
      var yj = p[1] + (dy * j) / n + dx * (j % 2) * 1e-6;
      pts.splice(i + j, 0, [xj, yj]);
    }
    i += n;
  }

  // there can stll be zero-area triangles between poly and hole
  // this attempts to reduce the probability of such a situation
  for (i = 0; i < pts.length; i++) {
    pts[i][0] += 1e-10 * Math.random();
    pts[i][1] += 1e-10 * Math.random();
  }

  return pts.map(function (pt) {
    return new poly2tri.Point(pt[0], pt[1]);
  });
}

function generateSteinerPointsFor(poly, options) {
  var pts = [];
  if (poly.length < 1) return pts;

  // to improve running times, pass only points in bounding box
  // if this will ever cause bugs, switch to full test from http://board.flashkit.com/board/showpost.php?p=4037392&postcount=5
  var minx = 1e23,
    maxx = -1e23;
  var miny = 1e23,
    maxy = -1e23;

  var i;
  for (i = 0; i < poly.length; i++) {
    var p = poly[i];
    minx = Math.min(minx, p.x);
    miny = Math.min(miny, p.y);
    maxx = Math.max(maxx, p.x);
    maxy = Math.max(maxy, p.y);
  }

  var N = options.points,
    r2d = 180 / Math.PI;
  for (i = 1; i <= N; i++) {
    // Bauer, Robert, "Distribution of Points on a Sphere with Application to Star Catalogs",
    // Journal of Guidance, Control, and Dynamics, January-February 2000, vol.23 no.1 (130-137).
    var h = (2 * i - 1) / N - 1;
    var phi = Math.acos(h); // 0..pi
    var theta = Math.sqrt(N * Math.PI) * phi; // 0..pi√Npi

    var x = theta * r2d;
    while (x < minx) x += 360;
    while (x > maxx) x -= 360;
    if (x < minx) continue;

    // in equirectangular following would be:
    // var y = phi * r2d - 90;
    // but we are triangulating in scaled mercator
    var y = Math.log(Math.tan(phi / 2)) * r2d * mercatorScale;
    if (miny > y || y > maxy) continue;

    pts.push(new poly2tri.Point(x, y));
  }

  return pts;
}

export { convert };
