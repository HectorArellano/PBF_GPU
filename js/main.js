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
import {calculateDisplacements} from './shaders/PBF/vs-calculateDisplacements.js'
import {calculateViscosity}     from './shaders/PBF/vs-calculateViscosity.js'


//=======================================================================================================
// Variables & Constants
//=======================================================================================================

let canvas = document.querySelector("#canvas3D");

const particlesTextureSize = 512;
const neighborsTextureSize = 512;
const bucketSize = 64;
const FOV = 30;

//Shader programs
let textureProgram,
    predictPositionsProgram,
    integrateVelocityProgram,
    renderParticlesProgram,
    calculateConstrainsProgram,
    calculateDisplacementsProgram,
    calculateViscosityProgram;

//Textures used.
let positionTexture,
    pbfTexture1,
    pbfTexture2,
    pbfTexture3,
    neighborhoodTexture;

//Buffers used.
let positionBuffer,
    pbfBuffer1,
    pbfBuffer2,
    pbfBuffer3,
    neighborhoodBuffer;

let camera = new Camera(canvas);
let cameraDistance = 3.5;

let updateSimulation = true;
let deltaTime = 0.01;
let constrainsIterations = 3;
let restDensity = 1000;
let particleMass = restDensity;
let searchRadius = 1.8;
let relaxParameter = .05;  //<<<------------------------------------------- this is very sensible
let wConstant = (315 / (64 * Math.PI * Math.pow(searchRadius, 9)));
let densityConstant = wConstant * particleMass;
let gradWconstant = -45 / (Math.PI * Math.pow(searchRadius, 6));
let tensileConstant = 40;
let tensilePower = 4;
let tensileDistance = 0.3 * searchRadius;
let viscosityConstant = .1 * 45 / (Math.PI * Math.pow(searchRadius, 6) * restDensity);

let totalParticles = 0;
let radius = bucketSize * 0.48;
let particlesPosition = [];
let particlesVelocity = [];

//Generate the position and velocity
for(let i = 0; i < bucketSize; i ++) {
    for(let j = 0; j < bucketSize; j ++) {
        for(let k = 0; k < bucketSize; k ++) {

            //Condition for the particle position and existence
            let x = i - bucketSize * 0.5;
            let y = j - bucketSize * 0.5;
            let z = k - bucketSize * 0.5;

            if(x*x + y*y + z*z < radius * radius && k < bucketSize * 0.4) {
                totalParticles ++;
                particlesPosition.push(i, j, k, 1);
                particlesVelocity.push(0, 0, 0, 0); //Velocity is zero for all the particles.
            }
        }
    }
}

console.log("total particles used: " + totalParticles);

//This fills the rest of buffer to generate the texture
for(let i = totalParticles; i < particlesTextureSize * particlesTextureSize; i ++) {
    particlesPosition.push(0, 0, 0, 0);
    particlesVelocity.push(0, 0, 0, 0);
}


//=======================================================================================================
// Context, shaders (programs), textures and buffers generation
//=======================================================================================================


webGL2.setContext(canvas);

canvas.width = 2048;
canvas.height = 1024;
canvas.style.width = String(canvas.width) + "px";
canvas.style.height = String(canvas.height) + "px";

textureProgram                                          = webGL2.generateProgram(vsQuad, fsTextureColor);
textureProgram.texture                                  = gl.getUniformLocation(textureProgram, "uTexture");

predictPositionsProgram                                 = webGL2.generateProgram(predictPositions, fsColor);
predictPositionsProgram.positionTexture                 = gl.getUniformLocation(predictPositionsProgram, "uTexturePosition");
predictPositionsProgram.velocityTexture                 = gl.getUniformLocation(predictPositionsProgram, "uTextureVelocity");
predictPositionsProgram.deltaTime                       = gl.getUniformLocation(predictPositionsProgram, "uDeltaTime");


integrateVelocityProgram                                = webGL2.generateProgram(integrateVelocity, fsColor);
integrateVelocityProgram.positionTexture                = gl.getUniformLocation(integrateVelocityProgram, "uTexturePosition");
integrateVelocityProgram.positionOldTexture             = gl.getUniformLocation(integrateVelocityProgram, "uTexturePositionOld");
integrateVelocityProgram.deltaTime                      = gl.getUniformLocation(integrateVelocityProgram, "uDeltaTime");


renderParticlesProgram                                  = webGL2.generateProgram(vsParticles, fsColor);
renderParticlesProgram.positionTexture                  = gl.getUniformLocation(renderParticlesProgram, "uTexturePosition");
renderParticlesProgram.cameraMatrix                     = gl.getUniformLocation(renderParticlesProgram, "uCameraMatrix");
renderParticlesProgram.perspectiveMatrix                = gl.getUniformLocation(renderParticlesProgram, "uPMatrix");
renderParticlesProgram.scale                            = gl.getUniformLocation(renderParticlesProgram, "uScale");
renderParticlesProgram.data                             = gl.getUniformLocation(renderParticlesProgram, "uTextureData");
renderParticlesProgram.bucketData                       = gl.getUniformLocation(renderParticlesProgram, "uBucketData");


calculateConstrainsProgram                              = webGL2.generateProgram(calculateConstrains, fsColor);
calculateConstrainsProgram.positionTexture              = gl.getUniformLocation(calculateConstrainsProgram, "uTexturePosition");
calculateConstrainsProgram.neighbors                    = gl.getUniformLocation(calculateConstrainsProgram, "uNeighbors");
calculateConstrainsProgram.bucketData                   = gl.getUniformLocation(calculateConstrainsProgram, "uBucketData");
calculateConstrainsProgram.restDensity                  = gl.getUniformLocation(calculateConstrainsProgram, "uRestDensity");
calculateConstrainsProgram.searchRadius                 = gl.getUniformLocation(calculateConstrainsProgram, "uSearchRadius");
calculateConstrainsProgram.kernelConstant               = gl.getUniformLocation(calculateConstrainsProgram, "uKernelConstant");
calculateConstrainsProgram.relaxParameter               = gl.getUniformLocation(calculateConstrainsProgram, "uRelaxParameter");
calculateConstrainsProgram.gradientKernelConstant       = gl.getUniformLocation(calculateConstrainsProgram, "uGradientKernelConstant");


calculateDisplacementsProgram                           = webGL2.generateProgram(calculateDisplacements, fsColor);
calculateDisplacementsProgram.positionTexture           = gl.getUniformLocation(calculateDisplacementsProgram, "uTexturePosition");
calculateDisplacementsProgram.neighbors                 = gl.getUniformLocation(calculateDisplacementsProgram, "uNeighbors");
calculateDisplacementsProgram.constrains                = gl.getUniformLocation(calculateDisplacementsProgram, "uConstrains");
calculateDisplacementsProgram.bucketData                = gl.getUniformLocation(calculateDisplacementsProgram, "uBucketData");
calculateDisplacementsProgram.restDensity               = gl.getUniformLocation(calculateDisplacementsProgram, "uRestDensity");
calculateDisplacementsProgram.searchRadius              = gl.getUniformLocation(calculateDisplacementsProgram, "uSearchRadius");
calculateDisplacementsProgram.gradientKernelConstant    = gl.getUniformLocation(calculateDisplacementsProgram, "uGradientKernelConstant");
calculateDisplacementsProgram.tensileConstant           = gl.getUniformLocation(calculateDisplacementsProgram, "uTensileK");
calculateDisplacementsProgram.tensilePower              = gl.getUniformLocation(calculateDisplacementsProgram, "uTensilePower");
calculateDisplacementsProgram.tensileDistance           = gl.getUniformLocation(calculateDisplacementsProgram, "uTensileDistance");


calculateViscosityProgram                               = webGL2.generateProgram(calculateViscosity, fsColor);
calculateViscosityProgram.positionTexture               = gl.getUniformLocation(calculateViscosityProgram, "uTexturePosition");
calculateViscosityProgram.velocityTexture               = gl.getUniformLocation(calculateViscosityProgram, "uTextureVelocity");
calculateViscosityProgram.neighbors                     = gl.getUniformLocation(calculateViscosityProgram, "uNeighbors");
calculateViscosityProgram.bucketData                    = gl.getUniformLocation(calculateViscosityProgram, "uBucketData");
calculateViscosityProgram.restDensity                   = gl.getUniformLocation(calculateViscosityProgram, "uRestDensity");
calculateViscosityProgram.searchRadius                  = gl.getUniformLocation(calculateViscosityProgram, "uSearchRadius");
calculateViscosityProgram.kernelConstant                = gl.getUniformLocation(calculateViscosityProgram, "uKernelConstant");


//Required textures for simulations
positionTexture     = webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesPosition));
pbfTexture1         = webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesVelocity));
pbfTexture2         = webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
pbfTexture3         = webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
neighborhoodTexture = webGL2.createTexture2D(neighborsTextureSize, neighborsTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);


//Corresponding buffers
positionBuffer      = webGL2.createDrawFramebuffer(positionTexture);
pbfBuffer1          = webGL2.createDrawFramebuffer(pbfTexture1);
pbfBuffer2          = webGL2.createDrawFramebuffer(pbfTexture2);
pbfBuffer3          = webGL2.createDrawFramebuffer(pbfTexture3);
neighborhoodBuffer  = webGL2.createDrawFramebuffer(neighborhoodTexture, true, true);


particlesPosition = null;
particlesVelocity = null;


//=======================================================================================================
// Simulation and Rendering (Particle Based Fluids
//=======================================================================================================

let render = () => {

    requestAnimationFrame(render);

    camera.updateCamera(FOV, 1, cameraDistance);

    if(updateSimulation) {

        //Apply external forces (gravity)
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, pbfBuffer2);
        gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
        gl.useProgram(predictPositionsProgram);
        gl.uniform1f(predictPositionsProgram.deltaTime, deltaTime);
        webGL2.bindTexture(predictPositionsProgram.positionTexture, positionTexture, 0);
        webGL2.bindTexture(predictPositionsProgram.velocityTexture, pbfTexture1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, totalParticles);


        //Obtain the neighbors
        searchNeighbords(pbfTexture2, neighborhoodBuffer, totalParticles, bucketSize);


        //Solve the constrains
        for(let i = 0; i < constrainsIterations; i ++) {

            //Calculate the lambdas
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, pbfBuffer3);
            gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
            gl.useProgram(calculateConstrainsProgram);
            webGL2.bindTexture(calculateConstrainsProgram.positionTexture, pbfTexture2, 0);
            webGL2.bindTexture(calculateConstrainsProgram.neighbors, neighborhoodTexture, 1);
            gl.uniform3f(calculateConstrainsProgram.bucketData, neighborhoodTexture.width, bucketSize, neighborhoodTexture.width / bucketSize);
            gl.uniform1f(calculateConstrainsProgram.restDensity, restDensity);
            gl.uniform1f(calculateConstrainsProgram.kernelConstant, densityConstant);
            gl.uniform1f(calculateConstrainsProgram.gradientKernelConstant, gradWconstant);
            gl.uniform1f(calculateConstrainsProgram.searchRadius, searchRadius);
            gl.uniform1f(calculateConstrainsProgram.relaxParameter, relaxParameter);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.POINTS, 0, totalParticles);


            //Calculate displacements
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, pbfBuffer1);
            gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
            gl.useProgram(calculateDisplacementsProgram);
            webGL2.bindTexture(calculateDisplacementsProgram.positionTexture, pbfTexture2, 0);
            webGL2.bindTexture(calculateDisplacementsProgram.neighbors, neighborhoodTexture, 1);
            webGL2.bindTexture(calculateDisplacementsProgram.constrains, pbfTexture3, 2);
            gl.uniform3f(calculateDisplacementsProgram.bucketData, neighborhoodTexture.width, bucketSize, neighborhoodTexture.width / bucketSize);
            gl.uniform1f(calculateDisplacementsProgram.restDensity, restDensity);
            gl.uniform1f(calculateDisplacementsProgram.searchRadius, searchRadius);
            gl.uniform1f(calculateDisplacementsProgram.gradientKernelConstant, gradWconstant);
            gl.uniform1f(calculateDisplacementsProgram.tensileConstant, tensileConstant);
            gl.uniform1f(calculateDisplacementsProgram.tensileDistance, tensileDistance);
            gl.uniform1f(calculateDisplacementsProgram.tensilePower, tensilePower);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.POINTS, 0, totalParticles);


            //Update data between helper textures
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, pbfBuffer2);
            gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
            gl.useProgram(textureProgram);
            webGL2.bindTexture(textureProgram.texture, pbfTexture1, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        }

        //Integrate the velocity
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, pbfBuffer3);
        gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
        gl.useProgram(integrateVelocityProgram);
        gl.uniform1f(integrateVelocityProgram.deltaTime, deltaTime);
        webGL2.bindTexture(integrateVelocityProgram.positionTexture, pbfTexture2, 0);
        webGL2.bindTexture(integrateVelocityProgram.positionOldTexture, positionTexture, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, totalParticles);


        //Apply viscosity
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, pbfBuffer1);
        gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
        gl.useProgram(calculateViscosityProgram);
        webGL2.bindTexture(calculateViscosityProgram.positionTexture, pbfTexture2, 0);
        webGL2.bindTexture(calculateViscosityProgram.velocityTexture, pbfTexture3, 1);
        webGL2.bindTexture(calculateViscosityProgram.neighbors, neighborhoodTexture, 2);
        gl.uniform3f(calculateViscosityProgram.bucketData, neighborhoodTexture.width, bucketSize, neighborhoodTexture.width / bucketSize);
        gl.uniform1f(calculateViscosityProgram.restDensity, restDensity);
        gl.uniform1f(calculateViscosityProgram.searchRadius, searchRadius);
        gl.uniform1f(calculateViscosityProgram.kernelConstant, viscosityConstant);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, totalParticles);


        //Update the positions.
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, positionBuffer);
        gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
        gl.useProgram(textureProgram);
        webGL2.bindTexture(textureProgram.texture, pbfTexture2, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }


    //Render particles
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.viewport(0, 0, 1024, 1024);
    gl.useProgram(renderParticlesProgram);
    webGL2.bindTexture(renderParticlesProgram.positionTexture, positionTexture, 0);
    webGL2.bindTexture(renderParticlesProgram.data, pbfTexture3, 1);
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
}

document.body.addEventListener("keydown", (e) => {updateSimulation = !updateSimulation;});

render();
