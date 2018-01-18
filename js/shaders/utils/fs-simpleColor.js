const fsColor = `#version 300 es
    precision highp float;

    in vec4 colorData;
    out vec4 color;

    void main() {
        color = colorData;
    }
`;

export {fsColor};