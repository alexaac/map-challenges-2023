import * as Config from './Config.js';
import * as Utils from './Utils.js';
import { drawAreaLegend } from './DrawLegend.js';

// draw the Demers cartogram based on number of votes from the geographic data
export const drawDemers = (votesStats, layer, svg) => {
  // https://bl.ocks.org/martgnz/34880f7320eb5a6745e2ed7de7914223

  const geoData = votesStats.formattedData;

  var geojsonFeatures = topojson.feature(geoData, {
    type: 'GeometryCollection',
    geometries: geoData.objects[layer].geometries,
  });
  const thisMapPath = d3
    .geoPath()
    .projection(
      Config.projection.fitSize([Config.width, Config.height], geojsonFeatures)
    );

  const padding = 3;
  const land = topojson.merge(
    geoData,
    geoData.objects.counties_wgs84.geometries
  );
  svg.append('path').attrs({ class: 'land', d: thisMapPath(land) });

  const nodes = topojson.feature(geoData, geoData.objects[layer]).features;
  const font = d3
    .scaleLinear()
    .range([6, 20])
    .domain(d3.extent(nodes, (d) => d.properties.joined.totValidVotes));
  const size = d3
    .scaleSqrt()
    .range([5, 120])
    .domain(d3.extent(nodes, (d) => d.properties.joined.totValidVotes));

  nodes.forEach((d) => {
    d.pos = thisMapPath.centroid(d);
    d.area = size(d.properties.joined.totValidVotes);
    [d.x, d.y] = d.pos;
  });

  const collide = () => {
    for (let k = 0, iterations = 4, strength = 0.5; k < iterations; ++k) {
      for (let i = 0, n = nodes.length; i < n; ++i) {
        for (let a = nodes[i], j = i + 1; j < n; ++j) {
          let b = nodes[j],
            x = a.x + a.vx - b.x - b.vx,
            y = a.y + a.vy - b.y - b.vy,
            lx = Math.abs(x),
            ly = Math.abs(y),
            r = a.area / 2 + b.area / 2 + padding;
          if (lx < r && ly < r) {
            if (lx > ly) {
              lx = (lx - r) * (x < 0 ? -strength : strength);
              (a.vx -= lx), (b.vx += lx);
            } else {
              ly = (ly - r) * (y < 0 ? -strength : strength);
              (a.vy -= ly), (b.vy += ly);
            }
          }
        }
      }
    }
  };

  const simulation = d3
    .forceSimulation(nodes)
    .force('x', d3.forceX((d) => d.x).strength(0.1))
    .force('y', d3.forceY((d) => d.y).strength(0.1))
    .force('collide', collide);
  for (let i = 0; i < 120; ++i) simulation.tick();

  const rect = svg
    .selectAll('g')
    .data(nodes)
    .enter()
    .append('g')
    .attr('transform', (d) => `translate(${d.x}, ${d.y})`);
  rect
    .append('rect')
    .attr('class', (d) => `bubble CO-${d.properties.joined.code}`)
    .attr('width', (d) => d.area)
    .attr('height', (d) => d.area)
    .attr('x', (d) => -d.area / 2)
    .attr('y', (d) => -d.area / 2)
    .attr('fill', (d) => Utils.colorLayers(d))
    .attr('rx', 2)
    .on('mouseover', (d) => Utils.highlight(d))
    .on('mouseout', (d) => Utils.unHighlight(d));
  rect
    .append('text')
    .attr('class', 'feature-label')
    .filter((d) => d.area > 18)
    .style('font-family', 'sans-serif')
    .style('font-size', (d) => `${font(d.properties.joined.totValidVotes)}px`)
    .attr('text-anchor', 'middle')
    .attr('dy', 2)
    .text((d) => d.properties.joined.districtAbbr);

  const node = svg
    .selectAll('rect')
    .data(nodes)
    .enter()
    .append('rect')
    .attr('width', (d) => {
      return d.r * 2;
    })
    .attr('height', (d) => {
      return d.r * 2;
    });

  const tick = (e) => {
    node
      .attr('x', (d) => {
        return d.x - d.r;
      })
      .attr('y', (d) => {
        return d.y - d.r;
      });
  };

  drawAreaLegend({
    typeOfArea: 'square',
    data: nodes,
    variable: 'totValidVotes',
    maxAreaSize: 120,
    svg: svg,
    legendData: [300000, 100000],
    legendText: 'Total valid votes',
  });
};

// draw the Non-Contiguous cartogram based on number of votes from the geographic data
export const drawNonCont = (votesStats, layer, svg) => {
  // https://strongriley.github.io/d3/ex/cartogram.html

  const geoData = votesStats.formattedData;
  var geojsonFeatures = topojson.feature(geoData, {
    type: 'GeometryCollection',
    geometries: geoData.objects[layer].geometries,
  });
  const thisMapPath = d3
    .geoPath()
    .projection(
      Config.projection.fitSize([Config.width, Config.height], geojsonFeatures)
    );

  const nodes = topojson.feature(geoData, geoData.objects[layer]).features;
  nodes.forEach((d) => {
    d.properties.joined.totalValidVotesScale = Math.sqrt(
      d.properties.joined.totValidVotes / 300000
    );
    d.properties.joined.totValidVotes_rate =
      Math.ceil(
        d.properties.joined.totValidVotes /
          d.properties.joined.totalValidVotesScale
      ) || 0;
  });

  svg
    .append('g')
    .attr('class', 'black')
    .selectAll('path')
    .data(nodes)
    .enter()
    .append('path')
    .attr('d', thisMapPath);
  svg
    .append('g')
    .attr('class', 'land')
    .selectAll('path')
    .data(nodes)
    .enter()
    .append('path')
    .attr('d', thisMapPath);

  svg
    .append('g')
    .attr('class', 'white')
    .selectAll('path')
    .data(nodes)
    .enter()
    .append('path')
    .attr('fill', (d) => Utils.colorLayers(d))
    .attr('transform', (d) => {
      const centroid = thisMapPath.centroid(d),
        x = centroid[0],
        y = centroid[1];
      return (
        `translate(${x},${y})` +
        `scale(${d.properties.joined.totalValidVotesScale || 0.6})` +
        `translate(${-x},${-y})`
      );
    })
    .attr('d', thisMapPath)
    .attr('class', (d) => `CO-${d.properties.joined.code}`)
    .on('mouseover', (d) => Utils.highlight(d))
    .on('mouseout', (d) => Utils.unHighlight(d));

  const labels = svg
    .selectAll('.feature-label')
    .data(nodes)
    .enter()
    .append('text')
    .attr('class', 'feature-label')
    .attr('transform', (d) => `translate(${thisMapPath.centroid(d)})`)
    .attr('dy', '.35em')
    .text((d) => d.properties.joined.districtAbbr);
};
