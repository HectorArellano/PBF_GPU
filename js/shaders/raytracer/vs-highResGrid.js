const vsHighResGrid = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uVoxels;

out vec4 colorData;

void main(void) {

    int tSize = textureSize(uVoxels, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;
    
    vec4 data = texture(uVoxels, index);

    colorData = vec4(vec3(float(gl_VertexID)), 1.);

    //Sets the 2D position in the scattered 3D texture, the offset is used as Z value for depth test.
    gl_Position = vec4(data.rg * 2. - vec2(1.), data.z / 16., 1.);
    gl_PointSize = 1.;
}
`;

export {vsHighResGrid}