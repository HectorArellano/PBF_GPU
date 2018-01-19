const predictPositions = `#version 300 es

precision highp sampler2D;
precision highp float;

uniform sampler2D uTexturePosition;
uniform sampler2D uTextureVelocity;
uniform float uDeltaTime;
uniform vec3 uAcceleration;

out vec4 colorData;

void main() {

    int tSize = textureSize(uTexturePosition, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;
    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;

    colorData = vec4(texture(uTexturePosition, index).rgb + (texture(uTextureVelocity, index).rgb + uAcceleration * uDeltaTime) * uDeltaTime, 1.);
}

`;

export {predictPositions}
