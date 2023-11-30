import * as dat from '../../js/libs/lil-gui.module.min.js';

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
    // selectionRectangleColor: 'red',
    // selectionRectangleWidthPix: () => '1',
    // backgroundColor: 'white',
    // // tooltip: {
    // //   fontSize: '1.2em',
    // //   transitionDuration: 100,
    // // },
    // onZoomStartFun: (event) => {
    //   // console.log('pan/zoom start', event);
    // },
    // onZoomFun: (event) => {
    //   // console.log('zoom', event);
    // },
    // onZoomEndFun: (event) => {
    //   // console.log('pan/zoom end', event);
    // },
  })
    .setGeoCenter({ x: 5478447.750959396, y: 2642107.5246483684 })
    .setZoomFactor(1000)
    .setZoomFactorExtent([30, 7000])
    .setBoundaryLayer(
      gviz_es.getEurostatBoundariesLayer({
        scale: '10M',
        col: '#00000077',
        lineDash: () => [],
      })
    )
    .setBackgroundColor('#ECE6D3')

    .setLabelLayer(
      gviz_es.getEuronymeLabelLayer('EUR', 50, {
        ex: 1,
        fontFamily: 'mf',
        exSize: 0.8,
        color: () => 'black',
        haloColor: () => '#ffffff',
        haloWidth: () => 3,
      })
    )

    .addMultiScaleTiledGridLayer(
      [1000, 2000, 5000, 10000, 20000, 50000, 100000],
      (r) =>
        'https://raw.githubusercontent.com/jgaffuri/tiledgrids/main/data/europe/population2/' +
        r +
        'm/',
      [
        new gviz.MosaicStyle({
          colorCol: 'TOT_P_2021',
          color: (v, r, s) =>
            !+v ? undefined : d3.interpolateYlOrBr(gviz.sExpRev(v / s.max, -7)),
          mosaicFactor: 0.2,
          shadowFactor: 0.25,
          shadowColor: '#aaa',
        }),
      ],
      // {
      //   preprocess: (c) => {
      //     //for each cell, remove what is not from Romania
      //     // if (c.CNTR_ID != 'RO') c.TOT_P_2021 = undefined;
      //     // //remove unused information
      //     // delete c.TOT_P_2006;
      //     // delete c.TOT_P_2011;
      //     // delete c.TOT_P_2018;
      //   },
      // },

      {
        pixNb: 12,
        cellInfoHTML: (c) => '',
        // '<b>' +
        // c.TOT_P_2021 +
        // '</b> inhabitant' +
        // (c.TOT_P_2021 == 1 ? '' : 's'),
      }
    );

  // .addCSVGridLayer(
  //   //data URL
  //   './data/estat_census_2021_ro.csv',
  //   //resolution, in CRS unit
  //   1000,
  //   //the styles
  //   [
  //     new gviz.MosaicStyle({
  //       colorCol: 'OBS_VALUE_T',
  //       color: (v, r, s) =>
  //         !+v ? undefined : d3.interpolateYlOrBr(gviz.sExpRev(v / s.max, -7)),
  //       mosaicFactor: 0.2,
  //       shadowFactor: 0.25,
  //       shadowColor: '#aaa',
  //     }),
  //   ],
  //   {
  //     // pixNb: 12,
  //     cellInfoHTML: (c) =>
  //       '<b>' +
  //       c.OBS_VALUE_T +
  //       '</b> inhabitant' +
  //       (c.OBS_VALUE_T == 1 ? '' : 's'),
  //   }
  //   // {
  //   //   //tooltip content configuration
  //   //   cellInfoHTML: (c) => '<b>' + c.OBS_VALUE_T + '</b> !',
  //   // }
  // );

  //legend
  app.layers[0].styles[0].legends.push(
    new gviz.ColorLegend({
      title: 'Number of inhabitants',
      'font-family': 'mf',
      width: 450,
      ticks: 6,
      colorRamp: d3.interpolateYlOrBr,
      fun: (t, r, s) => s.max * gviz.sExpRevInverse(t, -7),
    })
  );
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
