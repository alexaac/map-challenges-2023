const firefliesVertexShader = `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;

  attribute float aScale;

  void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    modelPosition.y += sin(uTime + modelPosition.x * 100.0) * aScale * 0.2; 
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;

    // gl_PointSize = uSize * aScale * uPixelRatio * sin(uTime * modelPosition.x * 0.1);
    // gl_PointSize = uSize * aScale * uPixelRatio * sin(uTime + modelPosition.x * 100.0);
    // gl_PointSize = uSize * aScale * uPixelRatio * sin(modelPosition.x * 2.0 + uTime);
    gl_PointSize = uSize * aScale * uPixelRatio;
    gl_PointSize *= (1.0 / - viewPosition.z);
  }
`;

export default firefliesVertexShader;
