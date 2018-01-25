const getCorners = `#version 300 es

precision highp float;
precision highp sampler2D;
uniform sampler2D uDataTexture;
uniform vec3 u3D;
uniform float uDepth;

vec3 data[7];

in vec2 uv;
out vec4 colorData;

vec2 index2D(vec3 pos) {
    return u3D.x * (pos.xz + u3D.y * vec2(mod(pos.y, u3D.z), floor(pos.y / u3D.z)) + vec2(0.5));
}

void main(void) {
    vec2 pos = floor(uv / u3D.x);
    vec3 pos3D = vec3(mod(pos.y, u3D.y), u3D.z * floor(pos.y / u3D.y) + floor(pos.x / u3D.y), mod(pos.x, u3D.y));

    data[0] = vec3(-1., -1., -1.);
    data[1] = vec3(0., -1., -1.);
    data[2] = vec3(0., 0., -1.);
    data[3] = vec3(-1., 0., -1);
    data[4] = vec3(-1., -1., 0.);
    data[5] = vec3(0., -1., 0.);
    data[6] = vec3(-1., 0., 0.);

    float currentZLevel = floor(pos3D.y / uDepth);
    vec2 uv  = index2D(pos3D);
    uv.y = fract(uv.y);
    vec4 corner = texture(uDataTexture, uv);

    vec3 newPos3D = vec3(0.);
    float zLevel = 0.;

    for(int i = 0; i < 7; i ++) {

        newPos3D = pos3D + data[i];
        zLevel = floor(newPos3D.y / uDepth);
        uv = index2D(newPos3D);
        uv.y = fract(uv.y);

        vec4 newBucket = texture(uDataTexture, uv);
        vec3 cases = vec3(bvec3(zLevel < currentZLevel, zLevel == currentZLevel, zLevel > currentZLevel));
        corner += vec4(0., newBucket.rgb) * cases.x + newBucket * cases.y + vec4(newBucket.gba, 0.) * cases.z;

    }

    colorData = vec4(corner * 0.125);
}

`;

export {getCorners}