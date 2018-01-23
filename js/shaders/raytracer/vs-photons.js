const vsPhotons = `#version 300 es

uniform sampler2D uPositions;
uniform sampler2D uColors;
uniform float uSize;

out vec4 colorData;

void main(void) {

    int tSize = textureSize(uPositions, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;

    colorData = texture(uColors, index);
    gl_Position = texture(uPositions, index);
    gl_PointSize = uSize;

}

`;

export {vsPhotons}