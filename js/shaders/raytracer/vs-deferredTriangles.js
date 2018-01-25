const vsDeferredTriangles = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;
uniform highp sampler2D uTT;
uniform highp sampler2D uTN;

out vec3 position;
out vec3 normal;

void main(void) {

    int tSize = textureSize(uTT, 0).x;
    float textureSize = float(tSize);
    vec2 uv = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;
    
    position = texture(uTT, uv).rgb;
    normal = texture(uTN, uv).rgb;
    
    gl_Position = uPMatrix * uCameraMatrix * vec4(position, 1.0);
    
}

`;

export {vsDeferredTriangles}