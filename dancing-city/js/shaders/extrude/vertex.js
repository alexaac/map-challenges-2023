// https://github.com/maplibre/maplibre-gl-js/blob/main/src/shaders/fill_extrusion.vertex.glsl
const extrudeVertexShader = `
uniform mat4 u_matrix;

uniform sampler2D t_audio_data;
uniform float t_audio_freq;

uniform vec3 u_reverse_light_direction;
uniform vec3 u_material_diffuse;
uniform vec3 u_light_diffuse;
uniform vec3 u_color_a;
uniform vec3 u_color_b;
uniform vec3 u_interpolated_color;
uniform float u_opacity;
uniform float u_time;

attribute vec4 a_vertex_position;
attribute lowp vec2 a_vertex_base;
attribute lowp vec2 a_vertex_height;

varying vec3 v_color;
varying vec4 v_pos;

void main() {
     
  vec3 pos_nx = floor(a_vertex_position.xyz * 0.5);
  mediump vec3 top_up_ny = a_vertex_position.xyz - 2.0 * pos_nx;
  float t = top_up_ny.x;
  vec3 normal = top_up_ny.xyz;
  
  float base = max(0.0, a_vertex_base.x);
  float height = max(0.0, a_vertex_height.x);
  float z = t > 0.0 ? height + u_time * height/5.0 : base;

  vec4 pos = vec4(pos_nx.xy, z, 1.0);
  pos.y += u_time * 10.0;

  v_pos = pos;
  
  gl_Position = u_matrix * pos;
  
  // Colors
  // unit vector
  vec3 normal2 = normalize(normal);
  float light = dot(normal2, u_reverse_light_direction);

  float pct = u_time;
  float f = texture2D( t_audio_data, vec2( pos.x, 0.0 ) ).r;
  float i = step( pos.y, f ) * step( f - 0.0125, pos.y );
  
  // Mix uses pct (a value from 0-1) to
  // mix the two colors
  vec3 color = mix(u_color_a, u_color_b, pct);
  // vec3 color = mix( u_color_a, u_color_b, i );

  v_color = color;

  // Adjust directional so that
  // the range of values for highlight/shading is narrower
  // with lower light intensity
  // and with lighter/brighter surface colors
lowp float u_lightintensity = 1.0;
  // Relative luminance (how dark/bright is the surface color?)
  float colorvalue = u_material_diffuse.r * 0.2126 + u_material_diffuse.g * 0.7152 + u_material_diffuse.b * 0.0722;
  light = mix((1.0 - u_lightintensity), max((1.0 - colorvalue + u_lightintensity), 1.0), light);

  // Lets multiply just the color portion (not the alpha)
  // by the light
  v_color.r *= clamp(u_material_diffuse.r * light * u_light_diffuse.r, mix(0.0, 0.3, 1.0 - u_light_diffuse.r), 1.0);
  v_color.g *= clamp(u_material_diffuse.g * light * u_light_diffuse.g, mix(0.0, 0.3, 1.0 - u_light_diffuse.g), 1.0);
  v_color.b *= clamp(u_material_diffuse.b * light * u_light_diffuse.b, mix(0.0, 0.3, 1.0 - u_light_diffuse.b), 1.0);

}

`;

export default extrudeVertexShader;
