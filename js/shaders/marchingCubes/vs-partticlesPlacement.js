const vsParticlesPlacement = `#version 300 es

uniform sampler2D uTexturePosition;
uniform float uPhase;
uniform float uSize;
uniform vec3 u3D;
uniform float uParticlesGridScale;

out vec4 colorData;

void main() {

    float textureSize = float(textureSize(uTexturePosition, 0).x);
    float index1D = float(gl_VertexID);
    vec2 index2D = (vec2(mod(index1D, textureSize), floor(index1D / textureSize)) + vec2(0.5)) / textureSize;
    
    vec4 data = texture(uTexturePosition, index2D);
    vec3 position = data.rgb;

    vec3 gPP = floor(position * u3D.y / uParticlesGridScale);
    gPP.y -= uPhase;

    //The buckets are aligned with the Y axis
    vec2 gP = u3D.x * (gPP.xz + u3D.y * vec2(mod(gPP.y, u3D.z), floor(gPP.y / u3D.z)) + vec2(0.5));
    float depthLevel = floor(gP.y);
    gP.y = fract(gP.y);
    gP = 2. * gP - vec2(1.);

    colorData = vec4(equal(vec4(depthLevel), vec4(0., 1., 2., 3.)));

    gl_PointSize = uSize;
    gl_Position = vec4(gP, 0., 1.0);
}
`;

export {vsParticlesPlacement}