const marchCase = `#version 300 es

precision mediump float;
precision mediump sampler2D;

//Texture container the potential values in the corners of the voxels.
uniform sampler2D uCornersTexture;

//Texture holding the numbers of triangles to generate on each of the 256 cases from the MC
uniform sampler2D uTrianglesIndex;

//Iso level used to define the surface required from the potential.
uniform float uRange;

//Constants used to simulate the 3D texture in a 2D texture
uniform vec3 u3D;

in vec2 uv;
out vec4 colorData;

//Function used to evaluate the 2D index from a 3D position.
vec2 index2D(vec3 pos) {
    return u3D.x * (pos.xz + u3D.y * vec2(mod(pos.y, u3D.z), floor(pos.y / u3D.z)) + vec2(0.5));
}
void main(void) {

    //Obtain the 3D voxel position of the corresponding fragment to evaluate.
    vec2 position = floor(uv / u3D.x);
    vec3 pos3D = vec3(mod(position.y, u3D.y), u3D.z * floor(position.y / u3D.y) + floor(position.x / u3D.y), mod(position.x, u3D.y));

    //The MC case to use in the voxel evaluated is calculated as the sum of corners that are below the iso level required.
    float c = step(texture(uCornersTexture, index2D(pos3D)).r, uRange)
            + 2. *   step(  texture(uCornersTexture, index2D(pos3D + vec3(1., 0., 0.))).r, uRange)
            + 4. *   step(  texture(uCornersTexture, index2D(pos3D + vec3(1., 1., 0.))).r, uRange)
            + 8. *   step(  texture(uCornersTexture, index2D(pos3D + vec3(0., 1., 0.))).r, uRange)
            + 16. *  step(  texture(uCornersTexture, index2D(pos3D + vec3(0., 0., 1.))).r, uRange)
            + 32. *  step(  texture(uCornersTexture, index2D(pos3D + vec3(1., 0., 1.))).r, uRange)
            + 64. *  step(  texture(uCornersTexture, index2D(pos3D + vec3(1., 1., 1.))).r, uRange)
            + 128. * step(  texture(uCornersTexture, index2D(pos3D + vec3(0., 1., 1.))).r, uRange);
    c *= step(c, 254.);

    //The total triangles to generate are obtained knowing which one of the 256 cases is required and reading the
    //amount triangles from the 16x16 texture provided.
    float totalTrianglesToGenerate = texture(uTrianglesIndex, vec2(mod(c, 16.), floor(c / 16.)) / 16.).r;

    //The resulting fragment saves the amount of triangles to generate and the MC case obtained.
    colorData = vec4(vec3(totalTrianglesToGenerate * 3.), c);
}
`;

export {marchCase}