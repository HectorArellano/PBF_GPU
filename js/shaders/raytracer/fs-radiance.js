const fsRadiance = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uPhotons;
uniform float uRadius;

in vec2 uv;
out vec4 colorData;

const float e = 2.7182818284;
const float alpha = 0.918;
const float beta = 1.953;
const float PI = 3.141592653;

uniform float uRadiancePower;
uniform vec2 uAxis;

void main(void) {

    float r = uRadius + .5;
    float r2 = r * r;

    vec3 radiance = vec3(0.);

    if(uRadius > 0.) {
        //Radiance estimation using a Gaussian Filter, based on: https://graphics.stanford.edu/courses/cs348b-01/course8.pdf
        for(float i = 0.; i <= r; i ++)  {
            vec4 data = texture(uPhotons, uv);
            if(i == 0.) radiance += alpha * (1. - (1. - pow(e, - 0.5 * beta * i * i / r2)) / (1. - pow(e, -beta))) * data.rgb / max(pow(data.a, uRadiancePower), 1.);
            else {
                float k = alpha * (1. - (1. - pow(e, - 0.5 * beta * i * i / r2)) / (1. - pow(e, -beta)));
                vec4 data1 = texture(uPhotons, uv + i * uAxis);
                vec4 data2 = texture(uPhotons, uv - i * uAxis);
                radiance += k * data1.rgb / max(pow(data1.a, uRadiancePower), 1.);
                radiance += k * data2.rgb / max(pow(data2.a, uRadiancePower), 1.);
            }
        }

        radiance /= sqrt(PI * r2);
    }

    else radiance = texture(uPhotons, uv).rgb;

    colorData = vec4(radiance, 1.);
}

`;

export {fsRadiance}