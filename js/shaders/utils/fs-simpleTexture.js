const fsTextureColor = `#version 300 es

    precision highp float;
    precision highp sampler2D;

    uniform sampler2D uTexture;
    in vec2 uv;
    out vec4 color;

    void main() {
        color = vec4(texture(uTexture, uv).rgb, 1.);
    }

`;

export {fsTextureColor}