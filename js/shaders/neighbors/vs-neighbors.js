/*
Shader used to position the particle inside a faked 3d texture
the index is used as color to save it in the corresponding bucket/voxel.
Up to four indexes can be saved in the corresponding fragment (one for each channel).

Layering in the faked 3d texture is done in the "Y" axis, this allows to align the gravity with that axis for fluid simulations
 */

const vsNeighbors = `#version 300 es

    precision highp float;
    uniform sampler2D uTexPositions;
    uniform vec3 uBucketData; //data is defined as: x = textureSize, y = bucketSize, z = amount of buckets per size;
    uniform float uTotalParticles;
    out vec4 colorData;

    void main() {

        int size = textureSize(uTexPositions, 0).x;
        float fSize = float(size);

        //Positions are in the range (x, y, z) => [0 - 128)
        vec3 gridPosition = floor(texture(uTexPositions, vec2(float(gl_VertexID % size) + 0.5, (floor(float(gl_VertexID) + 0.5) / fSize)) / fSize).rgb);

        //This voxel position calculation serializes the 3D position relative to the texture size, it's independent of a mayor axis
        //float gridIndex = dot(gridPosition, vec3(1., uBucketData.y, uBucketData.y * uBucketData.y));
        //vec2 voxelPosition = 2. * ((vec2(mod(gridIndex, uBucketData.x), floor(gridIndex / uBucketData.x)) + vec2(0.5)) / uBucketData.x) - vec2(1.);

        //This voxel position is relative to the mayor (depth) axis, good for visualization.
        vec2 voxelPosition =  2. * (gridPosition.zy + uBucketData.y * vec2(mod(gridPosition.x, uBucketData.z), floor(gridPosition.x / uBucketData.z)) + vec2(0.5)) / uBucketData.x - vec2(1.);

        if(gridPosition.y < 0.) voxelPosition = vec2(1e10);
        gl_Position = vec4(voxelPosition, float(gl_VertexID) / uTotalParticles, 1.0);

        colorData = vec4(floor(float(gl_VertexID)));
        gl_PointSize = 1.;

    }

`;

export {vsNeighbors};