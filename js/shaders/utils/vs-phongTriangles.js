const vsPhongTriangles = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;
uniform highp sampler2D uTT;
uniform highp sampler2D uTN;


out vec2 uv;
out vec3 color;

void main(void) {

    int tSize = textureSize(uTT, 0).x;
    float textureSize = float(tSize);
    uv = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;
    
    color = 0.5 * texture(uTN, uv).rgb + vec3(0.5);
    gl_Position = uPMatrix * uCameraMatrix * vec4(texture(uTT, uv).rgb, 1.0);
}

`;

export {vsPhongTriangles}