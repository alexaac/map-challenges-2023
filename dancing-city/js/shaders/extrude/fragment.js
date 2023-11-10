const extrudeFragmentShader = `
precision mediump float;

varying vec3 v_color;

void main() {

  float zbuffer = (gl_FragCoord.a + 1.0) * 0.6;
  gl_FragColor = vec4(v_color, zbuffer);

  if(gl_FragColor.a < 0.5)
  discard;
}
  
`;

export default extrudeFragmentShader;
