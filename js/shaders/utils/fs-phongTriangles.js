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
    //colorData = vec4( 1.0 );
}

`;

export {fsPhongTriangles}