import {gl}                     from './utils/webGL2.js';
import * as webGL2              from './utils/webGL2.js';
import * as PBF                 from './pbf.js';
import * as Mesher              from './mesher.js';
import * as Programs            from './shaders.js';
import {Camera}                 from './utils/camera.js';


//=======================================================================================================
// Variables & Constants
//=======================================================================================================

//Set the canvas
let canvas = document.querySelector("#canvas3D");
canvas.height = 700;
canvas.width = canvas.height * 2.;
canvas.style.width = String(canvas.width) + "px";
canvas.style.height = String(canvas.height) + "px";
webGL2.setContext(canvas);

//Initiate the shaders programs
Programs.init();

let camera = new Camera(canvas);
let cameraDistance = 3.;
let FOV = 30;

//For the Positionn Based Fluids
let updateSimulation = true;
let deltaTime = 0.005;
let constrainsIterations = 4;
let pbfResolution = 256;
let voxelTextureSize =  4096;
let particlesTextureSize = 2000;
let particlesPosition = [];
let particlesVelocity = []
let currentFrame = 0;

//Change these values to change marching cubes resolution (128/2048/1024 or 256/4096/2048)
let resolution = 256;
let expandedTextureSize = 4096;
let compressedTextureSize = 2048;
let compactTextureSize = 3000;
let compressedBuckets = 8;
let expandedBuckets = 16;
let particleSize = 1;
let blurSteps = 2;
let range = 0.1;
let maxCells = 3.5;
let fastNormals = false;

//For the raytracer
let lowResolutionTextureSize = 256;
let lowGridPartitions = 32;
let lowSideBuckets = 8;
let sceneSize = 4096;       //Requires to be a power of two for mip mapping
let floorTextureSize = 2048;
let floorScale = 5;
let causticsSize = 3000;
let totalPhotons = causticsSize * causticsSize;
let causticSteps = 0;

let refraction = 1.2;
let maxIterations = 1200.;
let refractions = 8;
let reflections = 3;
let maxStepsPerBounce = 800;
let absorptionColor = [150, 150, 152];
let dispersion = 0.0;
let energyDecay = 0;
let distanceAbsorptionScale = 6;
let blurShadowsRadius = 30;

let kS = 0.;
let kD = 0.;
let kA = 0.;
let shinny = 60;

let lightAlpha = 30;
let lightBeta = 0;
let lightIntensity = 2.5;
let lightDistance = 3;
let backgroundColor = 0.6;

let photonSize = 3;
let photonEnergy = 0.2;
let reflectionPhotons = 0.;
let photonsToEmit = 1;
let photonSteps = 1;
let radianceRadius = 5.6;
let radiancePower = 0.2;

let calculateShadows = true;
let calculateCaustics = true;
let shadowIntensity = 0.3;

let killRay = 0.02;
let lightColor = [255, 255, 255];
let materialColor = [255, 255, 255];

let radius = pbfResolution * 0.45;
let radius2 = pbfResolution * 0.07;
//Generate the position and velocity
for (let i = 0; i < pbfResolution; i++) {
    for (let j = 0; j < pbfResolution; j++) {
        for (let k = 0; k < pbfResolution; k++) {

            //Condition for the particle position and existence
            let x = i - pbfResolution * 0.5;
            let y = j - pbfResolution * 0.5;
            let z = k - pbfResolution * 0.5;

            if (x * x + y * y + z * z < radius * radius && k < pbfResolution * 0.4) {
                particlesPosition.push(i, j, k, 1);
                particlesVelocity.push(0, 0, 0, 0);
            }

            // y = j - pbfResolution * 0.8;
            // if (x * x + y * y + z * z < radius2 * radius2) {
            //     particlesPosition.push(i, j, k, 1);
            //     particlesVelocity.push(0, -20, 0, 0);
            // }
        }
    }
}

//With this there're 4M vsPhotons
let arrayRays = [];
for (let i = 0; i < totalPhotons; i++) arrayRays.push(Math.random(), Math.random(), Math.random(), i);


//=======================================================================================================
// Textures and framebuffers
//=======================================================================================================


//Textures
let tVoxelsHigh = webGL2.createTexture2D(expandedTextureSize, expandedTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
let tVoxelsLow = webGL2.createTexture2D(lowResolutionTextureSize, lowResolutionTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
let tScreenPositions = webGL2.createTexture2D(sceneSize, sceneSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
let tScreenNormals = webGL2.createTexture2D(sceneSize, sceneSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
let tFloorLines = webGL2.createTexture2D(floorTextureSize, floorTextureSize, gl.RGBA8, gl.RGBA, gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR, gl.UNSIGNED_BYTE, null, gl.REPEAT);
let tShadows = webGL2.createTexture2D(sceneSize, sceneSize, gl.RGBA16F, gl.RGBA, gl.LINEAR, gl.LINEAR, gl.HALF_FLOAT);
let tShadows2 = webGL2.createTexture2D(sceneSize, sceneSize, gl.RGBA16F, gl.RGBA, gl.LINEAR, gl.LINEAR, gl.HALF_FLOAT);
let tRaysRandom = webGL2.createTexture2D(causticsSize, causticsSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(arrayRays));
let tPhotons1 = webGL2.createTexture2D(causticsSize, causticsSize, gl.RGBA16F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.HALF_FLOAT,);
let tPhotons2 = webGL2.createTexture2D(causticsSize, causticsSize, gl.RGBA16F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.HALF_FLOAT);
let tCaustics = webGL2.createTexture2D(causticsSize, causticsSize, gl.RGBA16F, gl.RGBA, gl.LINEAR, gl.LINEAR, gl.HALF_FLOAT);
let tRadiance = webGL2.createTexture2D(causticsSize, causticsSize, gl.RGBA16F, gl.RGBA, gl.LINEAR, gl.LINEAR, gl.HALF_FLOAT);
let tRadiance2 = webGL2.createTexture2D(causticsSize, causticsSize, gl.RGBA16F, gl.RGBA, gl.LINEAR, gl.LINEAR, gl.HALF_FLOAT);
let tScene = webGL2.createTexture2D(sceneSize, sceneSize, gl.RGBA8, gl.RGBA, gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR, gl.UNSIGNED_BYTE);
let tScene2 = webGL2.createTexture2D(sceneSize, sceneSize, gl.RGBA8, gl.RGBA, gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR, gl.UNSIGNED_BYTE);



//Framebuffers
let fbVoxelsHigh = webGL2.createDrawFramebuffer(tVoxelsHigh, true);
let fbVoxelsLow = webGL2.createDrawFramebuffer(tVoxelsLow);
let fbDeferred = webGL2.createDrawFramebuffer([tScreenPositions, tScreenNormals], true);
let fbFloorLines = webGL2.createDrawFramebuffer(tFloorLines);
let fbShadowsData = webGL2.createDrawFramebuffer([tShadows, tShadows2]);
let fbShadows = webGL2.createDrawFramebuffer(tShadows);
let fbShadows2 = webGL2.createDrawFramebuffer(tShadows2);
let fbPhotons = webGL2.createDrawFramebuffer([tPhotons1, tPhotons2]);
let fbCaustics = webGL2.createDrawFramebuffer(tCaustics);
let fbRadiance = webGL2.createDrawFramebuffer(tRadiance);
let fbRadiance2 = webGL2.createDrawFramebuffer(tRadiance2);
let fbScene = webGL2.createDrawFramebuffer(tScene);
let fbScene2 = webGL2.createDrawFramebuffer(tScene2);


arrayRays = null;

//=======================================================================================================
// Simulation and Rendering (Position based fluids. marching cubes and raytracing)
//=======================================================================================================

//Floor lines texture
gl.useProgram(Programs.floor);
gl.uniform1f(Programs.floor.backgroundColor, 1);
gl.bindFramebuffer(gl.FRAMEBUFFER, fbFloorLines);
gl.viewport(0, 0, floorTextureSize, floorTextureSize);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
gl.bindTexture(gl.TEXTURE_2D, tFloorLines);
gl.generateMipmap(gl.TEXTURE_2D);
gl.bindTexture(gl.TEXTURE_2D, null);

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
    gl.useProgram(Programs.renderParticles);
    webGL2.bindTexture(Programs.renderParticles.positionTexture, PBF.positionTexture, 0);
    gl.uniform1f(Programs.renderParticles.scale, pbfResolution);
    gl.uniformMatrix4fv(Programs.renderParticles.cameraMatrix, false, camera.cameraTransformMatrix);
    gl.uniformMatrix4fv(Programs.renderParticles.perspectiveMatrix, false, camera.perspectiveMatrix);
    if (cleanBuffer) gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.drawArrays(gl.POINTS, 0, PBF.totalParticles);
    gl.disable(gl.DEPTH_TEST);
}

//Function used to check the textures
let checkTexture = (texture, _x, _u, _width, _height, buffer, cleanBuffer = true, forceAlpha = false) => {
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, buffer);
    gl.viewport(_x, _u, _width, _height);
    gl.useProgram(Programs.texture);
    webGL2.bindTexture(Programs.texture.texture, texture, 0);
    gl.uniform1i(Programs.texture.forceAlpha, forceAlpha);
    if (cleanBuffer) gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

//Function used to evaluate the fsRadiance
let evaluateRadiance = () => {
    
    //Caustics fsRadiance
    gl.useProgram(Programs.radiance);
    gl.uniform1f(Programs.radiance.radius, radianceRadius);
    gl.uniform1f(Programs.radiance.radiancePower, radiancePower);
    gl.viewport(0, 0, causticsSize, causticsSize);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbRadiance);
    gl.clear(gl.COLOR_BUFFER_BIT);
    webGL2.bindTexture(Programs.radiance.photonTexture, tCaustics, 0);
    gl.uniform2f(Programs.radiance.axis, 0, 1 / causticsSize);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbRadiance2);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(Programs.radiance.axis, 1 / causticsSize, 0);
    webGL2.bindTexture(Programs.radiance.photonTexture, tRadiance, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
}

gl.cullFace(gl.FRONT);
gl.blendEquation(gl.FUNC_ADD);
gl.blendFunc(gl.ONE, gl.ONE);

let render = () => {

    requestAnimationFrame(render);

    camera.updateCamera(FOV, 1, cameraDistance);

    //Calculate the light position
    let lightPos = {x: 0, y: 0, z: 0};
    let lAlpha = lightAlpha * Math.PI / 180;
    let lBeta = lightBeta * Math.PI / 180;
    let r = lightDistance;
    let s = Math.sin(lAlpha);
    lightPos.x = r * s * Math.cos(lBeta) + 0.5;
    lightPos.y = r * Math.cos(lAlpha);
    lightPos.z = r * s * Math.sin(lBeta) + 0.5;

    let acceleration = {
        x: 0 * Math.sin(currentFrame * Math.PI / 180),
        y: -10,
        z: 0 * Math.cos(currentFrame * Math.PI / 180)
    }


    if (updateSimulation) {

        //Update the simulation
        PBF.updateFrame(acceleration, deltaTime, constrainsIterations);

        //Generate the mesh from the simulation particles
        Mesher.generateMesh(PBF.positionTexture, PBF.totalParticles, pbfResolution, particleSize, blurSteps, range, maxCells, fastNormals);

        currentFrame++;
    }

    //Ray tracing section

    let activeMCells = Math.ceil(maxCells * expandedTextureSize * expandedTextureSize / 100);


    //Generate the high resolution grid for the ray tracer
    gl.useProgram(Programs.highResGrid);
    webGL2.bindTexture(Programs.highResGrid.verticesTexture, Mesher.tVoxelsOffsets, 0);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbVoxelsHigh);
    gl.viewport(0, 0, expandedTextureSize, expandedTextureSize);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.drawArrays(gl.POINTS, 0, 15 * activeMCells);
    gl.disable(gl.DEPTH_TEST);


    //Generate the low resolution grid for the ray tracer
    gl.useProgram(Programs.lowResGrid);
    webGL2.bindTexture(Programs.lowResGrid.positionTexture, Mesher.tTriangles, 0);
    gl.uniform3f(Programs.lowResGrid.gridPartitioning, 1 / lowResolutionTextureSize, lowGridPartitions, lowSideBuckets);
    gl.viewport(0, 0, lowResolutionTextureSize, lowResolutionTextureSize);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbVoxelsLow);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, 15 * activeMCells);


    //Render the triangles to save positions and normals for screen space raytracing.
    gl.useProgram(Programs.deferred);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbDeferred);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, sceneSize, sceneSize);
    webGL2.bindTexture(Programs.deferred.textureTriangles, Mesher.tTriangles, 0);
    webGL2.bindTexture(Programs.deferred.textureNormals, Mesher.tNormals, 1);
    gl.uniformMatrix4fv(Programs.deferred.cameraMatrix, false, camera.cameraTransformMatrix);
    gl.uniformMatrix4fv(Programs.deferred.perspectiveMatrix, false, camera.perspectiveMatrix);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.drawArrays(gl.TRIANGLES, 0, 15 * activeMCells);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);


    if (calculateShadows) {

        //Calculate the shadows for the floor
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbShadowsData);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, sceneSize, sceneSize);
        gl.useProgram(Programs.floorShadows);
        webGL2.bindTexture(Programs.floorShadows.textureTriangles, Mesher.tTriangles, 0);
        webGL2.bindTexture(Programs.floorShadows.textureNormals, Mesher.tNormals, 1);
        webGL2.bindTexture(Programs.floorShadows.potentialTexture, tVoxelsHigh, 2);
        webGL2.bindTexture(Programs.floorShadows.lowResPotential, tVoxelsLow, 3);
        gl.uniform1i(Programs.floorShadows.iterations, maxIterations);
        gl.uniform1i(Programs.floorShadows.maxStepsPerBounce, maxStepsPerBounce);
        gl.uniform3f(Programs.floorShadows.texture3DData, expandedTextureSize, resolution, expandedBuckets);
        gl.uniform3f(Programs.floorShadows.voxelLowData, tVoxelsLow.size, lowGridPartitions, lowSideBuckets);
        gl.uniform4f(Programs.floorShadows.lightData, lightPos.x, lightPos.y, lightPos.z, lightIntensity);
        gl.uniform1f(Programs.floorShadows.scaler, floorScale);
        gl.uniform1f(Programs.floorShadows.size, sceneSize);
        gl.uniform1f(Programs.floorShadows.compactTextureSize, compactTextureSize);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


        //Evaluate the bounding box of the shadow for the fsCaustics
        let levels = Math.ceil(Math.log(sceneSize) / Math.log(2));
        gl.useProgram(Programs.shadowBoundingBox);
        for (let i = 0; i < levels; i++) {
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, Mesher.fbPyramid[levels - i - 1]);
            let size = Math.pow(2, levels - 1 - i);
            gl.viewport(0, 0, size, size);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform1f(Programs.shadowBoundingBox.size, Math.pow(2, i + 1) / sceneSize);
            webGL2.bindTexture(Programs.shadowBoundingBox.potentialTexture, i == 0 ? tShadows2 : Mesher.tLevels[levels - i], 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }


        //Blur for the shadows
        gl.useProgram(Programs.blurShadow);
        gl.uniform1f(Programs.blurShadow.radius, blurShadowsRadius);
        gl.viewport(0, 0, sceneSize, sceneSize);

        gl.bindFramebuffer(gl.FRAMEBUFFER, fbShadows2);
        webGL2.bindTexture(Programs.blurShadow.shadowTexture, tShadows, 0);
        gl.uniform2f(Programs.blurShadow.axis, 0, 1 / sceneSize);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.bindFramebuffer(gl.FRAMEBUFFER, fbShadows);
        webGL2.bindTexture(Programs.blurShadow.shadowTexture, tShadows2, 0);
        gl.uniform2f(Programs.blurShadow.axis, 1 / sceneSize, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    }

    let photonHeight = Math.ceil(causticsSize * photonsToEmit / photonSteps);

    //Calculate the caustics
    if (calculateCaustics) {

        if (causticSteps < photonSteps) {

            //Caustics photon map saved in a plane
            gl.useProgram(Programs.caustics);
            webGL2.bindTexture(Programs.caustics.boundingBoxTexture, Mesher.tLevels[0], 0);
            webGL2.bindTexture(Programs.caustics.randomTexture, tRaysRandom, 1);
            webGL2.bindTexture(Programs.caustics.textureTriangles, Mesher.tTriangles, 2);
            webGL2.bindTexture(Programs.caustics.textureNormals, Mesher.tNormals, 3);
            webGL2.bindTexture(Programs.caustics.potentialTexture, tVoxelsHigh, 4);
            webGL2.bindTexture(Programs.caustics.lowResPotential, tVoxelsLow, 5);
            gl.uniform3f(Programs.caustics.lightPosition, lightPos.x, lightPos.y, lightPos.z);
            gl.uniform3f(Programs.caustics.absorption, 1. - absorptionColor[0] / 255, 1. - absorptionColor[1] / 255, 1. - absorptionColor[2] / 255);
            gl.uniform3f(Programs.caustics.texture3DData, expandedTextureSize, resolution, expandedBuckets);
            gl.uniform3f(Programs.caustics.voxelLowData, lowResolutionTextureSize, lowGridPartitions, lowSideBuckets);
            gl.uniform3f(Programs.caustics.lightColor, lightColor[0] / 255, lightColor[1] / 255, lightColor[2] / 255);
            gl.uniform1f(Programs.caustics.reflectionPhotons, reflectionPhotons);
            gl.uniform1f(Programs.caustics.scale, floorScale);
            gl.uniform1f(Programs.caustics.photonEnergy, photonEnergy);
            gl.uniform1f(Programs.caustics.refract, refraction);
            gl.uniform1f(Programs.caustics.distanceAbsorptionScale, distanceAbsorptionScale);
            gl.uniform1i(Programs.caustics.refractions, refractions);
            gl.uniform1i(Programs.caustics.reflections, reflections);
            gl.uniform1i(Programs.caustics.iterations, maxIterations);
            gl.uniform1i(Programs.caustics.maxStepsPerBounce, maxStepsPerBounce);
            gl.uniform1f(Programs.caustics.dispersion, dispersion);
            gl.uniform1f(Programs.caustics.compactTextureSize, compactTextureSize);


            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbPhotons);
            if (causticSteps == 0) {
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
            gl.viewport(0, 0, causticsSize, causticsSize);
            gl.enable(gl.SCISSOR_TEST);
            gl.scissor(0, photonHeight * causticSteps, causticsSize, photonHeight);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.disable(gl.SCISSOR_TEST);
            causticSteps++;
        }

        else {

            // calculateCaustics = false;
            causticSteps = 0;

            //allocate the calculated vsPhotons on the fsCaustics texture
            gl.useProgram(Programs.photonsGather);
            gl.uniform1f(Programs.photonsGather.photonSize, photonSize);
            webGL2.bindTexture(Programs.photonsGather.positions, tPhotons1, 0);
            webGL2.bindTexture(Programs.photonsGather.colors, tPhotons2, 1);
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbCaustics);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.viewport(0, 0, causticsSize, causticsSize);
            gl.enable(gl.BLEND);
            gl.drawArrays(gl.POINTS, 0, Math.floor(totalPhotons * photonsToEmit));
            gl.disable(gl.BLEND);

            evaluateRadiance();

        }
    }

    //Render the triangles using the raytracer
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbScene);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, sceneSize, sceneSize);
    gl.useProgram(Programs.raytracer);
    webGL2.bindTexture(Programs.raytracer.textureTriangles, Mesher.tTriangles, 0);
    webGL2.bindTexture(Programs.raytracer.textureNormals, Mesher.tNormals, 1);
    webGL2.bindTexture(Programs.raytracer.potentialTexture, tVoxelsHigh, 2);
    webGL2.bindTexture(Programs.raytracer.lowResPotential, tVoxelsLow, 3);
    webGL2.bindTexture(Programs.raytracer.positions, tScreenPositions, 4);
    webGL2.bindTexture(Programs.raytracer.normals, tScreenNormals, 5);
    webGL2.bindTexture(Programs.raytracer.floorTexture, tFloorLines, 6);
    webGL2.bindTexture(Programs.raytracer.shadowTexture, tShadows, 7);
    webGL2.bindTexture(Programs.raytracer.radianceTexture, tRadiance2, 8);
    gl.uniform3f(Programs.raytracer.eyeVector, camera.position[0], camera.position[1], camera.position[2]);
    gl.uniform1f(Programs.raytracer.refract, refraction);
    gl.uniform1f(Programs.raytracer.energyDecay, 1. - energyDecay);
    gl.uniform1i(Programs.raytracer.iterations, maxIterations);
    gl.uniform1i(Programs.raytracer.refractions, refractions);
    gl.uniform1i(Programs.raytracer.reflections, reflections);
    gl.uniform3f(Programs.raytracer.absorption, 1. - absorptionColor[0] / 255, 1. - absorptionColor[1] / 255, 1. - absorptionColor[2] / 255);
    gl.uniform1i(Programs.raytracer.maxStepsPerBounce, maxStepsPerBounce);
    gl.uniform1f(Programs.raytracer.distanceAbsorptionScale, distanceAbsorptionScale);
    gl.uniform3f(Programs.raytracer.texture3DData, expandedTextureSize, resolution, expandedBuckets);
    gl.uniform3f(Programs.raytracer.voxelLowData, tVoxelsLow.size, lowGridPartitions, lowSideBuckets);
    gl.uniform4f(Programs.raytracer.shadeData, kS, kD, kA, shinny);
    gl.uniform1f(Programs.raytracer.backgroundColor, backgroundColor);
    gl.uniform4f(Programs.raytracer.lightData, lightPos.x, lightPos.y, lightPos.z, lightIntensity);
    gl.uniform1f(Programs.raytracer.shadowIntensity, shadowIntensity);
    gl.uniform1f(Programs.raytracer.scaler, floorScale);
    gl.uniform1f(Programs.raytracer.compactTextureSize, compactTextureSize);
    gl.uniform1f(Programs.raytracer.killRay, killRay);
    gl.uniform3f(Programs.raytracer.lightColor, lightColor[0] / 255, lightColor[1] / 255, lightColor[2] / 255);
    gl.uniform3f(Programs.raytracer.materialColor, materialColor[0] / 255, materialColor[1] / 255, materialColor[2] / 255);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindTexture(gl.TEXTURE_2D, tScene);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);


    //Make the composition
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbScene2);
    let bg = backgroundColor;
    gl.clearColor(bg, bg, bg, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, sceneSize, sceneSize);


    //Rendering the floor with shadows and caustics
    gl.useProgram(Programs.renderFloor);
    webGL2.bindTexture(Programs.renderFloor.floorTexture, tFloorLines, 0);
    webGL2.bindTexture(Programs.renderFloor.shadowTexture, tShadows, 1);
    webGL2.bindTexture(Programs.renderFloor.radianceTexture, tRadiance2, 2);
    gl.uniformMatrix4fv(Programs.renderFloor.cameraMatrix, false, camera.cameraTransformMatrix);
    gl.uniformMatrix4fv(Programs.renderFloor.perspectiveMatrix, false, camera.perspectiveMatrix);
    gl.uniform1f(Programs.renderFloor.backgroundColor, backgroundColor);
    gl.uniform1f(Programs.renderFloor.scaler, 500);
    gl.uniform1f(Programs.renderFloor.scaleShadow, floorScale);
    gl.uniform1f(Programs.renderFloor.shadowIntensity, shadowIntensity);
    gl.uniform4f(Programs.renderFloor.lightData, lightPos.x, lightPos.y, lightPos.z, lightIntensity);
    gl.uniform3f(Programs.renderFloor.lightColor, lightColor[0] / 255, lightColor[1] / 255, lightColor[2] / 255);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


    //Render the raytraced image on top of the plane.
    gl.useProgram(Programs.texture);
    gl.uniform1i(Programs.texture.forceAlpha, false);
    webGL2.bindTexture(Programs.texture.dataTexture, tScene, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE);

    gl.bindTexture(gl.TEXTURE_2D, tScene2);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);

    //Check the simulation
    renderParticles(0, 0, 700, 700, null, true);

    //Checking texture results
    checkTexture(tScene2, 700, 0, 700, 700, null, false, true);

};

document.body.addEventListener("keypress", () => {
    updateSimulation = !updateSimulation;
})

render();
