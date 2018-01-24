const splitChannels = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uDataTexture;
uniform vec3 u3D_h;
uniform vec3 u3D_l;
uniform float uDepth;


in vec2 uv;
out vec4 colorData;

void main(void) {

    //Obtain the 3D position of the corresponding fragment in the expanded texture
    vec2 pos = floor(uv / u3D_h.x);
    vec3 pos3D = vec3(mod(pos.y, u3D_h.y), u3D_h.z * floor(pos.y / u3D_h.y) + floor(pos.x / u3D_h.y), mod(pos.x, u3D_h.y));

    //Define the depth range for the corresponding fragment.
    float zLevel = floor(pos3D.y / uDepth);
    vec2 uv  = u3D_l.x * (pos3D.zx + u3D_l.y * vec2(mod(pos3D.y, u3D_l.z), floor(pos3D.y / u3D_l.z)) + vec2(0.5));
    uv.y = fract(uv.y);

    //Set the value of the fragment based on the depth and the corresponding channel.
    colorData = vec4(dot(texture(uDataTexture, uv), vec4(equal(vec4(zLevel), vec4(0., 1., 2., 3.)))));
}

`;

export {splitChannels}