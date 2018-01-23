const fsBlurShadows = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uShadows;
uniform float uRadius;
uniform vec2 uAxis;

in vec2 uv;

const float e = 2.7182818284;
const float alpha = 1.;
const float beta = 1.;
const float PI = 3.141592653;

out vec4 colorData;

void main(void) {

    vec4 data = texture(uShadows, uv);

    float shadows = 0.;
    float r = (uRadius + .5) * max(data.g * 3., 1.);
    float r2 = r * r;

    if(uRadius > 0.) {
        for(float i = 0.; i <= r;i ++)  {
            if(i == 0.) shadows += alpha * (1. - (1. - pow(e, - 0.5 * beta * i * i / r2)) / (1. - pow(e, -beta))) * data.r;
            else shadows += alpha * (1. - (1. - pow(e, - 0.5 * beta * i * i / r2)) / (1. - pow(e, -beta))) * (texture(uShadows, uv + i * uAxis).r + texture(uShadows, uv - i * uAxis).r);
        }
        shadows /= sqrt(PI * r2);
    }

    else shadows = data.r;
    colorData = vec4(shadows, data.gba);
}

`;

export {fsBlurShadows}