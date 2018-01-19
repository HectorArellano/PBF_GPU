const calculateConstrains = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uTexturePosition;
uniform sampler2D uNeighbors;
uniform vec3 uBucketData;
uniform float uSearchRadius;
uniform float uKernelConstant;
uniform float uRelaxParameter;
uniform float uGradientKernelConstant;
uniform float uRestDensity;

out vec4 colorData;
vec3 offsets[27];
float texturePositionSize;
float h2;

void addToSum(in vec3 particlePosition, in float neighborIndex, inout float density, inout float sum_k_grad_Ci, inout vec3 grad_pi_Ci) {

    vec3 distance = particlePosition - texture(uTexturePosition, vec2(mod(neighborIndex, texturePositionSize) + 0.5, floor(neighborIndex / texturePositionSize) + 0.5) / texturePositionSize).rgb;
    float r = length(distance);

    if(r < uSearchRadius) {

        float partial = h2 - dot(distance, distance);
        density += uKernelConstant * partial * partial * partial;

        if(r > 0.) {
            partial = uSearchRadius - r;
            vec3 grad_pk_Ci = uGradientKernelConstant * partial * partial * normalize(distance) / uRestDensity;
            sum_k_grad_Ci += dot(grad_pk_Ci, grad_pk_Ci);
            grad_pi_Ci += grad_pk_Ci;
        }
    }
}

void main() {

    texturePositionSize = float(textureSize(uTexturePosition, 0).x);
    h2 = uSearchRadius * uSearchRadius;

    offsets[0] = vec3(-1., -1., -1.);
    offsets[1] = vec3(-1., -1., 0.);
    offsets[2] = vec3(-1., -1., 1.);
    offsets[3] = vec3(-1., 0., -1.);
    offsets[4] = vec3(-1., 0., 0.);
    offsets[5] = vec3(-1., 0., 1.);
    offsets[6] = vec3(-1., 1., -1.);
    offsets[7] = vec3(-1., 1., 0.);
    offsets[8] = vec3(-1., 1., 1.);
    offsets[9] = vec3(0., -1., -1.);
    offsets[10] = vec3(0., -1., 0.);
    offsets[11] = vec3(0., -1., 1.);
    offsets[12] = vec3(0., 0., -1.);
    offsets[13] = vec3(0., 0., 0.);
    offsets[14] = vec3(0., 0., 1.);
    offsets[15] = vec3(0., 1., -1.);
    offsets[16] = vec3(0., 1., 0.);
    offsets[17] = vec3(0., 1., 1.);
    offsets[18] = vec3(1., -1., -1.);
    offsets[19] = vec3(1., -1., 0.);
    offsets[20] = vec3(1., -1., 1.);
    offsets[21] = vec3(1., 0., -1.);
    offsets[22] = vec3(1., 0., 0.);
    offsets[23] = vec3(1., 0., 1.);
    offsets[24] = vec3(1., 1., -1.);
    offsets[25] = vec3(1., 1., 0.);
    offsets[26] = vec3(1., 1., 1.);

    int tSize = textureSize(uTexturePosition, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;
    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;

    //Particle position goes from [0 - 128);
    vec3 particlePosition = texture(uTexturePosition, index).rgb;
    vec3 gridPosition = floor(particlePosition);

    float density = 0.;
    float densityConstrain = 0.;
    float lambdaPressure = 0.;
    float sum_k_grad_Ci = 0.;
    vec3 grad_pi_Ci = vec3(0.);

    for(int i = 0; i < 27; i ++) {

        vec3 neighborsVoxel = gridPosition + offsets[i];
        vec2 voxelsIndex =  (neighborsVoxel.zy + uBucketData.y * vec2(mod(neighborsVoxel.x, uBucketData.z), floor(neighborsVoxel.x / uBucketData.z)) + vec2(0.5)) / uBucketData.x;
        //float gridIndex = dot(neighborsVoxel, vec3(1., uBucketData.y, uBucketData.y * uBucketData.y));
        //vec2 voxelsIndex = (vec2(mod(gridIndex, uBucketData.x), floor(gridIndex / uBucketData.x)) + vec2(0.5)) / uBucketData.x;
        vec4 neighbors = texture(uNeighbors, voxelsIndex);

        if(neighbors.r > 0.) addToSum(particlePosition, neighbors.r, density, sum_k_grad_Ci, grad_pi_Ci);
        if(neighbors.g > 0.) addToSum(particlePosition, neighbors.g, density, sum_k_grad_Ci, grad_pi_Ci);
        if(neighbors.b > 0.) addToSum(particlePosition, neighbors.b, density, sum_k_grad_Ci, grad_pi_Ci);
        if(neighbors.a > 0.) addToSum(particlePosition, neighbors.a, density, sum_k_grad_Ci, grad_pi_Ci);
    }

    densityConstrain = density / uRestDensity - 1.;

    sum_k_grad_Ci += dot(grad_pi_Ci, grad_pi_Ci);

    lambdaPressure = -densityConstrain / (sum_k_grad_Ci + uRelaxParameter);

    colorData = vec4(lambdaPressure, densityConstrain, density, 1.);
}
`;

export {calculateConstrains}