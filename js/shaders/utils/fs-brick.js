const fsBrick = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform vec3 uEye;

out vec4 colorData;
in vec3 position;
in vec3 normalOut;
in float density;

void main() {


    vec3 eye = normalize(position - uEye);
    vec3 lightVector = vec3(0., 100., 0.) - position;
    vec3 light = normalize(lightVector);


    vec3 color = vec3(0.3, 0.3, 1.);
    if(density < .9) color = vec3(1.);
    if(density > 1.2) color *= 0.7;

    float specular = pow(max(dot(normalize(reflect(light, normalOut)), -eye), 0.), 3.);
    float diffuse = abs(dot(light, normalOut));

    colorData = vec4(0.1 * specular * vec3(1.) + 0.9 * diffuse * color + vec3(.01), 1.);
}

`;

export {fsBrick}