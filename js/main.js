import {gl}                     from './utils/webGL2.js';
import * as webGL2              from './utils/webGL2.js';
import * as PBF                 from './pbf.js';
import * as Mesher              from './mesher.js';
import * as Brick               from './utils/brick.js';
import {Camera}                 from './utils/camera.js';
import {vsParticles}            from './shaders/utils/vs-renderParticles.js'
import {fsColor}                from './shaders/utils/fs-simpleColor.js';
import {fsTextureColor}         from './shaders/utils/fs-simpleTexture.js';
import {vsQuad}                 from './shaders/utils/vs-quad.js';

import {vsBrick}                from './shaders/utils/vs-brick.js';
import {fsBrick}                from './shaders/utils/fs-brick.js';

//=======================================================================================================
// Variables & Constants
//=======================================================================================================

let canvas = document.querySelector("#canvas3D");
canvas.height = 1024;
canvas.width = canvas.height * 2;
canvas.style.width = String(canvas.width) + "px";
canvas.style.height = String(canvas.height) + "px";
webGL2.setContext(canvas);


let camera = new Camera(canvas);
let cameraDistance = 2.5;
let FOV = 30;

//For the Position Based Fluids
let updateSimulation = true;
let deltaTime = 0.01;
let constrainsIterations = 1;
let pbfResolution = 55;
let voxelTextureSize = Math.ceil(Math.sqrt(Math.pow(pbfResolution, 3)));
let particlesTextureSize = 1000;
let particlesPosition = [];
let particlesVelocity = []
let currentFrame = 0;

////Change these values to change marching cubes resolution (128/2048/1024 or 256/4096/2048)
//let resolution = 128;
//let expandedTextureSize = 2048;
//let expandedBuckets = 16;
//let compressedTextureSize = 1024;
//let compressedBuckets = 8;
//let depthLevels = 64;
//let compactTextureSize = 1500;
//let particleSize = 3.;
//let blurSteps = 10;
//let range = 0.26;
//let maxCells = 3.5;
//let fastNormals = false;

Brick.generate();

let radius = pbfResolution * 0.39;
let totalParticles = 0;
//Generate the position and velocity
for (let i = 0; i < pbfResolution; i++) {
    for (let j = 0; j < pbfResolution; j++) {
        for (let k = 0; k < pbfResolution; k++) {

            //Condition for the particle position and existence
            let x = i - pbfResolution * 0.5;
            let y = j - pbfResolution * 0.5;
            let z = k - pbfResolution * 0.5;

            if (x * x + y * y + z * z < radius * radius && k < pbfResolution * 0.4) {
                totalParticles ++;
                particlesPosition.push(i, j, k, 1);
                particlesVelocity.push(0, 0, 0, 0); //Velocity is zero for all the particles.
            }
        }
    }
}

let renderParticlesProgram = webGL2.generateProgram(vsParticles, fsColor);
renderParticlesProgram.positionTexture = gl.getUniformLocation(renderParticlesProgram, "uTexturePosition");
renderParticlesProgram.cameraMatrix = gl.getUniformLocation(renderParticlesProgram, "uCameraMatrix");
renderParticlesProgram.perspectiveMatrix = gl.getUniformLocation(renderParticlesProgram, "uPMatrix");
renderParticlesProgram.scale = gl.getUniformLocation(renderParticlesProgram, "uScale");

let textureProgram = webGL2.generateProgram(vsQuad, fsTextureColor);
textureProgram.texture = gl.getUniformLocation(textureProgram, "uTexture");
textureProgram.forceAlpha = gl.getUniformLocation(textureProgram, "uForceAlpha");

let brickProgram = webGL2.generateProgram(vsBrick, fsBrick);
brickProgram.vertices = gl.getAttribLocation(brickProgram, "vertex");
brickProgram.normals = gl.getAttribLocation(brickProgram, "normal");
brickProgram.cameraMatrix = gl.getUniformLocation(brickProgram, "uCameraMatrix");
brickProgram.perspectiveMatrix = gl.getUniformLocation(brickProgram, "uPMatrix");
brickProgram.scale = gl.getUniformLocation(brickProgram, "uScale");
brickProgram.positionTexture = gl.getUniformLocation(brickProgram, "uTexturePosition");
brickProgram.cameraPosition = gl.getUniformLocation(brickProgram, "uEye");


//=======================================================================================================
// Simulation and Rendering (Position based fluids)
//=======================================================================================================

//Initiate the position based fluids solver
PBF.init(particlesPosition, particlesVelocity, pbfResolution, voxelTextureSize, particlesTextureSize);
particlesPosition = null;
particlesVelocity = null;

let render = () => {

    requestAnimationFrame(render);

    camera.updateCamera(FOV, 1, cameraDistance);
    let acceleration = {
        x: 0 * Math.sin(currentFrame * Math.PI / 180),
        y: -10,
        z: 0 * Math.cos(currentFrame * Math.PI / 180)
    }


    if (updateSimulation) {
        //Update the simulation
        PBF.updateFrame(acceleration, deltaTime, constrainsIterations);

        currentFrame++;
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


    //Render the brick
    gl.viewport(canvas.height * 2 / 3, 0, canvas.height, canvas.height);
    gl.useProgram(brickProgram);
    webGL2.bindAttribBuffer(brickProgram.vertices, Brick.verticesBuffer, 3);
    webGL2.bindAttribBuffer(brickProgram.normals, Brick.normalsBuffer, 3);
    webGL2.bindTexture(brickProgram.positionTexture, PBF.positionTexture, 0);
    gl.uniform1f(brickProgram.scale, pbfResolution);
    gl.uniform3f(brickProgram.cameraPosition, camera.position[0], camera.position[1], camera.position[2]);
    gl.uniformMatrix4fv(brickProgram.cameraMatrix, false, camera.cameraTransformMatrix);
    gl.uniformMatrix4fv(brickProgram.perspectiveMatrix, false, camera.perspectiveMatrix);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Brick.indexesBuffer);
    gl.enable(gl.DEPTH_TEST);
    gl.drawElementsInstanced(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0, totalParticles);
    gl.disable(gl.DEPTH_TEST);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.disableVertexAttribArray(brickProgram.positions);
    gl.disableVertexAttribArray(brickProgram.normals);

};

document.body.addEventListener("keypress", () => {
    updateSimulation = !updateSimulation;
})

render();