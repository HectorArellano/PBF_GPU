import {gl}                     from './utils/webGL2.js';
import * as webGL2              from './utils/webGL2.js';
import {vsParticles}            from './shaders/utils/vs-renderParticles.js'
import {fsColor}                from './shaders/utils/fs-simpleColor.js';
import {fsTextureColor}         from './shaders/utils/fs-simpleTexture.js';
import {vsQuad}                 from './shaders/utils/vs-quad.js';
import {vsHighResGrid}          from './shaders/raytracer/vs-highResGrid.js';
import {vsLowResGrid}           from './shaders/raytracer/vs-lowResGrid.js';
import {vsDeferredTriangles}    from './shaders/raytracer/vs-deferredTriangles.js';
import {fsDeferredTriangles}    from './shaders/raytracer/fs-deferredTriangles.js';
import {fsFloorShader}          from './shaders/raytracer/fs-floor.js';
import {vsFloorShadows}         from './shaders/raytracer/vs-floorShadows.js';
import {fsFloorShadows}         from './shaders/raytracer/fs-floorShadows.js';
import {fsBoundingBox}          from './shaders/raytracer/fs-boundingBox.js';
import {fsBlurShadows}          from './shaders/raytracer/fs-blurShadows.js';
import {fsCaustics}             from './shaders/raytracer/fs-caustics.js';
import {vsPhotons}              from './shaders/raytracer/vs-photons.js';
import {fsRadiance}             from './shaders/raytracer/fs-radiance.js';


//=======================================================================================================
// Shader programs
//=======================================================================================================

export let renderParticles;
export let texture;
export let highResGridProgram;
export let lowResGridProgram;
export let deferredProgram;
export let floorProgram;
export let floorShadowsProgram;
export let shadowBoundingBoxProgram;
export let blurShadowProgram;
export let causticsProgram;
export let photonsGatherProgram;
export let radianceProgram;

//=======================================================================================================
// Shader programs initiation
//=======================================================================================================

export function init() {

    renderParticles = webGL2.generateProgram(vsParticles, fsColor);
    renderParticles.positionTexture = gl.getUniformLocation(renderParticles, "uTexturePosition");
    renderParticles.cameraMatrix = gl.getUniformLocation(renderParticles, "uCameraMatrix");
    renderParticles.perspectiveMatrix = gl.getUniformLocation(renderParticles, "uPMatrix");
    renderParticles.scale = gl.getUniformLocation(renderParticles, "uScale");


    texture = webGL2.generateProgram(vsQuad, fsTextureColor);
    texture.texture = gl.getUniformLocation(texture, "uTexture");
    texture.forceAlpha = gl.getUniformLocation(texture, "uForceAlpha");


    highResGridProgram = webGL2.generateProgram(vsHighResGrid, fsColor);
    highResGridProgram.verticesTexture = gl.getUniformLocation(highResGridProgram, "uVoxels");


    lowResGridProgram = webGL2.generateProgram(vsLowResGrid, fsColor);
    lowResGridProgram.vertex2DIndex = gl.getAttribLocation(lowResGridProgram, "aV2I");
    lowResGridProgram.gridPartitioning = gl.getUniformLocation(lowResGridProgram, "uTexture3D");
    lowResGridProgram.positionTexture = gl.getUniformLocation(lowResGridProgram, "uPT");


    deferredProgram = webGL2.generateProgram(vsDeferredTriangles, fsDeferredTriangles);
    deferredProgram.vertexRepet = gl.getAttribLocation(deferredProgram, "aVJ");
    deferredProgram.cameraMatrix = gl.getUniformLocation(deferredProgram, "uCameraMatrix");
    deferredProgram.perspectiveMatrix = gl.getUniformLocation(deferredProgram, "uPMatrix");
    deferredProgram.textureTriangles = gl.getUniformLocation(deferredProgram, "uTT");
    deferredProgram.textureNormals = gl.getUniformLocation(deferredProgram, "uTN");


    floorProgram = webGL2.generateProgram(vsQuad, fsFloorShader);
    floorProgram.backgroundColor = gl.getUniformLocation(floorProgram, "uBg");


    floorShadowsProgram = webGL2.generateProgram(vsFloorShadows, fsFloorShadows);
    floorShadowsProgram.textureTriangles = gl.getUniformLocation(floorShadowsProgram, "uTT");
    floorShadowsProgram.textureNormals = gl.getUniformLocation(floorShadowsProgram, "uTN");
    floorShadowsProgram.iterations = gl.getUniformLocation(floorShadowsProgram, "uMaxSteps");
    floorShadowsProgram.maxStepsPerBounce = gl.getUniformLocation(floorShadowsProgram, "uMaxBounceSteps");
    floorShadowsProgram.scaler = gl.getUniformLocation(floorShadowsProgram, "uScaler");
    floorShadowsProgram.potentialTexture = gl.getUniformLocation(floorShadowsProgram, "uPot");
    floorShadowsProgram.texture3DData = gl.getUniformLocation(floorShadowsProgram, "uTexture3D");
    floorShadowsProgram.lowResPotential = gl.getUniformLocation(floorShadowsProgram, "uLowRes");
    floorShadowsProgram.voxelLowData = gl.getUniformLocation(floorShadowsProgram, "uVoxelLow");
    floorShadowsProgram.lightData = gl.getUniformLocation(floorShadowsProgram, "uLightData");
    floorShadowsProgram.size = gl.getUniformLocation(floorShadowsProgram, "uSize");
    floorShadowsProgram.compactTextureSize = gl.getUniformLocation(floorShadowsProgram, "uCompactSize");


    shadowBoundingBoxProgram = webGL2.generateProgram(vsQuad, fsBoundingBox);
    shadowBoundingBoxProgram.potentialTexture = gl.getUniformLocation(shadowBoundingBoxProgram, "uPyT");
    shadowBoundingBoxProgram.size = gl.getUniformLocation(shadowBoundingBoxProgram, "uSize");


    blurShadowProgram = webGL2.generateProgram(vsQuad, fsBlurShadows);
    blurShadowProgram.shadowTexture = gl.getUniformLocation(blurShadowProgram, "uShadows");
    blurShadowProgram.axis = gl.getUniformLocation(blurShadowProgram, "uAxis");
    blurShadowProgram.radius = gl.getUniformLocation(blurShadowProgram, "uRadius");


    causticsProgram = webGL2.generateProgram(vsQuad, fsCaustics);
    causticsProgram.vertexIndex = gl.getAttribLocation(causticsProgram, "aVI");
    causticsProgram.randomTexture = gl.getUniformLocation(causticsProgram, "uRayTexture");
    causticsProgram.boundingBoxTexture = gl.getUniformLocation(causticsProgram, "uBoundingShadow");
    causticsProgram.potentialTexture = gl.getUniformLocation(causticsProgram, "uPot");
    causticsProgram.lowResPotential = gl.getUniformLocation(causticsProgram, "uLowRes");
    causticsProgram.textureTriangles = gl.getUniformLocation(causticsProgram, "uTT");
    causticsProgram.textureNormals = gl.getUniformLocation(causticsProgram, "uTN");
    causticsProgram.lightPosition = gl.getUniformLocation(causticsProgram, "uLightPosition");
    causticsProgram.absorption = gl.getUniformLocation(causticsProgram, "uAbsorption");
    causticsProgram.texture3DData = gl.getUniformLocation(causticsProgram, "uTexture3D");
    causticsProgram.voxelLowData = gl.getUniformLocation(causticsProgram, "uVoxelLow");
    causticsProgram.lightColor = gl.getUniformLocation(causticsProgram, "uLightColor");
    causticsProgram.reflectionPhotons = gl.getUniformLocation(causticsProgram, "uReflectionPhotons");
    causticsProgram.scale = gl.getUniformLocation(causticsProgram, "uScale");
    causticsProgram.photonEnergy = gl.getUniformLocation(causticsProgram, "uEnergy");
    causticsProgram.refract = gl.getUniformLocation(causticsProgram, "uRefract");
    causticsProgram.distanceAbsorptionScale = gl.getUniformLocation(causticsProgram, "uAbsorptionDistanceScaler");
    causticsProgram.refractions = gl.getUniformLocation(causticsProgram, "uRefractions");
    causticsProgram.reflections = gl.getUniformLocation(causticsProgram, "uReflections");
    causticsProgram.iterations = gl.getUniformLocation(causticsProgram, "uMaxSteps");
    causticsProgram.maxStepsPerBounce = gl.getUniformLocation(causticsProgram, "uMaxBounceSteps");
    causticsProgram.dispersion = gl.getUniformLocation(causticsProgram, "uDispersion");
    causticsProgram.compactTextureSize = gl.getUniformLocation(causticsProgram, "uCompactSize");


    photonsGatherProgram = webGL2.generateProgram(vsPhotons, fsColor);
    photonsGatherProgram.photonSize = gl.getUniformLocation(photonsGatherProgram, "uSize");
    photonsGatherProgram.positions = gl.getUniformLocation(photonsGatherProgram, "uPositions");
    photonsGatherProgram.colors = gl.getUniformLocation(photonsGatherProgram, "uColors");


    radianceProgram = webGL2.generateProgram(vsQuad, fsRadiance);
    radianceProgram.photonTexture = gl.getUniformLocation(radianceProgram, "uPhotons");
    radianceProgram.axis = gl.getUniformLocation(radianceProgram, "uAxis");
    radianceProgram.radius = gl.getUniformLocation(radianceProgram, "uRadius");
    radianceProgram.radiancePower = gl.getUniformLocation(radianceProgram, "uRadiancePower");

}