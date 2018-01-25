const fsPhongTriangles = `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 uv;
out vec4 colorData;

uniform sampler2D uTT;

uniform vec3 uEye;

in vec3 color;


void main() {

    colorData = vec4(color, 1.);
}

`;

export {fsPhongTriangles}