const vsRenderFloor = `#version 300 es

uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;
uniform float uScaler;

out vec3 vNor;
out vec3 vPos;
out vec2 uv;

void main(void) {
    float vI = float(gl_VertexID) + 1.;
    vec2 xy = vec2(mod(vI, 2.) == 0. ? -1. : 1., -1. + 2. * step(-vI, -2.1));
    uv = 0.5 * xy + 0.5;
    xy *= uScaler;
    xy = 0.5 * xy + 0.5;
    vPos = vec3(xy.x, 0.0, xy.y);
    vNor = vec3(0., 1., 0.);
    gl_Position = uPMatrix * uCameraMatrix * vec4(vPos + vec3(0., 0.0, 0.), 1.);
}
`;

export {vsRenderFloor}