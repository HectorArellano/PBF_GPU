const fsFloorShader = `#version 300 es

precision highp sampler2D;
precision highp float;

uniform float uBg;

in vec2 uv;
out vec4 colorData;

mat3 rotY(float g) {
    g = radians(g);
    vec2 a = vec2(cos(g), sin(g));
    return mat3(a.x, 0.0, a.y,
                0.0, 1.0, 0.0,
                -a.y, 0.0, a.x);
}

void main(void) {

    vec3 color = vec3(1.);

   //Lines for the grid
   // color *= clamp(step(mod(uv.x, .1), 0.095) * step(mod(uv.y, .1), 0.095), 0.5, 1.);
   // color *= clamp(step(mod(uv.x, 1.), 0.985) * step(mod(uv.y, 1.), 0.985), 0.3, 1.);


//    color = mix(color, vec3(0.), vec3(step(mod(uv.x - 0.07, .5), 0.25)));


    colorData = vec4(color, 1.);

}
`;

export {fsFloorShader}