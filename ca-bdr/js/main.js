import * as THREE from '../../js/three/build/three.module.js';
import { Antenna } from './models/Antenna.js';
import { toGeoJSON } from './togeojson.js';
import { drawChart } from './drawChart.js';
import { haversineDistance } from './haversine.js';

const defaultDataFile = './data/CABDR-S-November2023.gpx';
const interval = 10;
let timer;

// Define the map syle (OpenStreetMap raster tiles)
let selectedStyle = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://tile.tracestrack.com/topo__/{z}/{x}/{y}.png?key=0ad7439b9a9c56e8c336efdc036852e2',
      ],
      // tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
      // tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm', // This must match the source key above
    },
  ],
};

const map = new maplibregl.Map({
  container: 'map',
  style: selectedStyle,
  // style: `https://api.maptiler.com/maps/winter/style.json?key=${apiKey}`,
  // style: `https://api.maptiler.com/maps/hybrid/style.json?key=${apiKey}`,
  // center: [11.40416, 47.26475],
  zoom: 16,
  pitch: 55,
  maxPitch: 85,
});

// Create the marker and popup that will display the elevation queries
const popup = new maplibregl.Popup({ closeButton: false });

let longitude = [0, 0],
  latitude = [0, 0];

const parameters = {
  // materialColor: '#409ebf',
  materialColor: '#ff0000',
  materialOpacity: 1,
  materialAmbientTerm: 1,
  materialSpecularTerm: 0,
  materialShininess: 2.8,

  lightColor: '#ffffff',
  ambientTerm: 0.3,
  specularTerm: 1,
  lightPosition: {
    x: -1,
    y: 1,
    z: 0,
  },
  lightDirection: {
    x: 1,
    y: -0.5,
    z: 0.3,
  },
  wireframe: false,
  fixedLight: false,
  uTime: null,
  date: new Date(),
  initialTime: null,
  directionalLight: new THREE.DirectionalLight(0xffffff, 1),
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

  zoom: map.getZoom(),

  keys: {
    a: false,
    s: false,
    d: false,
    w: false,
  },

  moving: false,
};

let lngLat = {
  lng: 0,
  lat: 0,
};

let api = {
  buildings: true,
  acceleration: 10,
  inertia: 1,
};

const marker = new maplibregl.Marker({
  // color: 'red',
  // scale: 0.8,
  // draggable: false,
  // pitchAlignment: 'auto',
  // rotationAlignment: 'auto',
})
  .setLngLat(lngLat)
  .setPopup(popup)
  .addTo(map)
  .togglePopup();

map.addControl(
  new maplibregl.NavigationControl({
    visualizePitch: true,
    showZoom: true,
    showCompass: true,
  })
);

map.addControl(
  new maplibregl.TerrainControl({
    source: 'terrainSource',
    exaggeration: 1,
  })
);

/**
 * @description Fetch data
 * @param {string} url - file
 */
const getData = async (url) => {
  const response = fetch(url);

  let data = await (await response).text();
  data = new window.DOMParser().parseFromString(data, 'text/xml');

  return data;
};

map.on('load', async () => {
  let data = await getData(defaultDataFile);
  data = toGeoJSON.gpx(data);
  console.log(data);

  const routes = data.features.filter(
    (feature) => feature.geometry.type === 'LineString'
  );

  console.log(routes);

  const caseSelect = document.querySelector('#case-select');

  routes.forEach((route, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.innerText = route.properties.name;
    caseSelect.appendChild(option);
  });
  caseSelect.size = routes.length;

  // Draw default route

  setTimeout(function () {
    drawRoute(0);
  }, 2000);

  async function drawRoute(index) {
    d3.select('#pause-cases').classed('hide', false);
    d3.select('#play-cases').classed('hide', true);
    window.clearInterval(timer);

    if (map.getSource('trace')) {
      map.removeLayer('trace');
      map.removeSource('trace');
    }
    if (map.getSource('Stations')) {
      map.removeLayer('Stations');
      map.removeSource('Stations');
    }
    if (map.getLayer('mo')) {
      map.removeLayer('mo');
    }

    map.setStyle(selectedStyle);

    const routeData = {
      type: 'FeatureCollection',
      features: [routes[index]],
    };

    /**
     * Prepare data for chart
     */
    const points = routeData.features[0].geometry.coordinates;
    // console.log(points);

    const times = routeData.features[0].properties.coordTimes;
    let totalDistance = 0;
    const gpx_data = points.map((array, index) => {
      const elem = {};

      elem.id = index;
      elem.lat = array[1];
      elem.lon = array[0];
      elem.elevation = array[2];
      elem.prevLat = elem.lat;
      elem.prevLon = elem.lon;

      const prevElem = points[index - 1];
      if (prevElem) {
        elem.prevLat = prevElem[1];
        elem.prevLon = prevElem[0];
      }

      elem.distance = haversineDistance(
        [elem.lat, elem.lon],
        [elem.prevLat, elem.prevLon]
      );

      totalDistance += elem.distance;
      elem.totalDistance = totalDistance.toFixed(0);

      elem.time = times && times[index];

      elem.point = [elem.lon, elem.lat, elem.elevation];

      // for (let i = 1; i < data.features.length; i++) {
      //   const dist = haversineDistance(
      //     [elem.lat, elem.lon],
      //     [
      //       data.features[i].geometry.coordinates[1],
      //       data.features[i].geometry.coordinates[0],
      //     ]
      //   );

      //   if (dist < 100) {
      //     elem.photo = data.features[i];
      //     // console.log(
      //     //   '---------------------------------------------',
      //     //   elem.photo
      //     // );
      //   }
      // }

      return elem;
    });

    const parseTime1 = d3.utcParse('%Y-%m-%dT%H:%M:%S.%LZ');
    const parseTime2 = d3.utcParse('%Y-%m-%dT%H:%M:%SZ');

    function parseTime(s) {
      let t1 = parseTime1(s);
      let t2 = parseTime2(s);
      if (t1) {
        return t1;
      } else {
        return t2;
      }
    }

    // format the data
    if (times) {
      gpx_data.forEach((d) => {
        d.date = parseTime(d.time);
        d.total_active = +d.elevation || 0;
      });
    } else {
      gpx_data.forEach((d) => {
        d.date = +d.totalDistance;
        d.total_active = +d.elevation || 0;
      });
    }

    let { radius, lineGraph, timeBrush } = drawChart(gpx_data, times, {
      map,
      popup,
      marker,
    });

    // save full coordinate list for later
    const coordinates = routeData.features[0].geometry.coordinates.slice(
      0,
      routeData.features[0].geometry.coordinates.length - 40
    );

    map.setCenter(coordinates[0]);
    map.flyTo({
      ...{
        center: coordinates[0],
        zoom: 16,
        pitch: 0,
        bearing: 0,
      },
      duration: 1000,
      essential: true,
    });

    // setup the viewport
    const bounds = getBoundingBox(coordinates);
    map.fitBounds(
      [
        [bounds.xMin, bounds.yMin],
        [bounds.xMax, bounds.yMax],
      ],
      {
        padding: {
          top: 0,
          bottom: 150,
          left: 50,
          right: 50,
        },
        linear: true,
        duration: 0,
      }
    );

    // start by showing just the first coordinate
    routeData.features[0].geometry.coordinates = [coordinates[0]];

    (parameters.longitude = coordinates[0][0]),
      (parameters.latitude = coordinates[0][1]);

    let mapConfig = {
      map: {
        center: [parameters.longitude, parameters.latitude],
        pitch: 75,
        bearing: 0,
        zoom: 18,
      },

      truck: {
        type: 'glb',
        model: './assets/models/moto/Motorrad1',
        rotation: { x: 0, y: 0, z: 0 },
        scaleFactor: 300,
        startRotation: { x: Math.PI / 2, y: Math.PI, z: 0 },
      },

      names: {
        compositeSource: 'composite',
        compositeSourceLayer: 'building',
        compositeLayer: 'building-3d',
      },
    };

    const antenna = new Antenna('mo', api, mapConfig, parameters);
    map.addLayer(antenna);
    const truck = antenna.getTruck();
    // console.log(truck);
    /**
     * Rotate camera
     */
    // The total animation duration, in milliseconds
    const animationDuration = coordinates.length * 20;
    let start;
    function frame(time) {
      if (!start) start = time;
      const animationPhase = (time - start) / animationDuration;
      if (animationPhase > 1) {
        return;
      }

      // Rotate the camera at a slightly lower speed to give some parallax effect in the background
      const rotation = 150 - animationPhase * 40.0;
      map.setBearing(rotation % 360);

      window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);

    /**
     * Add points to route
     */
    // on a regular basis, add more coordinates from the saved list and update the map
    let i = 0;
    let brushStart = 0;

    function getBearing(lat1, lon1, lat2, lon2) {
      var longDiff = lon2 - lon1;
      var y = Math.sin(longDiff) * Math.cos(lat2);
      var x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(longDiff);

      return (toDegrees(Math.atan2(y, x)) + 360) % 360;
    }

    function toDegrees(angle) {
      return angle * (180 / Math.PI);
    }

    timer = setInterval(() => {
      // if (i < 10) {
      if (i < coordinates.length) {
        parameters.moving = true;
        parameters.longitude = coordinates[i][0];
        parameters.latitude = coordinates[i][1];

        let bearing = 0;
        if (i > 1) {
          bearing =
            // getBearing(
            //   coordinates[i - 1][0],
            //   coordinates[i - 1][1],
            //   coordinates[i][0],
            //   coordinates[i][1]
            // );

            (Math.round(turf.bearing(coordinates[i - 1], coordinates[i])) +
              360) %
            360;

          // turf.bearing(coordinates[i - 1], coordinates[i]);
          // console.log(bearing);
          parameters.keys2 = {
            a: bearing > 180 ? true : false,
            d: bearing < 180 ? true : false,
            w: bearing < 90 || bearing > 270 ? true : false,
            s: bearing > 90 || bearing < 270 ? true : false,
            deg: bearing,
            altitude: coordinates[i][2],
          };

          // Math.atan(
          //   Math.abs(coordinates[i - 1][0] - coordinates[i][0]) /
          //     Math.abs(coordinates[i - 1][1] - coordinates[i][1])
          // );
        }

        routeData.features[0].geometry.coordinates.push(coordinates[i]);

        if (map.getSource('trace')) {
          map.panTo(coordinates[i]);

          map.getSource('trace').setData(routeData);

          // // Show popup
          // Helper.highlight(
          //   {
          //     lat: coordinates[i][1],
          //     lon: coordinates[i][0],
          //     elevation: coordinates[i][2],
          //     totalDistance: gpx_data[i].totalDistance,
          //   },
          //   { map, popup, marker }
          // );

          // // Show photo if stop
          // if (gpx_data[i].photo) {
          //   addPopup(
          //     [coordinates[i][0], coordinates[i][1]],
          //     i,
          //     gpx_data[i].photo.properties.name
          //   );
          // }

          // // Brush the chart
          // timeBrush.brushComponent
          //   .transition()
          //   .call(timeBrush.brush.move, [brushStart, i]);

          d3.selectAll('.dot_active')
            .attr('r', radius)
            .classed('focus-marker', false);
          d3.select(`#circle-${gpx_data[i].id}`)
            .attr('r', 2 * radius)
            .classed('focus-marker', true);

          i++;
        }
      } else {
        parameters.moving = false;
        window.clearInterval(timer);

        d3.select('#pause-cases').classed('hide', true);
        d3.select('#play-cases').classed('hide', false);

        setTimeout(function () {
          map.flyTo({
            ...{
              center: coordinates[i],
              zoom: 16,
              pitch: 0,
              bearing: 0,
            },
            duration: 1000,
            essential: true,
          });
          map.fitBounds(
            [
              [bounds.xMin, bounds.yMin],
              [bounds.xMax, bounds.yMax],
            ],
            {
              padding: {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              },
              linear: false,
              duration: 0,
            }
          );
        }, 1000);
      }
    }, interval);

    // Start/stop the brush animation
    var flag = false;

    d3.select('#play-cases').on('click', () => {
      d3.select('#play-cases').classed('hide', true);
      d3.select('#pause-cases').classed('hide', false);
      flag = true;
      drawRoute(caseSelect.value);
    });
    d3.select('#pause-cases').on('click', () => {
      console.log(caseSelect.value);
      d3.select('#pause-cases').classed('hide', true);
      d3.select('#play-cases').classed('hide', false);
      flag = false;
      window.clearInterval(timer);
    });

    // add it to the map
    if (map.getSource('trace')) {
      // window.clearInterval(timer);
      // map.removeLayer('trace');
      // map.removeSource('trace');
    }

    map.addSource('trace', { type: 'geojson', data: routeData });
    map.addLayer({
      id: 'trace',
      type: 'line',
      source: 'trace',
      // paint: {
      //   'line-color': 'yellow',
      //   'line-opacity': 0.75,
      //   'line-width': 5,
      // },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#3fb1ce',
        'line-width': 5,
        'line-opacity': 0.8,
      },
    });

    map.addSource('Stations', {
      type: 'geojson',
      data: routeData,
    });
    map.addLayer({
      id: 'Stations',
      type: 'circle',
      source: 'Stations',
      paint: {
        'circle-stroke-color': 'white',
        'circle-stroke-width': 3,
        'circle-radius': 6,
        'circle-color': '#3fb1ce',
      },
    });
  }

  function getBoundingBox(coords) {
    var bounds = {},
      point,
      latitude,
      longitude;

    for (var j = 0; j < coords.length; j++) {
      longitude = coords[j][0];
      latitude = coords[j][1];
      bounds.xMin = bounds.xMin < longitude ? bounds.xMin : longitude;
      bounds.xMax = bounds.xMax > longitude ? bounds.xMax : longitude;
      bounds.yMin = bounds.yMin < latitude ? bounds.yMin : latitude;
      bounds.yMax = bounds.yMax > latitude ? bounds.yMax : latitude;
    }

    return bounds;
  }

  caseSelect.addEventListener('change', function handleChange() {
    console.log(this.value);
    drawRoute(this.value);
  });

  /* Popup containing random cats images */
  const addPopup = (coordinates, index, name) => {
    index = index || 0;
    // random number from 1 to 10
    const randomNo = Math.floor(Math.random() * 6 + 1);
    // const iconSize = [50 + randomNo, 50 + randomNo];
    // const iconSize = [53 + index, 53 + index];

    // create a DOM element for the marker
    const el = document.createElement('div');

    const img = document.createElement('div');
    el.appendChild(img);
    img.className = 'popup';
    // img.style.backgroundImage = `url(https://placekitten.com/g/${iconSize.join(
    //   '/'
    // )}/)`;

    // Removed until placecorgi works
    // img.style.backgroundImage = `url(http://placecorgi.com/${iconSize.join(
    //   '/'
    // )}/)`;

    img.style.backgroundImage = `url(./assets/textures/corgi${randomNo}.jpg)`;
    img.style.backgroundSize = 'cover';
    img.style.backgroundRepeat = 'no-repeat';
    img.style.backgroundPosition = 'center center';

    // img.style.backgroundImage = `url(https://picsum.photos/${iconSize[0]}/)`;

    img.style.width = '50px';
    img.style.height = '50px';

    const text = document.createElement('div');
    el.appendChild(text);
    text.style.textAlign = 'center';
    text.innerHTML = name;

    const popup = new maplibregl.Popup({
      offset: 25,
      closeOnClick: false,
      closeButton: false,
      className: 'popup-outer',
    })
      .setHTML(el.outerHTML)
      .setLngLat(coordinates)
      .addTo(map);
  };
});
