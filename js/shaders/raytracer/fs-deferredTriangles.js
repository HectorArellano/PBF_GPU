const fsDeferredTriangles = `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 uv;

uniform sampler2D uTT;
uniform sampler2D uTN;

layout(location = 0) out vec4 trianglesPositions;
layout(location = 1) out vec4 trianglesNormals;

void main() {

    trianglesPositions = texture(uTT, uv);
    trianglesNormals = texture(uTN, uv);
    
}

`;

export {fsDeferredTriangles}