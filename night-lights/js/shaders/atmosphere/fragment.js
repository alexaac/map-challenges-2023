const atmosphereFragmentShader = `
  uniform vec3 glowColor;

  varying vec3 vNormal;

  void main() {
    float intensity = pow( 0.7 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) ), 4.0 ); 


    gl_FragColor = vec4( glowColor, 1.0 ) * intensity;
  }

`;

export default atmosphereFragmentShader;
