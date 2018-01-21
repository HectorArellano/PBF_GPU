import {gl}                     from './utils/webGL2.js';
import * as webGL2              from './utils/webGL2.js';
import * as PBF                 from './pbf.js';
import * as Mesher              from './mesher.js';
import {Camera}                 from './utils/camera.js';
import {vsParticles}            from './shaders/utils/vs-renderParticles.js'
import {fsColor}                from './shaders/utils/fs-simpleColor.js';
import {fsTextureColor}         from './shaders/utils/fs-simpleTexture.js';
import {vsQuad}                 from './shaders/utils/vs-quad.js';


//=======================================================================================================
// Variables & Constants
//=======================================================================================================

let canvas = document.querySelector("#canvas3D");
canvas.width = 2048;
canvas.height = 1024;
canvas.style.width = String(canvas.width) + "px";
canvas.style.height = String(canvas.height) + "px";
webGL2.setContext(canvas);


let camera = new Camera(canvas);
let cameraDistance = 3.5;
let FOV = 30;

//For the Positionn Based Fluids
let deltaTime = 0.01;
let constrainsIterations = 4;
let pbfResolution = 128;
let voxelTextureSize = 2048;
let particlesTextureSize = 1024;
let particlesPosition = [];
let particlesVelocity = [];
let radius = pbfResolution * 0.39;
let currentFrame = 0;

//For the mesher
let resolution = 128;
let expandedTexturSize = 2048;
let compressedTextureSize = 1024;
let compactTextureSize = 3500;
let compressedBuckets = 8;
let expandedBuckets = 16;
let particleSize = 2;
let blurSteps = 3;
let range = 0.5;

//Generate the position and velocity
for(let i = 0; i < pbfResolution; i ++) {
    for(let j = 0; j < pbfResolution; j ++) {
        for(let k = 0; k < pbfResolution; k ++) {

            //Condition for the particle position and existence
            let x = i - pbfResolution * 0.5;
            let y = j - pbfResolution * 0.5;
            let z = k - pbfResolution * 0.5;

            if(x*x + y*y + z*z < radius * radius && k < pbfResolution * 0.5) {
                particlesPosition.push(i, j, k, 1);
                particlesVelocity.push(0, 0, 0, 0); //Velocity is zero for all the particles.
            }
        }
    }
}

let renderParticlesProgram                              = webGL2.generateProgram(vsParticles, fsColor);
renderParticlesProgram.positionTexture                  = gl.getUniformLocation(renderParticlesProgram, "uTexturePosition");
renderParticlesProgram.cameraMatrix                     = gl.getUniformLocation(renderParticlesProgram, "uCameraMatrix");
renderParticlesProgram.perspectiveMatrix                = gl.getUniformLocation(renderParticlesProgram, "uPMatrix");
renderParticlesProgram.scale                            = gl.getUniformLocation(renderParticlesProgram, "uScale");

let textureProgram                                      = webGL2.generateProgram(vsQuad, fsTextureColor);
textureProgram.texture                                  = gl.getUniformLocation(textureProgram, "uTexture");
textureProgram.forceAlpha                               = gl.getUniformLocation(textureProgram, "uForceAlpha");


//=======================================================================================================
// Simulation and Rendering (Position based fluids)
//=======================================================================================================

//Initiate the position based fluids solver
PBF.init(particlesPosition, particlesVelocity, pbfResolution, voxelTextureSize, particlesTextureSize);
particlesPosition = null;
particlesVelocity = null;

//Initiate the mesher generator
Mesher.init(resolution, expandedTexturSize, compressedTextureSize, compactTextureSize, compressedBuckets, expandedBuckets);

let render = () => {

    requestAnimationFrame(render);

    camera.updateCamera(FOV, 1, cameraDistance);
    let acceleration = {x:0* Math.sin(currentFrame * Math.PI / 180), y:-10,  z:0* Math.cos(currentFrame * Math.PI / 180)}

    //Update the simulation
    PBF.updateFrame(acceleration, deltaTime, constrainsIterations);

    //Generate the mesh from the simulation particles
    Mesher.generateMesh(PBF.positionTexture, PBF.totalParticles, pbfResolution, particleSize, blurSteps, range);

    //Render particles
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.viewport(0, 0, 1024, 1024);
    gl.useProgram(renderParticlesProgram);
    webGL2.bindTexture(renderParticlesProgram.positionTexture, PBF.positionTexture, 0);
    gl.uniform1f(renderParticlesProgram.scale, pbfResolution);
    gl.uniformMatrix4fv(renderParticlesProgram.cameraMatrix, false, camera.cameraTransformMatrix);
    gl.uniformMatrix4fv(renderParticlesProgram.perspectiveMatrix, false, camera.perspectiveMatrix);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.drawArrays(gl.POINTS, 0, PBF.totalParticles);
    gl.disable(gl.DEPTH_TEST);

    //Check textures
    gl.viewport(1024, 0, 1024, 1024);
    gl.useProgram(textureProgram);
    webGL2.bindTexture(textureProgram.texture, Mesher.tMarchingCase, 0);
    gl.uniform1i(textureProgram.forceAlpha, true);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    currentFrame ++;

};

render();