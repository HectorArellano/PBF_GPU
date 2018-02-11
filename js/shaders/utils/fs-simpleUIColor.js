const fsUIColor = `#version 300 es
    precision highp float;

    flat in uvec4 colorData;
    out uvec4 color;

    void main() {
        color = colorData;
    }
`;

export {fsUIColor};