const blur2D = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uDT;
uniform vec2 uAxis;
uniform int uSteps;
uniform vec3 u3D;

in vec2 uv;
out vec4 colorData;


void main(void) {

    float border = .1;
    
    vec4 blend = vec4(0.);
    float sum = 1.;
    float m = 1.;
    float n = float(uSteps);
    for (int i = 0; i < 2 * uSteps; i += 1) {
        float k = float(i);
        float j = float(i) - 0.5 * float(uSteps);
        blend +=  m * texture(uDT, uv + j * uAxis.xy);
        m *= (n - k) / (k + 1.);
        sum += m;
    } 
    blend /= sum;
    
    //This avoids to spread information between the different buckets.
    vec2 pos = floor(uv / u3D.x);
    blend *= float(mod(pos.x, u3D.y) > border && mod(pos.y, u3D.y) > border && mod(pos.x, u3D.y) < u3D.y - 1. - border && mod(pos.y, u3D.y) < u3D.y - 1. - border);


    colorData = blend;
}
`;

export {blur2D}

