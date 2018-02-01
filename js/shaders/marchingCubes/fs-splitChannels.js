const splitChannels = `#version 300 es

precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;

uniform usampler2D uDataTexture;
uniform vec3 u3D_h;
uniform vec3 u3D_l;
uniform float uDepth;


in vec2 uv;
out vec4 colorData;

ivec4 intToRGBA(int data) {
    return ivec4((data >> 24) & 255, (data >> 16) & 255, (data >> 8) & 255, (data >> 0) & 255);
}

void main(void) {

    //Obtain the 3D position of the corresponding fragment in the expanded texture
    vec2 pos = floor(uv / u3D_h.x);
    vec3 pos3D = vec3(mod(pos.y, u3D_h.y), u3D_h.z * floor(pos.y / u3D_h.y) + floor(pos.x / u3D_h.y), mod(pos.x, u3D_h.y));

    //Define the depth range for the corresponding fragment.
    float zLevel = floor(pos3D.y / uDepth);
    vec2 uv  = u3D_l.x * (pos3D.zx + u3D_l.y * vec2(mod(pos3D.y, u3D_l.z), floor(pos3D.y / u3D_l.z)) + vec2(0.5));
    uv.y = fract(uv.y);
    
    ivec4 data = ivec4(texture(uDataTexture, uv));
    vec4 d1 = vec4(intToRGBA(data.r)).argb / 255.;
    vec4 d2 = vec4(intToRGBA(data.g)).argb / 255.;
    vec4 d3 = vec4(intToRGBA(data.b)).argb / 255.;
    vec4 d4 = vec4(intToRGBA(data.a)).argb / 255.;
    vec4 mask = vec4(equal(vec4(zLevel), vec4(0., 1., 2., 3.)));
        
    //Set the value of the fragment based on the depth and the corresponding channel.
    colorData = d1 * mask.x + d2 * mask.y + d3 * mask.z + d4 * mask.w;
}

`;

export {splitChannels}