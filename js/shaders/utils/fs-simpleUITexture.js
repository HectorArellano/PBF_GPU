const fsTextureColor = `#version 300 es

    precision highp float;
    precision highp int;
    precision highp sampler2D;
    precision highp usampler2D;

    uniform usampler2D uTexture;
    uniform bool uForceAlpha;
    in vec2 uv;
    out vec4 color;

    void main() {
        uvec4 data = texture(uTexture, uv);
        color = vec4(data);
        if(uForceAlpha) color.a = 1.;
    }

`;

export {fsTextureColor}