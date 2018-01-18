import {gl}                     from './utils/webGL2.js';
import * as webGL2              from './utils/webGL2.js';
import {searchNeighbords}       from './utils/neightborhoodSearch.js';
import {vsQuad}                 from './shaders/utils/vs-quad.js';
import {fsTextureColor}         from './shaders/utils/fs-simpleTexture.js';
import {predictPositions}       from './shaders/PBF/vs-applyForces.js';
import {fsColor}                from './shaders/utils/fs-simpleColor.js';
import {integrateVelocity}      from './shaders/PBF/vs-integrateVelocity.js';
import {Camera}                 from './utils/camera.js';
import {vsParticles}            from './shaders/utils/vs-renderParticles.js'
import {calculateConstrains}    from './shaders/PBF/vs-calculateConstrains.js'


//=======================================================================================================
// Variables & Constants
//=======================================================================================================

let canvas = document.querySelector("#canvas3D");

const particlesTextureSize = 512;
const neighborsTextureSize = 512;
const bucketSize = 64;
const deltaTime = 0.02;
const FOV = 30;
let cameraDistance = 3.5;
let updateSimulation = false;
let constrainsIterations = 3;

let textureProgram, predictPositionsProgram, integrateVelocityProgram, totalParticles, renderParticlesProgram, calculateConstrainsProgram;
let positionTexture, positionHelper1Texture, positionHelper2Texture, velocityTexture, velocityHelper1Texture;  //Positions and velocities textures for the particles
let positionBuffer, velocityBuffer, positionHelper1Buffer, positionHelper2Buffer, velocityHelper1Buffer;
let neighborhoodTexture, neighborhoodBuffer;

let lambdaTexture, lambdaBuffer;

let camera = new Camera(canvas);

let restDensity = 1000;
let particleMass = restDensity;
let searchRadius = 1.9;
let relaxParameter = 0.095;  //<<<----- this requires checking
let wConstant = (315 / (64 * Math.PI * Math.pow(searchRadius, 9)));
let densityConstant = wConstant * particleMass;
let gradWconstant = -45 / (Math.PI * Math.pow(searchRadius, 6));

//=======================================================================================================
// Context and shaders generation
//=======================================================================================================

webGL2.setContext(canvas);

canvas.width = 2048;
canvas.height = 1024;
canvas.style.width = String(canvas.width) + "px";
canvas.style.height = String(canvas.height) + "px";

textureProgram                                      = webGL2.generateProgram(vsQuad, fsTextureColor);
textureProgram.texture                              = gl.getUniformLocation(textureProgram, "uTexture");

predictPositionsProgram                             = webGL2.generateProgram(predictPositions, fsColor);
predictPositionsProgram.positionTexture             = gl.getUniformLocation(predictPositionsProgram, "uTexturePosition");
predictPositionsProgram.velocityTexture             = gl.getUniformLocation(predictPositionsProgram, "uTextureVelocity");
predictPositionsProgram.deltaTime                   = gl.getUniformLocation(predictPositionsProgram, "uDeltaTime");

integrateVelocityProgram                            = webGL2.generateProgram(integrateVelocity, fsColor);
integrateVelocityProgram.positionTexture            = gl.getUniformLocation(integrateVelocityProgram, "uTexturePosition");
integrateVelocityProgram.positionOldTexture         = gl.getUniformLocation(integrateVelocityProgram, "uTexturePositionOld");
integrateVelocityProgram.deltaTime                  = gl.getUniformLocation(integrateVelocityProgram, "uDeltaTime");

renderParticlesProgram                              = webGL2.generateProgram(vsParticles, fsColor);
renderParticlesProgram.positionTexture              = gl.getUniformLocation(renderParticlesProgram, "uTexturePosition");
renderParticlesProgram.cameraMatrix                 = gl.getUniformLocation(renderParticlesProgram, "uCameraMatrix");
renderParticlesProgram.perspectiveMatrix            = gl.getUniformLocation(renderParticlesProgram, "uPMatrix");
renderParticlesProgram.scale                        = gl.getUniformLocation(renderParticlesProgram, "uScale");
renderParticlesProgram.data                         = gl.getUniformLocation(renderParticlesProgram, "uTextureData");
renderParticlesProgram.bucketData                   = gl.getUniformLocation(renderParticlesProgram, "uBucketData");

calculateConstrainsProgram                          = webGL2.generateProgram(calculateConstrains, fsColor);
calculateConstrainsProgram.positionTexture          = gl.getUniformLocation(calculateConstrainsProgram, "uTexturePosition");
calculateConstrainsProgram.neighbors                = gl.getUniformLocation(calculateConstrainsProgram, "uNeighbors");
calculateConstrainsProgram.bucketData               = gl.getUniformLocation(calculateConstrainsProgram, "uBucketData");
calculateConstrainsProgram.restDensity              = gl.getUniformLocation(calculateConstrainsProgram, "uRestDensity");
calculateConstrainsProgram.searchRadius             = gl.getUniformLocation(calculateConstrainsProgram, "uSearchRadius");
calculateConstrainsProgram.kernelConstant           = gl.getUniformLocation(calculateConstrainsProgram, "uKernelConstant");
calculateConstrainsProgram.relaxParameter           = gl.getUniformLocation(calculateConstrainsProgram, "uRelaxParameter");
calculateConstrainsProgram.gradientKernelConstant   = gl.getUniformLocation(calculateConstrainsProgram, "uGradientKernelConstant");



//=======================================================================================================
// Particles Generation (Textures, buffers...)
//=======================================================================================================

totalParticles = 0;
let boxSize = bucketSize * 0.3;
let radius = 18;
let particlesPosition = [];
let particlesVelocity = [];

//Generate the position and velocity
for(let i = 0; i < bucketSize; i ++) {
    for(let j = 0; j < bucketSize; j ++) {
        for(let k = 0; k < bucketSize; k ++) {

//            //Condition for the particle position and existence
//            let x = i - bucketSize * 0.5;
//            let y = j - bucketSize * 0.3;
//            let z = k - bucketSize * 0.5;
//
//            if(x*x + y*y + z*z < radius * radius) {
//                totalParticles ++;
//                particlesPosition.push(i, j, k, 1);
//                particlesVelocity.push(0, 0, 0, 0); //Velocity is zero for all the particles.
//            }
//
//            y = j - bucketSize * 0.7;
//            if(x*x + y*y + z*z < radius * radius) {
//                totalParticles ++;
//                particlesPosition.push(i, j, k, 1);
//                particlesVelocity.push(0, 0, 0, 0); //Velocity is zero for all the particles.
//            }

            //Define planes of three layers to check density
            if(Math.abs(j - bucketSize * 0.5) < boxSize && Math.abs(i - bucketSize * 0.5) < boxSize && Math.abs(k - bucketSize * 0.5) < boxSize) {
                totalParticles ++;
                particlesPosition.push(i + 0., j + 0., k + 0., 1);
                particlesVelocity.push(0, 0, 0, 0); //Velocity is zero for all the particles.
            }
        }
    }
}

console.log("the total particles are: " + totalParticles);

//This fills the rest of buffer to generate the texture
for(let i = totalParticles; i < particlesTextureSize * particlesTextureSize; i ++) {
    particlesPosition.push(0, 0, 0, 0);
    particlesVelocity.push(0, 0, 0, 0);
}

//Required textures for simulations
positionTexture         = webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesPosition));
positionHelper1Texture  = webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
positionHelper2Texture  = webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
velocityTexture         = webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesVelocity));
velocityHelper1Texture  = webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
neighborhoodTexture     = webGL2.createTexture2D(neighborsTextureSize, neighborsTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);

lambdaTexture           = webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);

//Corresponding buffers
positionBuffer          = webGL2.createDrawFramebuffer(positionTexture);
positionHelper1Buffer   = webGL2.createDrawFramebuffer(positionHelper1Texture);
positionHelper2Buffer   = webGL2.createDrawFramebuffer(positionHelper2Texture);
velocityBuffer          = webGL2.createDrawFramebuffer(velocityTexture);
velocityHelper1Buffer   = webGL2.createDrawFramebuffer(velocityHelper1Texture);
neighborhoodBuffer      = webGL2.createDrawFramebuffer(neighborhoodTexture, true, true);

lambdaBuffer            = webGL2.createDrawFramebuffer(lambdaTexture);


particlesPosition = null;
particlesVelocity = null;



//=======================================================================================================
// Simulation and Rendering (Particle Based Fluids
//=======================================================================================================

let render = () => {

    requestAnimationFrame(render);

    camera.updateCamera(FOV, 1, cameraDistance);

    if(updateSimulation) {
//        //Apply external forces (gravity)
//        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, positionHelper1Buffer);
//        gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
//        gl.useProgram(predictPositionsProgram);
//        gl.uniform1f(predictPositionsProgram.deltaTime, deltaTime);
//        webGL2.bindTexture(predictPositionsProgram.positionTexture, positionTexture, 0);
//        webGL2.bindTexture(predictPositionsProgram.velocityTexture, velocityTexture, 1);
//        gl.clear(gl.COLOR_BUFFER_BIT);
//        gl.drawArrays(gl.POINTS, 0, totalParticles);


        //Obtain the neighbors
        searchNeighbords(positionTexture, neighborhoodBuffer, totalParticles, bucketSize);

        //Solve the constrains
        for(let i = 0; i < constrainsIterations; i ++) solveConstrains();

//        //Integrate the velocity
//        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, velocityBuffer);
//        gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
//        gl.useProgram(integrateVelocityProgram);
//        gl.uniform1f(integrateVelocityProgram.deltaTime, deltaTime);
//        webGL2.bindTexture(integrateVelocityProgram.positionTexture, positionHelper1Texture, 0);
//        webGL2.bindTexture(integrateVelocityProgram.positionOldTexture, positionTexture, 1);
//        gl.clear(gl.COLOR_BUFFER_BIT);
//        gl.drawArrays(gl.POINTS, 0, totalParticles);


//        //Set the position in the original texture
//        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, positionBuffer);
//        gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
//        gl.useProgram(textureProgram);
//        webGL2.bindTexture(textureProgram.texture, positionHelper1Texture, 0);
//        gl.clear(gl.COLOR_BUFFER_BIT);
//        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    //Render particles
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.viewport(0, 0, 1024, 1024);
    gl.useProgram(renderParticlesProgram);
    webGL2.bindTexture(renderParticlesProgram.positionTexture, positionTexture, 0);
    webGL2.bindTexture(renderParticlesProgram.data, lambdaTexture, 1);
    gl.uniform1f(renderParticlesProgram.scale, bucketSize);
    gl.uniform3f(renderParticlesProgram.bucketData, neighborhoodTexture.width, bucketSize, neighborhoodTexture.width / bucketSize);
    gl.uniformMatrix4fv(renderParticlesProgram.cameraMatrix, false, camera.cameraTransformMatrix);
    gl.uniformMatrix4fv(renderParticlesProgram.perspectiveMatrix, false, camera.perspectiveMatrix);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.drawArrays(gl.POINTS, 0, totalParticles);
    gl.disable(gl.DEPTH_TEST);


    //Check textures
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.viewport(1024, 0, 1024, 1024);
    gl.useProgram(textureProgram);
    webGL2.bindTexture(textureProgram.texture, neighborhoodTexture, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    updateSimulation = false;
}

document.body.addEventListener("keydown", (e) => {updateSimulation = true;});

render();

//=======================================================================================================
// Constrains iterations section (calculation of lambdas and repositioning with collisions
//=======================================================================================================

let solveConstrains = () => {

    //Calculate the lambdas
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, lambdaBuffer);
    gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
    gl.useProgram(calculateConstrainsProgram);
    webGL2.bindTexture(calculateConstrainsProgram.positionTexture, positionTexture, 0);
    webGL2.bindTexture(calculateConstrainsProgram.neighbors, neighborhoodTexture, 1);
    gl.uniform3f(calculateConstrainsProgram.bucketData, neighborhoodTexture.width, bucketSize, neighborhoodTexture.width / bucketSize);
    gl.uniform1f(calculateConstrainsProgram.restDensity, restDensity);
    gl.uniform1f(calculateConstrainsProgram.kernelConstant, densityConstant);
    gl.uniform1f(calculateConstrainsProgram.gradientKernelConstant, gradWconstant);
    gl.uniform1f(calculateConstrainsProgram.searchRadius, searchRadius);
    gl.uniform1f(calculateConstrainsProgram.relaxParameter, relaxParameter);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, totalParticles);

}