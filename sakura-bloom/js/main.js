import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

mapboxgl.accessToken =
  'pk.eyJ1IjoiYWxleGFhYyIsImEiOiJjbDhvZ242MWEwYmF2NDFydXQ0bWpqcnJwIn0.l7weC1uq7sZuuVqmByhYiA';
const isMobile = window.innerWidth < 703;
const parseTime = d3.timeParse('%Y/%m/%d');

/**
 * @description Fetch data
 * @param {string} url - file
 */
const getData = async (url) => {
  const response = fetch(url);

  const data = await (await response).text();

  const dataArr = data.split('\n');
  const columnsName = dataArr.shift().split(','); // remove the first element

  // let rows = {};
  let rows = [];
  dataArr.map((row) => {
    const elem = {};
    const columns = row.split(',');

    columnsName.forEach((columnName, i) => {
      if (columns[i]) {
        elem[columnName] = columns[i].replace(/"/g, '');
      }
    });

    elem.dateTime = parseTime(elem.Year_2023);

    if (elem.dateTime) {
      elem.time = elem.dateTime.getTime();
    }

    rows.push(elem);
  });

  return rows;
};

let data = await getData('./data/sakura_full_bloom_dates_geo.csv');
console.log(data);

data = data.sort(function (a, b) {
  return a.time - b.time;
});
console.log(data);

const datesSet = new Set(data.map((row) => row.dateTime));
console.log(datesSet);

const features = data.map((row) => {
  return {
    type: 'Feature',
    properties: row,
    geometry: {
      type: 'Point',
      coordinates: [+row.x, +row.y],
    },
  };
});
const geojsonData = {
  type: 'FeatureCollection',
  features: features,
};
console.log(data, geojsonData.features[0]);

const center = isMobile
  ? { lng: 136.5608817446124, lat: 41.13835015674274 }
  : { lng: 137.52, lat: 36.21 };

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/alexaac/clp2wjlso01jq01o46gjy04kf',
  center: center,
  zoom: isMobile ? 3.8 : 4.8,
  antialias: true,
  projection: 'equirectangular',
});

map.on('load', () => {
  let running = false;
  let i = 0;

  function animate() {
    if (running) return;

    if (
      geojsonData.features[i] &&
      !isNaN(geojsonData.features[i].geometry.coordinates[0])
    ) {
      document.querySelector(
        '#bloom-day'
      ).innerHTML = ` on ${geojsonData.features[i].properties.Year_2023} in ${geojsonData.features[i].properties.Site_Name}`;
      // create a HTML element for each feature
      const el = document.createElement('div');
      el.className = 'marker';

      // make a marker for each feature and add to the map
      const marker = new mapboxgl.Marker(el)
        .setLngLat(geojsonData.features[i].geometry.coordinates)
        .addTo(map);

      // Animate marker removal
      gsap.to(el, {
        duration: 10,
        opacity: 0,
        ease: 'linear',
      });
      gsap.to(el, {
        duration: 5,
        scale: 10,
        ease: 'linear',
        onComplete: () => {
          gsap.to(el, {
            duration: 5,
            scale: 0.3,
            ease: 'linear',
          });
        },
      });
    }

    if (++i < geojsonData.features.length - 1) {
      setTimeout(animate, 250);
    } else {
      document.querySelector('#bloom-day').innerHTML = '';
      playBtn.classList.remove('hidden');
      stopBtn.classList.add('hidden');
      running = true;
    }
  }

  // start the animation
  animate();

  const playBtn = document.querySelector('#play');
  const stopBtn = document.querySelector('#stop');

  playBtn.addEventListener('click', (event) => {
    playBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    i = 0;
    running = false;
    animate();
  });

  stopBtn.addEventListener('click', (event) => {
    playBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    running = true;
  });
});

map.on('click', (e) => {
  console.log(e.lngLat.wrap(), map.getZoom());
});
