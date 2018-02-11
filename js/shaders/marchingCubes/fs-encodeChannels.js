const encodeChannels = `#version 300 es

precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D uDataTexture;
uniform sampler2D uColors;
uniform vec3 u3D_h;
uniform vec3 u3D_l;
uniform float uDepth;


in vec2 uv;
out uvec4 colorData;


uint encodeChannel(in vec3 pos) {
    vec3 pos3D = floor(pos);
    vec2 index2D  = (pos3D.zx + u3D_h.y * vec2(mod(pos3D.y, u3D_h.z), floor(pos3D.y / u3D_h.z)) + vec2(0.5)) / u3D_h.x;
    float potential = texture(uDataTexture, index2D).a;
    potential = clamp(potential, 0., 1.);
    vec4 color = texture(uColors, index2D);
    color.rgb /= max(color.a, 1.);
    ivec4 data = clamp(ivec4(255. * color.rgb, 255. * potential), ivec4(0), ivec4(255));
    return uint((data.r & 255) << 24 | (data.g & 255) << 16 | (data.b & 255) << 8 | (data.a & 255) << 0); 
}

void main(void) {

    //Obtain the 3D position of the corresponding fragment in the expanded texture
    vec2 pos = floor(uv * u3D_l.x);
    vec3 pos3D = vec3(mod(pos.y, u3D_l.y), u3D_l.z * floor(pos.y / u3D_l.y) + floor(pos.x / u3D_l.y), mod(pos.x, u3D_l.y));
    
    colorData = uvec4(0);
    colorData.x = encodeChannel(pos3D);
    colorData.y = encodeChannel(pos3D + vec3(0., uDepth, 0.));
    colorData.z = encodeChannel(pos3D + 2. * vec3(0., uDepth, 0.));
    colorData.w = encodeChannel(pos3D + 3. * vec3(0., uDepth, 0.));
}

`;

export {encodeChannels}