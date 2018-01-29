const vsBrick = `#version 300 es

precision highp float;

uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;
uniform float uScale;
uniform sampler2D uTexturePosition;

in vec3 vertex;
in vec3 normal;
out vec3 normalOut;
out vec3 position;
out float density;

void main(void) {

    int tSize = textureSize(uTexturePosition, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_InstanceID % tSize) + 0.5, (floor(float(gl_InstanceID) / textureSize)) + 0.5) / textureSize;

    vec4 data = texture(uTexturePosition, index);
    position = data.rgb;
    density = data.a;
    normalOut = normal;

    vec3 pos = (1. / (2.1 *  uScale )) * vertex + floor(texture(uTexturePosition, index).rgb) / uScale;

    gl_Position = uPMatrix * uCameraMatrix * vec4(pos, 1.0);
}

`;

export {vsBrick}