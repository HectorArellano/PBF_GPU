import {gl}                     from './utils/webGL2.js';
import * as webGL2              from './utils/webGL2.js';
import {searchNeighbords}       from './utils/neightborhoodSearch.js';

//Shaders
import {predictPositions}       from './shaders/PBF/vs-applyForces.js';
import {integrateVelocity}      from './shaders/PBF/vs-integrateVelocity.js';
import {calculateConstrains}    from './shaders/PBF/vs-calculateConstrains.js'
import {calculateDisplacements} from './shaders/PBF/vs-calculateDisplacements.js'
import {calculateViscosity}     from './shaders/PBF/vs-calculateViscosity.js'
import {vsQuad}                 from './shaders/utils/vs-quad.js';
import {fsTextureColor}         from './shaders/utils/fs-simpleTexture.js';
import {fsColor}                from './shaders/utils/fs-simpleColor.js';


//=======================================================================================================
// Variables & Constants
//=======================================================================================================

let particlesTextureSize;
let bucketSize;
let voxelsTextureSize; // Math.ceil(Math.sqrt(Math.pow(bucketSize, 3)));


//Shader programs
let textureProgram,
    predictPositionsProgram,
    integrateVelocityProgram,
    calculateConstrainsProgram,
    calculateDisplacementsProgram,
    calculateViscosityProgram;


//Textures used.
let positionTexture,
    velocityTexture,
    pbfTexture1,
    pbfTexture2,
    voxelsTexture;


//Buffers used.
let positionBuffer,
    velocityBuffer,
    pbfBuffer1,
    pbfBuffer2,
    voxelsBuffer;


let restDensity = 1000;
let searchRadius = 1.8;
let relaxParameter = .05;  //<<<------------------------------------------- this is very sensible
let tensileConstant = 40;
let tensilePower = 4;
let tensileDistanceMultiplier = 0.3;
let viscosity = 0.1;
let totalParticles = 0;


let particleMass = restDensity; //This comes from mass = density * volume / totalParticles ===> 1000 * bucketSize^3 / bucketSize^3
let wConstant = (315 / (64 * Math.PI * Math.pow(searchRadius, 9)));
let densityConstant = wConstant * particleMass;
let gradWconstant = -45 / (Math.PI * Math.pow(searchRadius, 6));
let viscosityConstant = viscosity * 45 / (Math.PI * Math.pow(searchRadius, 6) * restDensity);
let tensileDistance = tensileDistanceMultiplier * searchRadius;


//=======================================================================================================
// This is used to initiate the simulator
//=======================================================================================================

let init = (particlesPosition, particlesVelocity, _bucketSize, _voxelsTextureSize, _particlesTextureSize) => {

    bucketSize = _bucketSize;
    voxelsTextureSize = _voxelsTextureSize;
    particlesTextureSize = _particlesTextureSize;
    totalParticles = particlesPosition.length / 4.;


    //This fills the rest of buffer to generate the texture
    for(let i = totalParticles; i < particlesTextureSize * particlesTextureSize; i ++) {
        particlesPosition.push(0, 0, 0, 0);
        particlesVelocity.push(0, 0, 0, 0);
    }

    console.log("===============================");
    console.log("Position Based Fluids simulator:")
    console.log("total particles are: " + totalParticles);
    console.log("particles texture size is: " + particlesTextureSize);
    console.log("neighbors texture size is: " + voxelsTextureSize);
    console.log("===============================");

    textureProgram                                          = webGL2.generateProgram(vsQuad, fsTextureColor);
    textureProgram.texture                                  = gl.getUniformLocation(textureProgram, "uTexture");

    predictPositionsProgram                                 = webGL2.generateProgram(predictPositions, fsColor);
    predictPositionsProgram.positionTexture                 = gl.getUniformLocation(predictPositionsProgram, "uTexturePosition");
    predictPositionsProgram.velocityTexture                 = gl.getUniformLocation(predictPositionsProgram, "uTextureVelocity");
    predictPositionsProgram.deltaTime                       = gl.getUniformLocation(predictPositionsProgram, "uDeltaTime");
    predictPositionsProgram.acceleration                    = gl.getUniformLocation(predictPositionsProgram, "uAcceleration");


    integrateVelocityProgram                                = webGL2.generateProgram(integrateVelocity, fsColor);
    integrateVelocityProgram.positionTexture                = gl.getUniformLocation(integrateVelocityProgram, "uTexturePosition");
    integrateVelocityProgram.positionOldTexture             = gl.getUniformLocation(integrateVelocityProgram, "uTexturePositionOld");
    integrateVelocityProgram.deltaTime                      = gl.getUniformLocation(integrateVelocityProgram, "uDeltaTime");


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
    positionTexture = webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesPosition));
    velocityTexture = webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesVelocity));
    pbfTexture1     = webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
    pbfTexture2     = webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
    voxelsTexture   = webGL2.createTexture2D(voxelsTextureSize, voxelsTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);


    //Corresponding buffers
    positionBuffer = webGL2.createDrawFramebuffer(positionTexture);
    velocityBuffer = webGL2.createDrawFramebuffer(velocityTexture);
    pbfBuffer1     = webGL2.createDrawFramebuffer(pbfTexture1);
    pbfBuffer2     = webGL2.createDrawFramebuffer(pbfTexture2);
    voxelsBuffer   = webGL2.createDrawFramebuffer(voxelsTexture, true, true);
}


//=======================================================================================================
// Simulation and Rendering (Particle Based Fluids
//=======================================================================================================

let updateFrame = (acceleration, deltaTime, constrainsIterations) => {

    //Apply external forces (gravity)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, pbfBuffer1);
    gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
    gl.useProgram(predictPositionsProgram);
    gl.uniform1f(predictPositionsProgram.deltaTime, deltaTime);
    gl.uniform3f(predictPositionsProgram.acceleration, acceleration.x, acceleration.y, acceleration.z);
    webGL2.bindTexture(predictPositionsProgram.positionTexture, positionTexture, 0);
    webGL2.bindTexture(predictPositionsProgram.velocityTexture, velocityTexture, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, totalParticles);


    //Obtain the neighbors
    searchNeighbords(pbfTexture1, voxelsBuffer, totalParticles, bucketSize);


    //Solve the constrains
    for(let i = 0; i < constrainsIterations; i ++) {

        //Calculate the lambdas
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, pbfBuffer2);
        gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
        gl.useProgram(calculateConstrainsProgram);
        webGL2.bindTexture(calculateConstrainsProgram.positionTexture, pbfTexture1, 0);
        webGL2.bindTexture(calculateConstrainsProgram.neighbors, voxelsTexture, 1);
        gl.uniform3f(calculateConstrainsProgram.bucketData, voxelsTexture.width, bucketSize, voxelsTexture.width / bucketSize);
        gl.uniform1f(calculateConstrainsProgram.restDensity, restDensity);
        gl.uniform1f(calculateConstrainsProgram.kernelConstant, densityConstant);
        gl.uniform1f(calculateConstrainsProgram.gradientKernelConstant, gradWconstant);
        gl.uniform1f(calculateConstrainsProgram.searchRadius, searchRadius);
        gl.uniform1f(calculateConstrainsProgram.relaxParameter, relaxParameter);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, totalParticles);


        //Calculate displacements
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, velocityBuffer);
        gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
        gl.useProgram(calculateDisplacementsProgram);
        webGL2.bindTexture(calculateDisplacementsProgram.positionTexture, pbfTexture1, 0);
        webGL2.bindTexture(calculateDisplacementsProgram.neighbors, voxelsTexture, 1);
        webGL2.bindTexture(calculateDisplacementsProgram.constrains, pbfTexture2, 2);
        gl.uniform3f(calculateDisplacementsProgram.bucketData, voxelsTexture.width, bucketSize, voxelsTexture.width / bucketSize);
        gl.uniform1f(calculateDisplacementsProgram.restDensity, restDensity);
        gl.uniform1f(calculateDisplacementsProgram.searchRadius, searchRadius);
        gl.uniform1f(calculateDisplacementsProgram.gradientKernelConstant, gradWconstant);
        gl.uniform1f(calculateDisplacementsProgram.tensileConstant, tensileConstant);
        gl.uniform1f(calculateDisplacementsProgram.tensileDistance, tensileDistance);
        gl.uniform1f(calculateDisplacementsProgram.tensilePower, tensilePower);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, totalParticles);


        //Update data between helper textures
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, pbfBuffer1);
        gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
        gl.useProgram(textureProgram);
        webGL2.bindTexture(textureProgram.texture, velocityTexture, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    }

    //Integrate the velocity
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, pbfBuffer2);
    gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
    gl.useProgram(integrateVelocityProgram);
    gl.uniform1f(integrateVelocityProgram.deltaTime, deltaTime);
    webGL2.bindTexture(integrateVelocityProgram.positionTexture, pbfTexture1, 0);
    webGL2.bindTexture(integrateVelocityProgram.positionOldTexture, positionTexture, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, totalParticles);


    //Apply viscosity
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, velocityBuffer);
    gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
    gl.useProgram(calculateViscosityProgram);
    webGL2.bindTexture(calculateViscosityProgram.positionTexture, pbfTexture1, 0);
    webGL2.bindTexture(calculateViscosityProgram.velocityTexture, pbfTexture2, 1);
    webGL2.bindTexture(calculateViscosityProgram.neighbors, voxelsTexture, 2);
    gl.uniform3f(calculateViscosityProgram.bucketData, voxelsTexture.width, bucketSize, voxelsTexture.width / bucketSize);
    gl.uniform1f(calculateViscosityProgram.restDensity, restDensity);
    gl.uniform1f(calculateViscosityProgram.searchRadius, searchRadius);
    gl.uniform1f(calculateViscosityProgram.kernelConstant, viscosityConstant);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, totalParticles);


    //Update the positions.
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, positionBuffer);
    gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
    gl.useProgram(textureProgram);
    webGL2.bindTexture(textureProgram.texture, pbfTexture1, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}


//=======================================================================================================
// Public variables and functions
//=======================================================================================================

export {
    init,
    updateFrame,
    totalParticles,
    positionTexture,
    velocityTexture,
    voxelsTexture
}
