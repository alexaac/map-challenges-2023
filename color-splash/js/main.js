import * as dat from '../../js/libs/lil-gui.module.min.js';

console.log('00000000');

/**
 * Debug
 */
const gui = new dat.GUI({});
const parameters = {
  nbFactor: 20,
  dotSizeFactor: 0.05,
  sigmaFactor: 0.1,
};
gui.hide();

let containerDiv = document.getElementById('viz-container');
let app;

const recreateApp = () => {
  if (app) {
    app.destroy();
  }

  app = new gviz.App(containerDiv, {
    // w: 600,
    // h: 600,
    // legendDivId: 'myLegendDiv',
    selectionRectangleColor: 'red',
    selectionRectangleWidthPix: () => '1',
    backgroundColor: 'white',
    // tooltip: {
    //   fontSize: '1.2em',
    //   transitionDuration: 100,
    // },
    onZoomStartFun: (event) => {
      console.log('pan/zoom start', event);
    },
    onZoomFun: (event) => {
      console.log('zoom', event);
    },
    onZoomEndFun: (event) => {
      console.log('pan/zoom end', event);
    },
  })
    .setGeoCenter({ x: 5478447.750959396, y: 2642107.5246483684 })
    .setZoomFactor(600)
    .setZoomFactorExtent([30, 7000])
    .setBackgroundColor('#eaeaea')

    .setLabelLayer(
      gviz_es.getEuronymeLabelLayer('EUR', 50, {
        ex: 1.8,
        fontFamily: 'mf',
        exSize: 1.1,
        color: () => d3.schemeCategory10[Math.floor(10 * Math.random())],
        haloColor: () => '#ffffff',
        haloWidth: () => 3,
      })
    )

    .addCSVGridLayer(
      //data URL
      './data/estat_census_2021_ro.csv',
      //resolution, in CRS unit
      5000,
      //the styles
      [
        new gviz.DotDensityStyle({
          nbCol: 'OBS_VALUE_T',
          nb: (v, r, s, zf) =>
            (((parameters.nbFactor * r * r) / (zf * zf)) * v) / s.max,
          dotSize: (r, zf) => parameters.dotSizeFactor * zf,
          color: () => d3.schemeCategory10[Math.floor(10 * Math.random())],
          sigma: (r, zf) => parameters.sigmaFactor * r,
        }),
      ],
      {
        //tooltip content configuration
        cellInfoHTML: (c) => '<b>' + c.OBS_VALUE_T + '</b> !',
      }
    );

  // .addMultiScaleTiledGridLayer(
  //   [1000, 2000, 5000, 10000, 20000, 50000, 100000],
  //   (r) =>
  //     'https://raw.githubusercontent.com/jgaffuri/tiledgrids/main/data/europe/population2/' +
  //     r +
  //     'm/',
  //   [
  //     new gviz.DotDensityStyle({
  //       nbCol: 'TOT_P_2021',
  //       nb: (v, r, s, zf) => (((15 * r * r) / (zf * zf)) * v) / s.max,
  //       dotSize: (r, zf) => 1.6 * zf,
  //       color: () => d3.schemeCategory10[Math.floor(10 * Math.random())],
  //       sigma: (r, zf) => 0.25 * r,
  //     }),
  //   ],
  //   {
  //     preprocess: (c) => {
  //       //for each cell, remove what is not from Romania
  //       if (c.CNTR_ID != 'RO') c.TOT_P_2021 = -10;

  //       //remove unused information
  //       delete c.TOT_P_2006;
  //       delete c.TOT_P_2011;
  //       delete c.TOT_P_2018;
  //     },
  //   },
  //   {
  //     pixNb: 10,

  //     cellInfoHTML: (c) =>
  //       `The population of this cell is: <b>${c.TOT_P_2021}</b> !`,
  //   }
  // )

  // .addBackgroundLayer({
  //   url: 'https://gisco-services.ec.europa.eu/maps/tiles/NaturalEarth/EPSG3035/',
  //   resolutions: [
  //     156543.03392804097, 78271.51696402048, 39135.75848201024,
  //     19567.87924100512, 9783.93962050256, 4891.96981025128,
  //     2445.98490512564,
  //   ],
  //   origin: [0, 6000000],
  //   filterColor: (zf) => '#ffffff66',
  // })

  // .addBackgroundLayer({
  //   url: 'https://gisco-services.ec.europa.eu/maps/tiles/GreyEarth/EPSG3035/',
  //   resolutions: [
  //     156543.03392804097, 78271.51696402048, 39135.75848201024,
  //     19567.87924100512, 9783.93962050256, 4891.96981025128, 2445.98490512564,
  //   ],
  //   origin: [0, 6000000],
  //   filterColor: (zf) => '#ffffffd3',
  // });

  // .setBoundaryLayer({
  //   url: 'https://raw.githubusercontent.com/eurostat/Nuts2json/master/pub/v2/2021/3035/03M/nutsbn_3.json',
  //   color: (f, zf) => {
  //     const p = f.properties;
  //     if (p.co === 'T') return '#888';
  //     if (zf < 400) return '#888';
  //     else if (zf < 1000) return p.lvl >= 3 ? '' : '#888';
  //     else if (zf < 2000) return p.lvl >= 2 ? '' : '#888';
  //     else return p.lvl >= 1 ? '' : '#888';
  //   },
  //   width: (f, zf) => {
  //     const p = f.properties;
  //     if (p.co === 'T') return 0.5;
  //     if (zf < 400)
  //       return p.lvl == 3 ? 2.2 : p.lvl == 2 ? 2.2 : p.lvl == 1 ? 2.2 : 4;
  //     else if (zf < 1000)
  //       return p.lvl == 2 ? 1.8 : p.lvl == 1 ? 1.8 : 2.5;
  //     else if (zf < 2000) return p.lvl == 1 ? 1.8 : 2.5;
  //     else return 1.2;
  //   },
  //   lineDash: (f, zf) => {
  //     const p = f.properties;
  //     if (p.co === 'T') return [];
  //     if (zf < 400)
  //       return p.lvl == 3
  //         ? [2 * zf, 2 * zf]
  //         : p.lvl == 2
  //         ? [5 * zf, 2 * zf]
  //         : p.lvl == 1
  //         ? [5 * zf, 2 * zf]
  //         : [10 * zf, 3 * zf];
  //     else if (zf < 1000)
  //       return p.lvl == 2
  //         ? [5 * zf, 2 * zf]
  //         : p.lvl == 1
  //         ? [5 * zf, 2 * zf]
  //         : [10 * zf, 3 * zf];
  //     else if (zf < 2000)
  //       return p.lvl == 1 ? [5 * zf, 2 * zf] : [10 * zf, 3 * zf];
  //     else return [10 * zf, 3 * zf];
  //   },
  // });
};

recreateApp();

gui
  .add(parameters, 'sigmaFactor')
  .min(0)
  .max(2)
  .step(0.001)
  .onChange(() => {
    recreateApp();
  });
gui
  .add(parameters, 'dotSizeFactor')
  .min(0)
  .max(100)
  .step(0.1)
  .onChange(() => {
    recreateApp();
  });
gui
  .add(parameters, 'nbFactor')
  .min(0)
  .max(100)
  .step(0.1)
  .onChange(() => {
    recreateApp();
  });
