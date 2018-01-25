const calculateDisplacements = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uTexturePosition;
uniform sampler2D uNeighbors;
uniform sampler2D uConstrains;
uniform vec3  uBucketData;
uniform float uSearchRadius;
uniform float uRestDensity;
uniform float uGradientKernelConstant;
uniform float uTensileK;
uniform float uTensileDistance;
uniform float uTensilePower;

vec3 offsets[27];
float texturePositionSize;
float h2;

out vec4 colorData;

void addToSum(in vec3 particlePosition, in float neighborIndex, in float lambdaPressure, inout vec3 deltaPosition) {

    vec2 index = vec2(mod(neighborIndex, texturePositionSize) + 0.5, floor(neighborIndex / texturePositionSize) + 0.5) / texturePositionSize;
    vec3 distance = particlePosition - texture(uTexturePosition, index).rgb;
    float r = length(distance);

    if(r > 0. && r < uSearchRadius) {

        float n_lambdaPressure = texture(uConstrains, index).r;
        float partial = uSearchRadius - r;

        //For the lambda Correction
        float lambdaCorrection = -uTensileK * pow((h2 - r * r) / (h2 - uTensileDistance * uTensileDistance), 3. * uTensilePower);

        deltaPosition += (lambdaPressure + n_lambdaPressure + lambdaCorrection) * partial * partial * normalize(distance);
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

    float lambdaPressure = texture(uConstrains, index).x;
    vec3 particlePosition = texture(uTexturePosition, index).rgb;
    vec3 gridPosition = floor(particlePosition);
    vec3 deltaPosition = vec3(0.);

    for(int i = 0; i < 27; i ++) {

        vec3 neighborsVoxel = gridPosition + offsets[i];
        vec2 voxelsIndex =  (neighborsVoxel.zy + uBucketData.y * vec2(mod(neighborsVoxel.x, uBucketData.z), floor(neighborsVoxel.x / uBucketData.z)) + vec2(0.5)) / uBucketData.x;
        //float gridIndex = dot(neighborsVoxel, vec3(1., uBucketData.y, uBucketData.y * uBucketData.y));
        //vec2 voxelsIndex = (vec2(mod(gridIndex, uBucketData.x), floor(gridIndex / uBucketData.x)) + vec2(0.5)) / uBucketData.x;
        vec4 neighbors = texture(uNeighbors, voxelsIndex);

        if(neighbors.r > 0.) addToSum(particlePosition, neighbors.r, lambdaPressure, deltaPosition);
        if(neighbors.g > 0.) addToSum(particlePosition, neighbors.g, lambdaPressure, deltaPosition);
        if(neighbors.b > 0.) addToSum(particlePosition, neighbors.b, lambdaPressure, deltaPosition);
        if(neighbors.a > 0.) addToSum(particlePosition, neighbors.a, lambdaPressure, deltaPosition);
    }

    vec3 endPosition = particlePosition + (uGradientKernelConstant / uRestDensity) * deltaPosition;

    //Collision handling
    vec3 center = vec3(uBucketData.y * 0.5);
    float radius = uBucketData.y * 0.4;
    vec3 normal = endPosition - center;
    float n = length(normal);
    float distance = n -  radius;

    if(distance > 0. ) {

            normal = normalize(normal);
            endPosition = center + normal * radius;

    }

    // //Collision handling
    // vec3 boxSize = vec3(uBucketData.y * 0.46);
    // vec3 xLocal = endPosition - center;
    // vec3 contactPointLocal = min(boxSize, max(-boxSize, xLocal));
    // vec3 contactPoint = contactPointLocal + center;
    // distance = length(contactPoint - particlePosition);
    //
    // if(distance > 0.0) endPosition = contactPoint;

    colorData = vec4(endPosition, texture(uConstrains, index).g + 1.);
}

`;

export {calculateDisplacements}