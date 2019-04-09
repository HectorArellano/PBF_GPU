const fsPBR = `#version 300 es

precision highp float;
precision highp sampler2D;

out vec4 fragColor;
in vec2 uv;
in vec3 position;
in vec3 normal;

uniform vec3 camPos;
uniform vec3 albedo;
uniform float metallic;
uniform float roughness;
uniform float ao;

vec3 lightPositions[6];
vec3 lightColors[6];

const float PI = 3.14159265359;


vec3 fresnelSchlick(float cosAngle, vec3 F0) {
    return F0 + pow(1. - cosAngle, 5.) * (vec3(1.) - F0);
}


float distributionGGX(vec3 N, vec3 H, float a2) {
    float NdotH = max(dot(N, H), 0.);
    float NdotH2 = NdotH * NdotH;
    float denom = NdotH2 * (a2 - 1.) + 1.;
    return a2 / (PI * denom * denom);
}


float geometrySchlickGGX(float NdotV, float roughness) {
    float r = roughness + 1.;
    float k = r * r / 8.;
    return NdotV / (NdotV * (1. - k ) + k);
}


float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float a2 = pow(roughness, 4.);
    float NdotV = max(dot(N, V), 0.);
    float NdotL = max(dot(N, L), 0.);
    float ggx1 = geometrySchlickGGX(NdotV, a2);
    float ggx2 = geometrySchlickGGX(NdotL, a2);
    return ggx1 * ggx2;
}


void main() {

    lightPositions[0] = vec3(.5, 1.3, 0.5);
    lightPositions[1] = vec3(.5, -1.3, 0.5);
    lightPositions[2] = vec3(1.3, 0.5, 0.5);
    lightPositions[3] = vec3(-1.3, 0.5, 0.5);
    lightPositions[4] = vec3(.5, 0.5, 1.3);
    lightPositions[5] = vec3(.5, 0.5, -1.3);

    lightColors[1] = vec3(.6);
    lightColors[2] = vec3(.6);
    lightColors[3] = vec3(.6);
    lightColors[0] = vec3(.6);
    lightColors[4] = vec3(.6);
    lightColors[5] = vec3(.6);

    vec3 N = normalize(normal);
    vec3 V = normalize(camPos - position);

    vec3 Lo = vec3(0.);

    for(int i = 0; i < 2; i ++) {

        vec3 L = normalize(lightPositions[i] - position);
        vec3 H = normalize(V + L);

        float distance = length(L);
        float attenuation = 1. / (distance * distance);
        vec3 radiance = lightColors[i] * attenuation;

        vec3 F0 = vec3(0.04);
        F0 = mix(F0, albedo, metallic);
        vec3 F = fresnelSchlick(max(dot(H, V), 0.), F0);
        float NDF = distributionGGX(N, H, roughness);
        float G = geometrySmith(N, V, L, roughness);

        vec3 specular = NDF * G * F / (4. * max(dot(N, V), 0.) * max(dot(N, L), 0.));

        vec3 kS = F;
        kS = vec3(0.8);
        vec3 kD = vec3(1.) - kS;
        kD *= 1. - metallic;

        Lo += (kD * albedo / PI + specular) * radiance * max(dot(N, L), 0.);

    }

    vec3 ambient = vec3(0.03) * albedo * ao;

    vec3 color = ambient + Lo;
    color = color / (color + vec3(1.));
    color = pow(color, vec3(1. / 2.2));

    fragColor = vec4(color, 1.);

}

`;

export {fsPBR}