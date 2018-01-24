const fsTextureColor = `#version 300 es

    precision highp float;
    precision highp sampler2D;

    uniform sampler2D uTexture;
    uniform bool uForceAlpha;
    in vec2 uv;
    out vec4 color;

    void main() {
        color = texture(uTexture, uv);
        if(uForceAlpha) color.a = 1.;
    }

`;

export {fsTextureColor}