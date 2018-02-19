const fsDeferredTriangles = `#version 300 es

precision highp float;
precision highp sampler2D;

in vec3 position;
in vec3 normal;
in vec3 color;

layout(location = 0) out vec4 trianglesPositions;
layout(location = 1) out vec4 trianglesNormals;
layout(location = 2) out vec4 trianglesColors;

void main() {

    trianglesPositions = vec4(position, 1.);
    trianglesNormals = vec4(normal, 1.);
    trianglesColors = vec4(color, 1.);
    
}

`;

export {fsDeferredTriangles}