const generatePyramid = `#version 300 es

precision mediump float;
precision mediump sampler2D;
uniform sampler2D uPyT;
uniform float uSize;
in vec2 uv;
out vec4 colorData;
void main(void) {
    float k = 0.5 * uSize;
    vec2 position = floor(uv / uSize) * uSize;

    float a = texture(uPyT,  position + vec2(0., 0.)).r;
    float b = texture(uPyT,  position + vec2(k, 0.)).r;
    float c = texture(uPyT,  position + vec2(0., k)).r;
    float d = texture(uPyT,  position + vec2(k, k)).r;

    colorData.a = a;
    colorData.b = a + b;
    colorData.g = a + b + c;
    colorData.r = a + b + c + d;

}

`;

export {generatePyramid}