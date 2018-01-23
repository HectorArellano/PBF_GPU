import {gl}                     from './utils/webGL2.js';
import * as webGL2              from './utils/webGL2.js';
import * as PBF                 from './pbf.js';
import * as Mesher              from './mesher.js';
import {Camera}                 from './utils/camera.js';
import {vsParticles}            from './shaders/utils/vs-renderParticles.js'
import {fsColor}                from './shaders/utils/fs-simpleColor.js';
import {fsTextureColor}         from './shaders/utils/fs-simpleTexture.js';
import {vsQuad}                 from './shaders/utils/vs-quad.js';
import {highResGrid}            from './shaders/raytracer/vs-highResGrid.js';
import {lowResGrid}             from './shaders/raytracer/vs-lowResGrid.js';

//=======================================================================================================
// Variables & Constants
//=======================================================================================================

let canvas = document.querySelector("#canvas3D");
canvas.height = 1000;
canvas.width = canvas.height * 2;
canvas.style.width = String(canvas.width) + "px";
canvas.style.height = String(canvas.height) + "px";
webGL2.setContext(canvas);


let camera = new Camera(canvas);
let cameraDistance = 2.5;
let FOV = 30;

//For the Positionn Based Fluids
let updateSimulation = true;
let deltaTime = 0.01;
let constrainsIterations = 4;
let pbfResolution = 128;
let voxelTextureSize = 2048;
let particlesTextureSize = 1000;
let particlesPosition = [];
let particlesVelocity = []
let currentFrame = 0;

//Change these values to change marching cubes resolution (128/2048/1024 or 256/4096/2048)
let resolution = 128;
let expandedTextureSize = 2048;
let compressedTextureSize = 1024;
let compactTextureSize = 1500;
let compressedBuckets = 8;
let expandedBuckets = 16;
let particleSize = 2;
let blurSteps = 5;
let range = 0.31;
let maxCells = 3.5;
let fastNormals = false;

//For the raytracer
let lowResolutionTextureSize =     256;
let lowGridPartitions =            32;
let lowSideBuckets =               8;

let radius = pbfResolution * 0.45;
//Generate the position and velocity
for(let i = 0; i < pbfResolution; i ++) {
    for(let j = 0; j < pbfResolution; j ++) {
        for(let k = 0; k < pbfResolution; k ++) {

            //Condition for the particle position and existence
            let x = i - pbfResolution * 0.5;
            let y = j - pbfResolution * 0.5;
            let z = k - pbfResolution * 0.5;

            if(x*x + y*y + z*z < radius * radius && k < pbfResolution * 0.4) {
                particlesPosition.push(i, j, k, 1);
                particlesVelocity.push(0, 0, 0, 0); //Velocity is zero for all the particles.
            }
        }
    }
}


//Shader programs
let renderParticlesProgram                              = webGL2.generateProgram(vsParticles, fsColor);
renderParticlesProgram.positionTexture                  = gl.getUniformLocation(renderParticlesProgram, "uTexturePosition");
renderParticlesProgram.cameraMatrix                     = gl.getUniformLocation(renderParticlesProgram, "uCameraMatrix");
renderParticlesProgram.perspectiveMatrix                = gl.getUniformLocation(renderParticlesProgram, "uPMatrix");
renderParticlesProgram.scale                            = gl.getUniformLocation(renderParticlesProgram, "uScale");

let textureProgram                                      = webGL2.generateProgram(vsQuad, fsTextureColor);
textureProgram.texture                                  = gl.getUniformLocation(textureProgram, "uTexture");
textureProgram.forceAlpha                               = gl.getUniformLocation(textureProgram, "uForceAlpha");

let highResGridProgram                                  = webGL2.generateProgram(highResGrid, fsColor);
highResGridProgram.verticesTexture                      = gl.getUniformLocation(highResGridProgram, "uVoxels");

let lowResGridProgram                                   = webGL2.generateProgram(lowResGrid, fsColor);
lowResGridProgram.vertex2DIndex                         = gl.getAttribLocation(lowResGridProgram, "aV2I");
lowResGridProgram.gridPartitioning                      = gl.getUniformLocation(lowResGridProgram, "uTexture3D");
lowResGridProgram.positionTexture                       = gl.getUniformLocation(lowResGridProgram, "uPT");


//Textures and framebuffers
let tHelper = webGL2.createTexture2D(expandedTextureSize, expandedTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
let tVoxelsLow = webGL2.createTexture2D(lowResolutionTextureSize, lowResolutionTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);

let fbHelper = webGL2.createDrawFramebuffer(tHelper, true);
let fbVoxelsLow = webGL2.createDrawFramebuffer(tVoxelsLow);


//=======================================================================================================
// Simulation and Rendering (Position based fluids. marching cubes and raytracing)
//=======================================================================================================

//Initiate the position based fluids solver
PBF.init(particlesPosition, particlesVelocity, pbfResolution, voxelTextureSize, particlesTextureSize);
particlesPosition = null;
particlesVelocity = null;

//Initiate the mesher generator
Mesher.init(resolution, expandedTextureSize, compressedTextureSize, compactTextureSize, compressedBuckets, expandedBuckets);

//Function used to render the particles in a framebuffer.
let renderParticles = (_x, _u, _width, _height, buffer, cleanBuffer = true) => {
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, buffer);
    gl.viewport(_x, _u, _width, _height);
    gl.useProgram(renderParticlesProgram);
    webGL2.bindTexture(renderParticlesProgram.positionTexture, PBF.positionTexture, 0);
    gl.uniform1f(renderParticlesProgram.scale, pbfResolution);
    gl.uniformMatrix4fv(renderParticlesProgram.cameraMatrix, false, camera.cameraTransformMatrix);
    gl.uniformMatrix4fv(renderParticlesProgram.perspectiveMatrix, false, camera.perspectiveMatrix);
    if(cleanBuffer) gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.drawArrays(gl.POINTS, 0, PBF.totalParticles);
    gl.disable(gl.DEPTH_TEST);
}

//Function used to check the textures
let checkTexture = (texture, _x, _u, _width, _height, buffer, cleanBuffer = true, forceAlpha = false) => {
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, buffer);
    gl.viewport(_x, _u, _width, _height);
    gl.useProgram(textureProgram);
    webGL2.bindTexture(textureProgram.texture, texture, 0);
    gl.uniform1i(textureProgram.forceAlpha, forceAlpha);
    if(cleanBuffer) gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

let render = () => {

    requestAnimationFrame(render);

    camera.updateCamera(FOV, 1, cameraDistance);
    let acceleration = {x:0* Math.sin(currentFrame * Math.PI / 180), y:-10,  z:0* Math.cos(currentFrame * Math.PI / 180)}


    if(updateSimulation) {

        //Update the simulation
        PBF.updateFrame(acceleration, deltaTime, constrainsIterations);

        //Generate the mesh from the simulation particles
        Mesher.generateMesh(PBF.positionTexture, PBF.totalParticles, pbfResolution, particleSize, blurSteps, range, maxCells, fastNormals);

        currentFrame ++;

    }

    //Ray tracing section

    let activeMCells = Math.ceil(maxCells * expandedTextureSize * expandedTextureSize / 100);


    //Generate the high resolution grid for the ray tracer
    gl.useProgram(highResGridProgram);
    webGL2.bindTexture(highResGridProgram.verticesTexture, Mesher.tVoxelsOffsets, 0);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbHelper);
    gl.viewport(0, 0, expandedTextureSize, expandedTextureSize);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.drawArrays(gl.POINTS, 0, 15 * activeMCells);
    gl.disable(gl.DEPTH_TEST);


    //Generate the low resolution grid for the ray tracer
    gl.useProgram(lowResGridProgram);
    webGL2.bindTexture(lowResGridProgram.positionTexture, Mesher.tTriangles, 0);
    gl.uniform3f(lowResGridProgram.gridPartitioning, 1 / lowResolutionTextureSize, lowGridPartitions, lowSideBuckets);
    gl.viewport(0, 0, lowResolutionTextureSize, lowResolutionTextureSize);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbVoxelsLow);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, 15 * activeMCells);


    //Checking texture results
    checkTexture(tHelper, 0, 0, 1000, 1000, null, true, true);
    checkTexture(tVoxelsLow, 1000, 0, 1000, 1000, null, false, true);

};

document.body.addEventListener("keypress", ()=> {
    updateSimulation = !updateSimulation;
})

render();
