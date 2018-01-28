const predictPositions = `#version 300 es

precision highp sampler2D;
precision highp float;

uniform sampler2D uTexturePosition;
uniform sampler2D uTextureVelocity;
uniform float uDeltaTime;
uniform vec3 uAcceleration;

out vec4 colorData;

void main() {

    int tSize = textureSize(uTexturePosition, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;
    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;
    
    vec3 position = texture(uTexturePosition, index).rgb;
    vec3 center = vec3(128. * 0.5);
    float radius = 128. * 0.4;
    vec3 normal = position - center;
    float n = length(normal);
    float distance = n -  radius;
    vec3 acceleration = vec3(0., -10., 0.);
    if(distance > 0. && distance < 0.1 && position.y < 80.) {
        acceleration = uAcceleration;
    }

    colorData = vec4(position + (texture(uTextureVelocity, index).rgb + acceleration * uDeltaTime) * uDeltaTime, 1.);
}

`;

export {predictPositions}
