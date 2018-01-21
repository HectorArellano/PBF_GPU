const blur2D = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uDT;
uniform vec2 uAxis;
uniform float uSteps;

in vec2 uv;
out vec4 colorData;
const float uSR = 2.;

void main(void) {

    vec4 blend = vec4(0.);
    for (float i = 0.; i <= 2. * uSteps; i += 1.) {
        float j = i - uSteps;
        float k = j == 0. ? uSR : 1.;
        blend += k * texture(uDT, uv + j * uAxis.xy);
    }
    blend /= (2. * uSteps + uSR);

    colorData = blend;
}
`;

export {blur2D}


