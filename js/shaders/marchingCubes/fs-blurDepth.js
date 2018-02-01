const blurDepth = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uDataTexture;
uniform int uSteps;
uniform float uDepth;


in vec2 uv;
out vec4 colorData;

uniform vec3 u3D;

ivec4 intToRGBA(int data) {
    return ivec4(data >> 24 & 255, data >> 16 & 255, data >> 8 & 255, data & 255);
}

uint rgbaToInt(int r, int g, int b, int p) {
    return uint((r & 255) << 24 | (g & 255) << 16 | (b & 255) << 8 | (p & 255));
}

void blendColor(in vec3 color, inout vec3 mixColor, inout float divider) {
    float eval = step(-length(color), -0.01);
    mixColor += color * eval;
    divider += eval;
}
    
void main(void) {

    float sum = 1.;
    float m = 1.;
    float n = float(uSteps);
    float border = .1;
    
    vec3 mixColor1 = vec3(0.);
    vec3 mixColor2 = vec3(0.);
    vec3 mixColor3 = vec3(0.);
    vec3 mixColor4 = vec3(0.);
    vec4 divider = vec4(0.);

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
        
        vec4 data = texture(uDataTexture, uv);
        vec4 d1 = vec4(intToRGBA(int(data.r)));
        vec4 d2 = vec4(intToRGBA(int(data.g)));
        vec4 d3 = vec4(intToRGBA(int(data.b)));
        vec4 d4 = vec4(intToRGBA(int(data.a)));
        vec4 potential = vec4(d1.a, d2.a, d3.a, d4.a);
        
        blendColor(d1.rgb, mixColor1, divider.r);
        blendColor(d2.rgb, mixColor2, divider.g);
        blendColor(d3.rgb, mixColor3, divider.b);
        blendColor(d4.rgb, mixColor4, divider.a);
        
        //If the new fragment is in the same depth range than the original fragment to blur then the same channels are used.
        //If the new depthLevel is different than the current Z level the blurring have to be done taking into account the
        //channel differences between the two fragments.

        vec3 cases = vec3(bvec3(depthLevel < currentDepthLevel, depthLevel == currentDepthLevel, depthLevel > currentDepthLevel));
        blend += zero * m * (vec4(0., potential.rgb) * cases.x + potential * cases.y + vec4(potential.gba, 0.) * cases.z);
        m *= (n - k) / (k + 1.);
        sum += m;
    }

    blend /= sum;
    blend *= zero;
    
    mixColor1 /= divider.r;
    mixColor1 *= zero;
    
    mixColor2 /= divider.g;
    mixColor2 *= zero;
    
    mixColor3 /= divider.b;
    mixColor3 *= zero;
    
    mixColor4 /= divider.a;
    mixColor4 *= zero;
    
    vec4 compressedData = vec4(0.);
    compressedData.r = float(rgbaToInt(int(mixColor1.r), int(mixColor1.g), int(mixColor1.b), int(blend.r)));
    compressedData.g = float(rgbaToInt(int(mixColor2.r), int(mixColor2.g), int(mixColor2.b), int(blend.g)));
    compressedData.b = float(rgbaToInt(int(mixColor3.r), int(mixColor3.g), int(mixColor3.b), int(blend.b)));
    compressedData.a = float(rgbaToInt(int(mixColor4.r), int(mixColor4.g), int(mixColor4.b), int(blend.a)));

    colorData = blend / 255.;
}
`;

export {blurDepth}