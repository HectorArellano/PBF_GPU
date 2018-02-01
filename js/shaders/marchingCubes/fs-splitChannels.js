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
    return ivec4((data >> 24) & 255, (data >> 16) & 255, (data >> 8) & 255, data & 255);
}

void main(void) {

    //Obtain the 3D position of the corresponding fragment in the expanded texture
    vec2 pos = floor(uv / u3D_h.x);
    vec3 pos3D = vec3(mod(pos.y, u3D_h.y), u3D_h.z * floor(pos.y / u3D_h.y) + floor(pos.x / u3D_h.y), mod(pos.x, u3D_h.y));

    //Define the depth range for the corresponding fragment.
    float zLevel = floor(pos3D.y / uDepth);
    vec2 uv  = u3D_l.x * (pos3D.xz + u3D_l.y * vec2(mod(pos3D.y, u3D_l.z), floor(pos3D.y / u3D_l.z)) + vec2(0.5));
    uv.y = fract(uv.y);
    
    ivec4 data = ivec4(texture(uDataTexture, uv));
    ivec4 d1 = intToRGBA(data.r);
    ivec4 d2 = intToRGBA(data.g);
    ivec4 d3 = intToRGBA(data.b);
    ivec4 d4 = intToRGBA(data.a);
    vec4 potential = vec4(d1.a, d2.a, d3.a, d4.a) / 255.;
    vec4 mask = vec4(equal(vec4(zLevel), vec4(0., 1., 2., 3.)));
        
    //Set the value of the fragment based on the depth and the corresponding channel.
    colorData = vec4(dot(potential, mask));
}

`;

export {splitChannels}