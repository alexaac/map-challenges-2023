import { toGeoJSON } from './togeojson.js';

const apiKey = 'wSVUkjoWKTD8fUSyzJd5';
mapboxgl.accessToken =
  'pk.eyJ1IjoiYWxleGFhYyIsImEiOiJja3o1OGdrcWUwZGN2MnRwa2xsa2pqNTI3In0.RenxXCa3uR7D7-tdvoYKGw';

const isMobile = window.innerWidth < 703;

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

const center = { lng: -1.374813356863342, lat: 52.83055503426567 };
14.500000000000002;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v10',
  center: center,
  zoom: isMobile ? 13 : 14.2,
  antialias: true,
});

const defaultDataFile = './data/race_technology.gpx';
const motoVideo = document.getElementById('motoVideo');

map.on('load', async () => {
  // Draw default route
  setTimeout(function () {
    drawRoute();
  }, 2000);
});

async function drawRoute(file) {
  let data = await getData(file || defaultDataFile);
  data = toGeoJSON.gpx(data);

  let points = data.features[0].geometry.coordinates;
  const times = data.features[0].properties.coordTimes;

  let dateTimes = times.map(
    (time) => (new Date(time) - new Date('2019-08-29T12:30:52.239Z')) / 1000
  );

  let features = dateTimes.map((dateTime, i) => {
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: points[i] },
      properties: {
        time: times[i],
        dateTime: dateTime,
      },
    };
  });
  features = features.filter(
    (feature) =>
      feature.properties.dateTime >= 0 &&
      feature.properties.dateTime <= 171.114666
  );

  const trackPoints = {
    type: 'FeatureCollection',
    features: features,
  };

  const track = {
    type: 'FeatureCollection',
    features: data.features,
  };

  map.addSource('track', {
    type: 'geojson',
    data: track,
  });
  map.addLayer({
    id: 'track',
    type: 'line',
    source: 'track',
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

  map.addSource('track-points', {
    type: 'geojson',
    data: trackPoints,
    generateId: true,
  });
  map.addLayer({
    id: 'track-points',
    type: 'circle',
    source: 'track-points',
    paint: {
      'circle-radius': 5,
      'circle-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1,
        0,
      ],
      'circle-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        'red',
        '#3fb1ce',
      ],
    },
  });

  const popup = new mapboxgl.Popup({ closeButton: false });
  const marker = new mapboxgl.Marker()
    .setLngLat(trackPoints.features[0].geometry.coordinates)
    .setPopup(popup)
    .addTo(map)
    .togglePopup();

  motoVideo.currentTime = 0;
  motoVideo.play();

  function tick() {
    const currentPoint = trackPoints.features.find(
      (feature) =>
        Math.round(feature.properties.dateTime) ===
        Math.round(motoVideo.currentTime)
    );

    if (currentPoint) {
      marker.setLngLat(currentPoint.geometry.coordinates);
      // if (buildingId) {
      //   map.removeFeatureState({
      //     source: 'track-points',
      //     id: buildingId,
      //   });
      // }

      // let feature = event.features[0];
      // buildingId = feature.id;
      // map.setFeatureState(
      //   { source: 'track-points', id: buildingId },
      //   { hover: true }
      // );
    }

    window.requestAnimationFrame(tick);
  }

  // start the animation
  tick();
}

map.on('click', (e) => {
  console.log(e.lngLat.wrap(), map.getZoom());
});

map.on('click', 'track-points', function (event) {
  map.getCanvas().style.cursor = 'pointer';

  let feature = event.features[0];
  motoVideo.currentTime = feature.properties.dateTime;
});

let buildingId;
map.on('mousemove', 'track-points', function (event) {
  map.getCanvas().style.cursor = 'pointer';

  if (buildingId) {
    map.removeFeatureState({
      source: 'track-points',
      id: buildingId,
    });
  }

  let feature = event.features[0];
  buildingId = feature.id;
  map.setFeatureState(
    { source: 'track-points', id: buildingId },
    { hover: true }
  );
});

map.on('mouseleave', 'track-points', () => {
  map.getCanvas().style.cursor = '';

  if (buildingId) {
    map.setFeatureState(
      {
        source: 'track-points',
        id: buildingId,
      },
      {
        hover: false,
      }
    );
  }
  buildingId = null;
});
