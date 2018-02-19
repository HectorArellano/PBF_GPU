const blur2D = `#version 300 es
precision highp float;
precision highp usampler2D;

uniform usampler2D uDT;
uniform vec2 uAxis;
uniform int uSteps;
uniform vec3 u3D;
uniform float uDepth;

in vec2 uv;
out uvec4 colorData;

vec4 intToRGBA(int data) {
    return vec4((data >> 24) & 255, (data >> 16) & 255, (data >> 8) & 255, (data >> 0) & 255);
}

uint rgbaToUInt(float r, float g, float b, float p) {
    return uint((int(r) & 255) << 24 | (int(g) & 255) << 16 | (int(b) & 255) << 8 | (int(p) & 255) << 0);
}

void main(void) {

    vec3 mixColor1 = vec3(0);
    vec3 mixColor2 = vec3(0);
    vec3 mixColor3 = vec3(0);
    vec3 mixColor4 = vec3(0);
    
    float n = float(uSteps);
    vec4 blend = vec4(0.);
    float sum = 1.;
    float m = 1.;
    vec4 divider = vec4(0.);
    
    vec2 pos = floor(uv * u3D.x);
    vec3 pos3D = vec3(mod(pos.y, u3D.y), u3D.z * floor(pos.y / u3D.y) + floor(pos.x / u3D.y), mod(pos.x, u3D.y));
    vec2 st = vec2(0.);
    float depthLevel = 0.;
    float currentDepthLevel = floor(pos3D.y / uDepth);

    for (int i = 0; i <= 2 * uSteps; i += 1) {
                
        st = uv + (float(i) - 0.5 * float(uSteps))* uAxis;
        pos = floor(st * u3D.x);
        pos3D = vec3(mod(pos.y, u3D.y), u3D.z * floor(pos.y / u3D.y) + floor(pos.x / u3D.y), mod(pos.x, u3D.y));
        depthLevel = floor(pos3D.y / uDepth);
        
        if(depthLevel == currentDepthLevel) {
        
            ivec4 data = ivec4(texture(uDT, st));

            vec4 d1 = intToRGBA(data.r);
            vec4 d2 = intToRGBA(data.g);
            vec4 d3 = intToRGBA(data.b);
            vec4 d4 = intToRGBA(data.a);
    
            vec4 potential = vec4(d1.a, d2.a, d3.a, d4.a);
    
            blend +=  m * potential;
            
            vec4 zeroColor = m * vec4(bvec4(length(vec3(d1.rgb)) > 10.0, length(vec3(d2.rgb)) > 10.0, length(vec3(d3.rgb)) > 10.0, length(vec3(d4.rgb)) > 10.0));
            
            mixColor1 += zeroColor.x * d1.rgb;
            mixColor2 += zeroColor.y * d2.rgb;
            mixColor3 += zeroColor.z * d3.rgb;
            mixColor4 += zeroColor.w * d4.rgb;
            
            float k = float(i);
            m *= (n - k) / (k + 1.);
            sum += m;
            
            divider += zeroColor;
        }
    } 
    
    blend /= sum;
    
    mixColor1 /= max(divider.x, 1.);    
    mixColor2 /= max(divider.y, 1.);    
    mixColor3 /= max(divider.z, 1.);    
    mixColor4 /= max(divider.w, 1.);
        
    colorData.r = rgbaToUInt(mixColor1.r, mixColor1.g, mixColor1.b, blend.r);
    colorData.g = rgbaToUInt(mixColor2.r, mixColor2.g, mixColor2.b, blend.g);
    colorData.b = rgbaToUInt(mixColor3.r, mixColor3.g, mixColor3.b, blend.b);
    colorData.a = rgbaToUInt(mixColor4.r, mixColor4.g, mixColor4.b, blend.a);
    
}
`;

export {blur2D}

