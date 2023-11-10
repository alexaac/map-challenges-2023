// https://github.com/maplibre/maplibre-gl-js/blob/main/src/shaders/fill_extrusion.vertex.glsl
const audioVertexShader = `
  varying vec2 vUv;

  void main() {

    vUv = uv;

    gl_Position = vec4( position, 1.0 );

  }

`;

export default audioVertexShader;
