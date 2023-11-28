/* Global variables */
const width = 20,
  height = 20;

const center = [18.419, -33.916];

const apiKey = 'wSVUkjoWKTD8fUSyzJd5';

// Define the map syle (OpenStreetMap raster tiles)
let selectedStyle = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
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

const map = (window.map = new maplibregl.Map({
  container: 'map',
  style: selectedStyle,
  // style:
  //   'https://api.maptiler.com/maps/streets/style.json?key=wSVUkjoWKTD8fUSyzJd5',
  center: center,
  zoom: 15.2,
  pitch: 48,
  // bearing: 80,
  antialias: true,
}));

map.addControl(new maplibregl.NavigationControl());

// Map projection
const zoom = 23;

const geocoderApi = {
  forwardGeocode: async (config) => {
    const features = [];
    try {
      const request = `https://nominatim.openstreetmap.org/search?q=${config.query}&format=geojson&polygon_geojson=1&addressdetails=1`;
      const response = await fetch(request);
      const geojson = await response.json();
      for (const feature of geojson.features) {
        const center = [
          feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
          feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2,
        ];
        const point = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: center,
          },
          place_name: feature.properties.display_name,
          properties: feature.properties,
          text: feature.properties.display_name,
          place_type: ['place'],
          center,
        };
        features.push(point);
      }
    } catch (e) {
      console.error(`Failed to forwardGeocode with error: ${e}`);
    }

    return {
      features,
    };
  },
};
map.addControl(
  new MaplibreGeocoder(geocoderApi, {
    maplibregl,
  })
);

const features = [];
let geojsonFeatures = {
  type: 'FeatureCollection',
  features: features,
};

const renderBase = async (location) => {
  /* Load the data */
  // Render the OSM tiles
  await renderBuildings(location);
  // map.setCenter(location);
};

// Draw OSM Buildings layer - more detailed
const renderBuildings = async (location) => {
  console.log('------------------------', location);

  geojsonFeatures.features = [];
  map.getSource('tm_buildings').setData(geojsonFeatures);
  map.triggerRepaint();
  // const center = [21.22886, 45.75619];
  const projection = d3
    .geoMercator()
    .center(location)
    .scale(Math.pow(2, zoom) / (2 * Math.PI))
    .translate([width / 2, height / 2]);

  // Tiler
  const tile = d3
    .tile()
    .tileSize(512)
    .size([width, height])
    .scale(projection.scale() * 2 * Math.PI)
    .translate(projection([0, 0]))
    .zoomDelta(2)
    .clampX(false);

  /* Load the data */
  const promises = tile().map(async ([x, y, z]) => {
    console.log(x, y, z);
    const tiles = await d3.json(
      `https://data.osmbuildings.org/0.2/anonymous/tile/${z}/${x}/${y}.json`
    );

    if (tiles) {
      await tiles.features.forEach(async (feature) => {
        let id = feature.id;

        if (!/^r/.test(id)) {
          geojsonFeatures.features.push(feature);
          // console.log(geojsonFeatures.features.length);

          map.getSource('tm_buildings').setData(geojsonFeatures);
        }
      });
    }
  });

  return Promise.all(promises)
    .then((data) => {
      map.triggerRepaint();

      return data;
    })
    .catch((error) => console.log(error));
};

// The 'building' layer in the streets vector source contains building-height
// data from OpenStreetMap.
map.on('load', function () {
  map.addSource('tm_buildings', {
    type: 'geojson',
    data: geojsonFeatures,
  });

  map.addLayer({
    id: 'tm_buildings',
    source: 'tm_buildings',
    layout: {},
    type: 'fill-extrusion',
    paint: {
      // See the MapLibre Style Specification for details on data expressions.
      // https://maplibre.org/maplibre-gl-js-docs/style-spec/expressions/

      // Get the fill-extrusion-color from the source 'color' property.
      'fill-extrusion-color': [
        'case',
        ['has', 'colour'],
        ['get', 'colour'],
        'hsl(196, 50%, 50%)',
      ],

      // Get fill-extrusion-height from the source 'height' property.
      // 'fill-extrusion-height': 50,
      'fill-extrusion-height': ['get', 'height'],

      // Get fill-extrusion-base from the source 'base_height' property.
      'fill-extrusion-base': ['get', 'base_height'],

      // Make extrusions slightly opaque for see through indoor walls.
      'fill-extrusion-opacity': 1,
    },
  });

  renderBase(center);
});

// Time
let time = Date.now();

function onFrame() {
  parameters.elapsedTime = new Date().getTime() - parameters.initialTime;
  if (parameters.elapsedTime < parameters.frequency) return;

  let steps = Math.floor(parameters.elapsedTime / parameters.frequency);
  while (steps > 0) {
    animate();
    steps -= 1;
  }

  parameters.initialTime = new Date().getTime();
}

function animate(timestamp) {
  parameters.uTime = timestamp;

  // Request the next frame of the animation.
  requestAnimationFrame(animate);
}

map.on('click', (e) => {
  console.log(e.lngLat.wrap());

  map.getCanvas().style.cursor = 'default';

  renderBase([e.lngLat.lng, e.lngLat.lat]);
});

map.on('mouseout', (e) => {
  map.getCanvas().style.cursor = 'initial';
});
