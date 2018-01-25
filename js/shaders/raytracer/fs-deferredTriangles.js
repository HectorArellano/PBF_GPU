const fsDeferredTriangles = `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 uv;

uniform sampler2D uTT;
uniform sampler2D uTN;

in vec3 position;
in vec3 normal;

layout(location = 0) out vec4 trianglesPositions;
layout(location = 1) out vec4 trianglesNormals;

void main() {

    trianglesPositions = vec4(position, 1.);
    trianglesNormals = vec4(normal, 1.);
    
}

`;

export {fsDeferredTriangles}