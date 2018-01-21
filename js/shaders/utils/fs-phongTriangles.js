const fsPhongTriangles = `#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 uv;
out vec4 color;

uniform sampler2D uTT;
uniform sampler2D uTN;
uniform vec3 uEye;


void main() {

    vec3 position = texture(uTT, uv).rgb;
    vec3 normal = texture(uTN, uv).rgb;
    
    vec3 eye = normalize(position - uEye);
    vec3 lightVector = vec3(0., 100., 0.) - position;
    vec3 light = normalize(lightVector);
    
    float specular = pow(max(dot(normalize(reflect(light, normal)), -eye), 0.), 3.);
    float diffuse = abs(dot(light, normal));
    
    color = vec4(0.1 * specular * vec3(1.) + 0.9 * diffuse * vec3(1.), 1.);
}

`;

export {fsPhongTriangles}