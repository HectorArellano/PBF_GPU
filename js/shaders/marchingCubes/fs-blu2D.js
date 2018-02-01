const blur2D = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uDT;
uniform vec2 uAxis;
uniform int uSteps;
uniform vec3 u3D;

in vec2 uv;
out vec4 colorData;

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

    float border = .1;
    
    vec4 blend = vec4(0.);
    float sum = 1.;
    float m = 1.;
    float n = float(uSteps);

    //This avoids to spread information between the different buckets.
    vec2 pos = floor(uv / u3D.x);
    float zero = float(mod(pos.x, u3D.y) > border && mod(pos.y, u3D.y) > border && mod(pos.x, u3D.y) < u3D.y - 1. - border && mod(pos.y, u3D.y) < u3D.y - 1. - border);

    vec3 mixColor1 = vec3(0.);
    vec3 mixColor2 = vec3(0.);
    vec3 mixColor3 = vec3(0.);
    vec3 mixColor4 = vec3(0.);
    vec4 divider = vec4(0.);
    
    for (int i = 0; i < 2 * uSteps; i += 1) {
    
        float k = float(i);
        float j = float(i) - 0.5 * float(uSteps);
    
        vec4 data = texture(uDT, uv + j * uAxis.xy);
        vec4 d1 = vec4(intToRGBA(int(data.r)));
        vec4 d2 = vec4(intToRGBA(int(data.g)));
        vec4 d3 = vec4(intToRGBA(int(data.b)));
        vec4 d4 = vec4(intToRGBA(int(data.a)));
        vec4 potential = vec4(d1.a, d2.a, d3.a, d4.a);
        
        blendColor(d1.rgb, mixColor1, divider.r);
        blendColor(d2.rgb, mixColor2, divider.g);
        blendColor(d3.rgb, mixColor3, divider.b);
        blendColor(d4.rgb, mixColor4, divider.a);
            
        blend +=  zero * m * potential;
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

    colorData = compressedData;
}
`;

export {blur2D}


