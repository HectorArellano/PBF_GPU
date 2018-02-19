const vsParticlesPlacement = `#version 300 es

uniform sampler2D uTexturePosition;
uniform sampler2D uColors;
uniform float uSize;
uniform vec3 u3D;
uniform float uParticlesGridScale;
uniform float uTotalParticles;
uniform float uPhase;

out vec4 colorData;

void main() {

    float textureSize = float(textureSize(uTexturePosition, 0).x);
    float index1D = float(gl_VertexID);
    vec2 index2D = (vec2(mod(index1D, textureSize), floor(index1D / textureSize)) + vec2(0.5)) / textureSize;
    
    vec4 data = texture(uTexturePosition, index2D);    
    vec3 position = data.rgb;

    vec3 gPP = floor(position * u3D.y / uParticlesGridScale);
    gPP.y -= (floor(float(gl_VertexID) / uTotalParticles) + uPhase);

    //The buckets are aligned with the Y axis
    vec2 gP = (gPP.xz + u3D.y * vec2(mod(gPP.y, u3D.z), floor(gPP.y / u3D.z)) + vec2(0.5)) / u3D.x;
    gP = 2. * gP - vec2(1.);

    //The 255 alpha value represents the maximum potential value, it could be modulated with the density
    colorData = vec4(texture(uColors, index2D).rgb, 1.);

    gl_PointSize = uSize;
    
    //Using the vertex index to avoid painting more than one particle in the voxel.
    gl_Position = vec4(gP, 0., 1.0);
}
`;

export {vsParticlesPlacement}