const blurDepth = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uDataTexture;
uniform int uSteps;
uniform float uDepth;


in vec2 uv;
out vec4 colorData;

uniform vec3 u3D;
    
void main(void) {

    float sum = 1.;
    float m = 1.;
    float n = float(uSteps);
    float border = .1;


    //Obtain the 3D pos of the corresponding fragment.
    vec2 pos = floor(uv / u3D.x);
    vec3 pos3D = vec3(mod(pos.y, u3D.y), u3D.z * floor(pos.y / u3D.y) + floor(pos.x / u3D.y), mod(pos.x, u3D.y));
    vec3 newPos3D = vec3(0.);
    vec2 uv = vec2(0.);
    vec4 blend = vec4(0.);
    float depthLevel = 0.;

    //Obtain the depth level for the corresponding fragment.
    float currentDepthLevel = floor(pos3D.y / uDepth);

    float zero = float(mod(pos.x, u3D.y) > border && mod(pos.y, u3D.y) > border && mod(pos.x, u3D.y) < u3D.y - 1. - border && mod(pos.y, u3D.y) < u3D.y - 1. - border);

    for (int i = 0; i < 2 * uSteps; i += 1) {
        float j = float(i) - 0.5 * float(uSteps);
        float k = float(i);
        //Obtain the new 3D pos of the fragment to use for blurring.
        newPos3D = pos3D - j * vec3(0., 1., 0.);

        //Obtain the z level for the new fragment to read.
        depthLevel = floor(newPos3D.y / uDepth);  

        uv = u3D.x * (newPos3D.xz + u3D.y * vec2(mod(newPos3D.y, u3D.z), floor(newPos3D.y / u3D.z)) + vec2(0.5));;
        uv.y = fract(uv.y);

        vec4 newBucket = texture(uDataTexture, uv);

        //If the new fragment is in the same depth range than the original fragment to blur then the same channels are used.
        //If the new depthLevel is different than the current Z level the blurring have to be done taking into account the
        //channel differences between the two fragments.

        vec3 cases = vec3(bvec3(depthLevel < currentDepthLevel, depthLevel == currentDepthLevel, depthLevel > currentDepthLevel));
        blend += zero * m * (vec4(0., newBucket.rgb) * cases.x + newBucket * cases.y + vec4(newBucket.gba, 0.) * cases.z);
        m *= (n - k) / (k + 1.);
        sum += m;
    }

    blend /= sum;

    //This avoids to spread information between the different buckets.
    blend *= zero;

    colorData = blend;
}
`;

export {blurDepth}