const vsFloorShadows = `#version 300 es

uniform float uScaler;

out vec3 vNor;
out vec3 vPos;
out vec2 vText;

void main(void) {
    float vI = float(gl_VertexID) + 1.;
    vec2 xy = vec2(mod(vI, 2.) == 0. ? -1. : 1., -1. + 2. * step(-vI, -2.1));
    vec2 position = xy;
    vText = 0.5 * xy + 0.5;
    xy = uScaler * (0.5 * xy + 0.5) - floor(uScaler * 0.5);
    vPos = vec3(xy.x, 0., xy.y);
    vNor = vec3(0., 1., 0.);
    gl_Position = vec4(position, 0., 1.);
}

`;

export {vsFloorShadows}
