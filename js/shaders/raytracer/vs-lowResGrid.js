const vsLowResGrid = `#version 300 es

precision highp float;
precision highp sampler2D;
uniform vec3 uTexture3D;
uniform highp sampler2D uPT;

out vec4 colorData;

void main(void) {
    colorData = vec4(float(gl_VertexID));
    
    int tSize = textureSize(uPT, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;
    
    vec3 gPP = floor(texture(uPT, index).rgb * uTexture3D.y);
    vec2 gP = 2. * uTexture3D.x * (gPP.xz + uTexture3D.y * vec2(mod(gPP.y, uTexture3D.z), floor(gPP.y / uTexture3D.z)) + vec2(0.5)) - vec2(1.);
    gl_PointSize = 1.;
    gl_Position = vec4(gP, 0., 1.0);
    
}


`;

export {vsLowResGrid}