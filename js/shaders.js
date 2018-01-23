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
export let highResGrid;
export let lowResGrid;
export let deferred;
export let floor;
export let floorShadows;
export let shadowBoundingBox;
export let blurShadow;
export let caustics;
export let photonsGather;
export let radiance;

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


    highResGrid = webGL2.generateProgram(vsHighResGrid, fsColor);
    highResGrid.verticesTexture = gl.getUniformLocation(highResGrid, "uVoxels");


    lowResGrid = webGL2.generateProgram(vsLowResGrid, fsColor);
    lowResGrid.vertex2DIndex = gl.getAttribLocation(lowResGrid, "aV2I");
    lowResGrid.gridPartitioning = gl.getUniformLocation(lowResGrid, "uTexture3D");
    lowResGrid.positionTexture = gl.getUniformLocation(lowResGrid, "uPT");


    deferred = webGL2.generateProgram(vsDeferredTriangles, fsDeferredTriangles);
    deferred.vertexRepet = gl.getAttribLocation(deferred, "aVJ");
    deferred.cameraMatrix = gl.getUniformLocation(deferred, "uCameraMatrix");
    deferred.perspectiveMatrix = gl.getUniformLocation(deferred, "uPMatrix");
    deferred.textureTriangles = gl.getUniformLocation(deferred, "uTT");
    deferred.textureNormals = gl.getUniformLocation(deferred, "uTN");


    floor = webGL2.generateProgram(vsQuad, fsFloorShader);
    floor.backgroundColor = gl.getUniformLocation(floor, "uBg");


    floorShadows = webGL2.generateProgram(vsFloorShadows, fsFloorShadows);
    floorShadows.textureTriangles = gl.getUniformLocation(floorShadows, "uTT");
    floorShadows.textureNormals = gl.getUniformLocation(floorShadows, "uTN");
    floorShadows.iterations = gl.getUniformLocation(floorShadows, "uMaxSteps");
    floorShadows.maxStepsPerBounce = gl.getUniformLocation(floorShadows, "uMaxBounceSteps");
    floorShadows.scaler = gl.getUniformLocation(floorShadows, "uScaler");
    floorShadows.potentialTexture = gl.getUniformLocation(floorShadows, "uPot");
    floorShadows.texture3DData = gl.getUniformLocation(floorShadows, "uTexture3D");
    floorShadows.lowResPotential = gl.getUniformLocation(floorShadows, "uLowRes");
    floorShadows.voxelLowData = gl.getUniformLocation(floorShadows, "uVoxelLow");
    floorShadows.lightData = gl.getUniformLocation(floorShadows, "uLightData");
    floorShadows.size = gl.getUniformLocation(floorShadows, "uSize");
    floorShadows.compactTextureSize = gl.getUniformLocation(floorShadows, "uCompactSize");


    shadowBoundingBox = webGL2.generateProgram(vsQuad, fsBoundingBox);
    shadowBoundingBox.potentialTexture = gl.getUniformLocation(shadowBoundingBox, "uPyT");
    shadowBoundingBox.size = gl.getUniformLocation(shadowBoundingBox, "uSize");


    blurShadow = webGL2.generateProgram(vsQuad, fsBlurShadows);
    blurShadow.shadowTexture = gl.getUniformLocation(blurShadow, "uShadows");
    blurShadow.axis = gl.getUniformLocation(blurShadow, "uAxis");
    blurShadow.radius = gl.getUniformLocation(blurShadow, "uRadius");


    caustics = webGL2.generateProgram(vsQuad, fsCaustics);
    caustics.vertexIndex = gl.getAttribLocation(caustics, "aVI");
    caustics.randomTexture = gl.getUniformLocation(caustics, "uRayTexture");
    caustics.boundingBoxTexture = gl.getUniformLocation(caustics, "uBoundingShadow");
    caustics.potentialTexture = gl.getUniformLocation(caustics, "uPot");
    caustics.lowResPotential = gl.getUniformLocation(caustics, "uLowRes");
    caustics.textureTriangles = gl.getUniformLocation(caustics, "uTT");
    caustics.textureNormals = gl.getUniformLocation(caustics, "uTN");
    caustics.lightPosition = gl.getUniformLocation(caustics, "uLightPosition");
    caustics.absorption = gl.getUniformLocation(caustics, "uAbsorption");
    caustics.texture3DData = gl.getUniformLocation(caustics, "uTexture3D");
    caustics.voxelLowData = gl.getUniformLocation(caustics, "uVoxelLow");
    caustics.lightColor = gl.getUniformLocation(caustics, "uLightColor");
    caustics.reflectionPhotons = gl.getUniformLocation(caustics, "uReflectionPhotons");
    caustics.scale = gl.getUniformLocation(caustics, "uScale");
    caustics.photonEnergy = gl.getUniformLocation(caustics, "uEnergy");
    caustics.refract = gl.getUniformLocation(caustics, "uRefract");
    caustics.distanceAbsorptionScale = gl.getUniformLocation(caustics, "uAbsorptionDistanceScaler");
    caustics.refractions = gl.getUniformLocation(caustics, "uRefractions");
    caustics.reflections = gl.getUniformLocation(caustics, "uReflections");
    caustics.iterations = gl.getUniformLocation(caustics, "uMaxSteps");
    caustics.maxStepsPerBounce = gl.getUniformLocation(caustics, "uMaxBounceSteps");
    caustics.dispersion = gl.getUniformLocation(caustics, "uDispersion");
    caustics.compactTextureSize = gl.getUniformLocation(caustics, "uCompactSize");


    photonsGather = webGL2.generateProgram(vsPhotons, fsColor);
    photonsGather.photonSize = gl.getUniformLocation(photonsGather, "uSize");
    photonsGather.positions = gl.getUniformLocation(photonsGather, "uPositions");
    photonsGather.colors = gl.getUniformLocation(photonsGather, "uColors");


    radiance = webGL2.generateProgram(vsQuad, fsRadiance);
    radiance.photonTexture = gl.getUniformLocation(radiance, "uPhotons");
    radiance.axis = gl.getUniformLocation(radiance, "uAxis");
    radiance.radius = gl.getUniformLocation(radiance, "uRadius");
    radiance.radiancePower = gl.getUniformLocation(radiance, "uRadiancePower");

}