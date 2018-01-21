import {gl}                     from './utils/webGL2.js';
import * as webGL2              from './utils/webGL2.js';
import * as PBF                 from './pbf.js';
import * as Mesher              from './mesher.js';
import {Camera}                 from './utils/camera.js';
import {vsParticles}            from './shaders/utils/vs-renderParticles.js'
import {fsColor}                from './shaders/utils/fs-simpleColor.js';


//=======================================================================================================
// Variables & Constants
//=======================================================================================================

let canvas = document.querySelector("#canvas3D");
canvas.width = 1024;
canvas.height = 1024;
canvas.style.width = String(canvas.width) + "px";
canvas.style.height = String(canvas.height) + "px";
webGL2.setContext(canvas);


let camera = new Camera(canvas);
let cameraDistance = 3.5;
let FOV = 30;

//For the Positionn Based Fluids
let bucketSize = 128;
let voxelTextureSize = 2048;
let particlesTextureSize = 1024;
let particlesPosition = [];
let particlesVelocity = [];
let radius = bucketSize * 0.39;
let currentFrame = 0;

//For the mesher
let resolution = 128;
let expandedTexturSize = 2048;
let compressedTextureSize = 1024;
let compactTextureSize = 3500;


//Generate the position and velocity
for(let i = 0; i < bucketSize; i ++) {
    for(let j = 0; j < bucketSize; j ++) {
        for(let k = 0; k < bucketSize; k ++) {

            //Condition for the particle position and existence
            let x = i - bucketSize * 0.5;
            let y = j - bucketSize * 0.5;
            let z = k - bucketSize * 0.5;

            if(x*x + y*y + z*z < radius * radius && k < bucketSize * 0.5) {
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


//=======================================================================================================
// Simulation and Rendering (Position based fluids)
//=======================================================================================================

//Initiate the position based fluids solver
PBF.init(particlesPosition, particlesVelocity, bucketSize, voxelTextureSize, particlesTextureSize);
particlesPosition = null;
particlesVelocity = null;

//Initiate the mesher generator
Mesher.init(resolution, expandedTexturSize, compressedTextureSize, compactTextureSize);

let render = () => {

    requestAnimationFrame(render);

    camera.updateCamera(FOV, 1, cameraDistance);
    let acceleration = {x:0* Math.sin(currentFrame * Math.PI / 180), y:-10,  z:0* Math.cos(currentFrame * Math.PI / 180)}

    PBF.updateFrame(acceleration);

    //Render particles
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(renderParticlesProgram);
    webGL2.bindTexture(renderParticlesProgram.positionTexture, PBF.positionTexture, 0);
    gl.uniform1f(renderParticlesProgram.scale, bucketSize);
    gl.uniformMatrix4fv(renderParticlesProgram.cameraMatrix, false, camera.cameraTransformMatrix);
    gl.uniformMatrix4fv(renderParticlesProgram.perspectiveMatrix, false, camera.perspectiveMatrix);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.drawArrays(gl.POINTS, 0, PBF.totalParticles);
    gl.disable(gl.DEPTH_TEST);

    currentFrame ++;

};

render();