const vsPhongTriangles = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;
uniform highp sampler2D uTT;
uniform highp sampler2D uTN;
uniform highp sampler2D uColors;


out vec2 uv;
out vec3 color;

void main(void) {

    int tSize = textureSize(uTT, 0).x;
    float textureSize = float(tSize);
    uv = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;
    
    vec3 col = texture(uColors, uv).rgb;
    vec3 n = texture(uTN, uv).rgb;
    
    vec3 position = texture(uTT, uv).rgb;
    vec3 lightPosition = vec3(0., 3., 0.);
    vec3 lightVector = lightPosition - position;
    lightVector = normalize(lightVector);
    
    color =  0.5 * col * abs(dot(lightVector, n)) + 0.5 * col;
    gl_Position = uPMatrix * uCameraMatrix * vec4(position, 1.0);
}

`;

export {vsPhongTriangles}