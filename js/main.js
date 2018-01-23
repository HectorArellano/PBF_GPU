import {gl}                     from './utils/webGL2.js';
import * as webGL2              from './utils/webGL2.js';
import * as PBF                 from './pbf.js';
import * as Mesher              from './mesher.js';
import {Camera}                 from './utils/camera.js';
import {vsParticles}            from './shaders/utils/vs-renderParticles.js'
import {fsColor}                from './shaders/utils/fs-simpleColor.js';
import {fsTextureColor}         from './shaders/utils/fs-simpleTexture.js';
import {vsQuad}                 from './shaders/utils/vs-quad.js';
import {vsPhongTriangles}       from './shaders/utils/vs-phongTriangles.js';
import {fsPhongTriangles}       from './shaders/utils/fs-phongTriangles.js';


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

let renderParticlesProgram                              = webGL2.generateProgram(vsParticles, fsColor);
renderParticlesProgram.positionTexture                  = gl.getUniformLocation(renderParticlesProgram, "uTexturePosition");
renderParticlesProgram.cameraMatrix                     = gl.getUniformLocation(renderParticlesProgram, "uCameraMatrix");
renderParticlesProgram.perspectiveMatrix                = gl.getUniformLocation(renderParticlesProgram, "uPMatrix");
renderParticlesProgram.scale                            = gl.getUniformLocation(renderParticlesProgram, "uScale");

let textureProgram                                      = webGL2.generateProgram(vsQuad, fsTextureColor);
textureProgram.texture                                  = gl.getUniformLocation(textureProgram, "uTexture");
textureProgram.forceAlpha                               = gl.getUniformLocation(textureProgram, "uForceAlpha");

let phongTrianglesProgram                               = webGL2.generateProgram(vsPhongTriangles, fsPhongTriangles);
phongTrianglesProgram.cameraMatrix                      = gl.getUniformLocation(phongTrianglesProgram, "uCameraMatrix");
phongTrianglesProgram.perspectiveMatrix                 = gl.getUniformLocation(phongTrianglesProgram, "uPMatrix");
phongTrianglesProgram.textureTriangles                  = gl.getUniformLocation(phongTrianglesProgram, "uTT");
phongTrianglesProgram.textureNormals                    = gl.getUniformLocation(phongTrianglesProgram, "uTN");
phongTrianglesProgram.cameraPosition                    = gl.getUniformLocation(phongTrianglesProgram, "uEye");


//=======================================================================================================
// Simulation and Rendering (Position based fluids)
//=======================================================================================================

//Initiate the position based fluids solver
PBF.init(particlesPosition, particlesVelocity, pbfResolution, voxelTextureSize, particlesTextureSize);
particlesPosition = null;
particlesVelocity = null;

//Initiate the mesher generator
Mesher.init(resolution, expandedTextureSize, compressedTextureSize, compactTextureSize, compressedBuckets, expandedBuckets);

let render = () => {

    requestAnimationFrame(render);

    camera.updateCamera(FOV, 1, cameraDistance);
    let acceleration = {x:0* Math.sin(currentFrame * Math.PI / 180), y:-10,  z:0* Math.cos(currentFrame * Math.PI / 180)}


    if(updateSimulation) {
        //Update the simulation
        if(currentFrame % 2 ==1) PBF.updateFrame(acceleration, deltaTime, constrainsIterations);

        //Generate the mesh from the simulation particles
        if(currentFrame % 2 ==0) Mesher.generateMesh(PBF.positionTexture, PBF.totalParticles, pbfResolution, particleSize, blurSteps, range, maxCells, fastNormals);

        currentFrame ++;

    }


    //Render particles
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.height, canvas.height);
    gl.useProgram(renderParticlesProgram);
    webGL2.bindTexture(renderParticlesProgram.positionTexture, PBF.positionTexture, 0);
    gl.uniform1f(renderParticlesProgram.scale, pbfResolution);
    gl.uniformMatrix4fv(renderParticlesProgram.cameraMatrix, false, camera.cameraTransformMatrix);
    gl.uniformMatrix4fv(renderParticlesProgram.perspectiveMatrix, false, camera.perspectiveMatrix);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.drawArrays(gl.POINTS, 0, PBF.totalParticles);
    gl.disable(gl.DEPTH_TEST);


    let activeMCells = Math.ceil(maxCells * expandedTextureSize * expandedTextureSize / 100);


    //Render the triangles
    gl.useProgram(phongTrianglesProgram);
    gl.viewport(canvas.height, 0, canvas.height, canvas.height);
    webGL2.bindTexture(phongTrianglesProgram.textureTriangles, Mesher.tTriangles, 0);
    webGL2.bindTexture(phongTrianglesProgram.textureNormals, Mesher.tNormals, 1);
    gl.uniformMatrix4fv(phongTrianglesProgram.cameraMatrix, false, camera.cameraTransformMatrix);
    gl.uniformMatrix4fv(phongTrianglesProgram.perspectiveMatrix, false, camera.perspectiveMatrix);
    gl.uniform3f(phongTrianglesProgram.cameraPosition, camera.position[0], camera.position[1], camera.position[2]);
    gl.enable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLES, 0, 15 * activeMCells);
    gl.disable(gl.DEPTH_TEST);


};

document.body.addEventListener("keypress", ()=> {
    updateSimulation = !updateSimulation;
})

render();