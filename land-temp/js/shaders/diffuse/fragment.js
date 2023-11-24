const diffuseFragmentShader = `
  uniform sampler2D diffuseSourceA;
  uniform sampler2D diffuseSourceB;
  // uniform sampler2D mask;

  uniform float ratio;

  varying vec2 vUv;

  // const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );

  void main() {

  vec4 texelA = texture2D( diffuseSourceA, vUv );
  vec4 texelB = texture2D( diffuseSourceB, vUv );
  // vec4 texelM = texture2D( mask, vUv );

  gl_FragColor = mix( texelA, texelB, ratio );

  // float luma = dot( gl_FragColor.rgb, LUMA );

  // gl_FragColor.rgb = mix( gl_FragColor.rgb, mix( gl_FragColor.rgb, vec3( 0.5 * luma ), 0.95 ), texelM.r );

  }
`;

export default diffuseFragmentShader;
