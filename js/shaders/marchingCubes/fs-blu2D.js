const blur2D = `#version 300 es
precision highp float;

precision highp usampler2D;

uniform usampler2D uDT;
uniform vec2 uAxis;
uniform int uSteps;
uniform vec3 u3D;

in vec2 uv;
out uvec4 colorData;

ivec4 intToRGBA(int data) {
    return ivec4((data >> 24) & 255, (data >> 16) & 255, (data >> 8) & 255, data & 255);
}

uint rgbaToUInt(int r, int g, int b, int p) {
    return uint((r & 255) << 24 | (g & 255) << 16 | (b & 255) << 8 | (p & 255));
}

void blendColor(in ivec3 color, inout ivec3 mixColor, inout int divider) {
    int eval = length(vec3(color)) > 1.? 1 : 0;
    mixColor += color * eval;
    divider += eval;
}

void main(void) {

    float border = .1;
    
    //This avoids to spread information between the different buckets.
    vec2 pos = floor(uv / u3D.x);
    bool bb = mod(pos.x, u3D.y) > border && mod(pos.y, u3D.y) > border && mod(pos.x, u3D.y) < u3D.y - 1. - border && mod(pos.y, u3D.y) < u3D.y - 1. - border;
    int zero = bb ? 1 : 0;

    ivec3 mixColor1 = ivec3(0);
    ivec3 mixColor2 = ivec3(0);
    ivec3 mixColor3 = ivec3(0);
    ivec3 mixColor4 = ivec3(0);
    ivec4 divider = ivec4(0);
    
    float n = float(uSteps);
    ivec4 blend = ivec4(0);
    int sum = 1;
    int m = 1;
    
    for (int i = 0; i < 2 * uSteps; i += 1) {

        ivec4 data = ivec4(texture(uDT, uv + (float(i) - 0.5 * n) * uAxis.xy));

        ivec4 d1 = intToRGBA(data.r);
        ivec4 d2 = intToRGBA(data.g);
        ivec4 d3 = intToRGBA(data.b);
        ivec4 d4 = intToRGBA(data.a);

        ivec4 potential = ivec4(d1.a, d2.a, d3.a, d4.a);

        blendColor(d1.rgb, mixColor1, divider.r);
        blendColor(d2.rgb, mixColor2, divider.g);
        blendColor(d3.rgb, mixColor3, divider.b);
        blendColor(d4.rgb, mixColor4, divider.a);

        blend += zero * m * potential;
        m *= (uSteps - i) / (i + 1);
        sum += m;
    } 
    blend /= sum;
    mixColor1 /= max(divider.r, 1);    
    mixColor2 /= max(divider.g, 1);    
    mixColor3 /= max(divider.b, 1);    
    mixColor4 /= max(divider.a, 1);
    
    uvec4 compressedData = uvec4(0);
    
    compressedData.r = uint(zero) * rgbaToUInt(mixColor1.r, mixColor1.g, mixColor1.b, blend.r);
    compressedData.g = uint(zero) * rgbaToUInt(mixColor2.r, mixColor2.g, mixColor2.b, blend.g);
    compressedData.b = uint(zero) * rgbaToUInt(mixColor3.r, mixColor3.g, mixColor3.b, blend.b);
    compressedData.a = uint(zero) * rgbaToUInt(mixColor4.r, mixColor4.g, mixColor4.b, blend.a);

    colorData = compressedData;
}
`;

export {blur2D}


