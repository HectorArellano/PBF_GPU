const getCorners = `#version 300 es

precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;
uniform usampler2D uDataTexture;
uniform vec3 u3D;
uniform float uDepth;

vec3 data[7];

in vec2 uv;
out uvec4 colorData;

vec2 index2D(vec3 pos) {
    return u3D.x * (pos.xz + u3D.y * vec2(mod(pos.y, u3D.z), floor(pos.y / u3D.z)) + vec2(0.5));
}

ivec4 intToRGBA(int data) {
    return ivec4((data >> 24) & 255, (data >> 16) & 255, (data >> 8) & 255, (data >> 0) & 255);
}

uint rgbaToUInt(int r, int g, int b, int p) {
    return uint((r & 255) << 24 | (g & 255) << 16 | (b & 255) << 8 | (p & 255) << 0);
}

void blendColor(in ivec3 color, inout ivec3 mixColor, inout int divider) {
    int eval = length(vec3(color)) > 1.? 1 : 0;
    mixColor += color * eval;
    divider += eval;
}

void main(void) {
    vec2 pos = floor(uv / u3D.x);
    vec3 pos3D = vec3(mod(pos.y, u3D.y), u3D.z * floor(pos.y / u3D.y) + floor(pos.x / u3D.y), mod(pos.x, u3D.y));

    data[0] = vec3(-1., -1., -1.);
    data[1] = vec3(0., -1., -1.);
    data[2] = vec3(0., 0., -1.);
    data[3] = vec3(-1., 0., -1);
    data[4] = vec3(-1., -1., 0.);
    data[5] = vec3(0., -1., 0.);
    data[6] = vec3(-1., 0., 0.);

    float currentZLevel = floor(pos3D.y / uDepth);
    vec2 uv  = index2D(pos3D);
    uv.y = fract(uv.y);
    
    ivec4 dat = ivec4(texture(uDataTexture, uv));
    ivec4 d1 = intToRGBA(dat.r);
    ivec4 d2 = intToRGBA(dat.g);
    ivec4 d3 = intToRGBA(dat.b);
    ivec4 d4 = intToRGBA(dat.a);
    ivec3 mixColor1 = d1.rgb;
    ivec3 mixColor2 = d2.rgb;
    ivec3 mixColor3 = d3.rgb;
    ivec3 mixColor4 = d4.rgb;
    
    ivec4 corner = ivec4(d1.a, d2.a, d3.a, d4.a);

    vec3 newPos3D = vec3(0.);
    float zLevel = 0.;
    ivec4 divider = ivec4(1);

    for(int i = 0; i < 7; i ++) {

        newPos3D = pos3D + data[i];
        zLevel = floor(newPos3D.y / uDepth);
        uv = index2D(newPos3D);
        uv.y = fract(uv.y);

        dat = ivec4(texture(uDataTexture, uv));
        d1 = intToRGBA(dat.r);
        d2 = intToRGBA(dat.g);
        d3 = intToRGBA(dat.b);
        d4 = intToRGBA(dat.a);
        ivec4 potential = ivec4(d1.a, d2.a, d3.a, d4.a);
                
        ivec3 cases = ivec3(bvec3(zLevel < currentZLevel, zLevel == currentZLevel, zLevel > currentZLevel));
        corner += ivec4(0, potential.rgb) * cases.x + potential * cases.y + ivec4(potential.gba, 0) * cases.z;
        
        ivec4 zeroColor = ivec4(bvec4(length(vec3(d1.rgb)) > 1.0, length(vec3(d2.rgb)) > 1.0, length(vec3(d3.rgb)) > 1.0, length(vec3(d4.rgb)) > 1.0));
        
        mixColor1 += zeroColor.r * d1.rgb * cases.y;
        mixColor2 += zeroColor.g * d2.rgb * cases.y;
        mixColor3 += zeroColor.b * d3.rgb * cases.y;
        mixColor4 += zeroColor.a * d4.rgb * cases.y;
        
        divider += zeroColor * cases.y;

    }
    
    corner /= 8;
    mixColor1 /= divider.r;    
    mixColor2 /= divider.g;    
    mixColor3 /= divider.b;    
    mixColor4 /= divider.a;
    
    uvec4 compressedData = uvec4(0);
    
    compressedData.r = rgbaToUInt(mixColor1.r, mixColor1.g, mixColor1.b, corner.r);
    compressedData.g = rgbaToUInt(mixColor2.r, mixColor2.g, mixColor2.b, corner.g);
    compressedData.b = rgbaToUInt(mixColor3.r, mixColor3.g, mixColor3.b, corner.b);
    compressedData.a = rgbaToUInt(mixColor4.r, mixColor4.g, mixColor4.b, corner.a);

    colorData = compressedData;

}

`;

export {getCorners}