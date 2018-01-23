const fsBoundingBox = `#version 300 es

precision highp float;
precision highp sampler2D;
uniform sampler2D uPyT;
uniform float uSize;
in vec2 uv;

out vec4 colorData;

void main(void) {

    float k = 0.5 * uSize;
    vec2 position = floor(vec2(gl_FragCoord.x, gl_FragCoord.y)) * uSize;

    vec4 data0 = texture(uPyT,  position + vec2(0., 0.));
    vec4 data1 = texture(uPyT,  position + vec2(0., k));
    vec4 data2 = texture(uPyT,  position + vec2(k, 0.));
    vec4 data3 = texture(uPyT,  position + vec2(k, k));

    colorData = vec4(min(min(data0.rg, data1.rg), min(data2.rg, data3.rg)), max(max(data0.ba, data1.ba), max(data2.ba, data3.ba)));
}
`;

export {fsBoundingBox}