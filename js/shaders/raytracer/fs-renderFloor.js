const fsRenderFloor = `#version 300 es

 precision highp sampler2D;
 precision highp float;

 uniform float uBg;
 uniform vec4 uLightData;

 uniform sampler2D uFloor;
 uniform sampler2D uShadows;
 uniform sampler2D uRadiance;
 uniform float uScaleShadow;
 uniform float uShadowIntensity;
 uniform vec3 uLightColor;

 in vec3 vNor;
 in vec3 vPos;
 in vec2 uv;
 out vec4 colorData;

const vec3 yVector = vec3(0., 1., 0.);

 mat3 rotY(float g) {
    g = radians(g);
    vec2 a = vec2(cos(g), sin(g));
    return mat3(a.x, 0.0, a.y,
                0.0, 1.0, 0.0,
                -a.y, 0.0, a.x);
 }

 vec3 lightShade(vec3 matColor, vec3 light) {
      return max(dot(light, yVector), 0.) * (matColor * uLightColor);
 }


 void main(void) {
     vec2 index = (rotY(-0.) * vPos).xz;
     vec3 color = texture(uFloor, index).rgb;
     vec3 lightVector = uLightData.rgb - vPos;
     color = lightShade(color, normalize(lightVector));
     color *= uLightData.a / pow(length(lightVector), 2.);
     color += pow(vec3(uBg), vec3(2.2));

     vec2 uv = clamp((vPos.xz - vec2(0.5)) / uScaleShadow + vec2(0.5), vec2(0.), vec2(1.));

    if(all(greaterThan(uv, vec2(0.))) && all(lessThan(uv, vec2(1.)))) {
         //Shadows
         color *= clamp(1. - texture(uShadows, uv).r, 1.- uShadowIntensity, 1.);
         //Caustics
         color += pow(texture(uRadiance, uv).rgb, vec3(2.2));
    }

     colorData = vec4(pow(color, vec3(0.4545)), 1.);
 }
`;

export {fsRenderFloor}