/*
 Shader used to position the particle inside a faked 3d texture
 the index is used as color to save it in the corresponding bucket/voxel.

 */

const vertex3D = `#version 300 es

    precision highp float;
    uniform sampler2D uTexPositions;
    uniform sampler2D uDataTexture;
    uniform vec3 uBucketData; //data is defined as: x = textureSize, y = bucketSize, z = amount of buckets per size;
    out vec4 colorData;

    void main() {

        int size = textureSize(uTexPositions, 0).x;
        float fSize = float(size);
        vec2 index = vec2(float(gl_VertexID % size), floor(float(gl_VertexID) / fSize)) / fSize;
        vec3 gridPosition = floor(texture(uTexPositions, index).rgb);

        gl_Position = vec4(2.* (gridPosition.xz + uBucketData.y * vec2(mod(gridPosition.y, uBucketData.z), floor(gridPosition.y / uBucketData.z)) + vec2(0.5)) / uBucketData.x - vec2(1.), 0., 1.0);

        colorData = vec4( 1.);
        gl_PointSize = 1.;

    }

`;

export {vertex3D};