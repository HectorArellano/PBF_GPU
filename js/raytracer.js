import {gl}                     from './webGL/webGL2.js';
import * as webGL2              from './webGL/webGL2.js';
import * as PBF                 from './positionBasedFluids/pbf.js';
import * as Mesher              from './marchingCubes/mesher.js';
import * as Programs            from './shaders.js';
import {Params}                 from './parameters_low.js';
import {Camera}                 from './camera.js';
import {startUIParams}          from './paramsUI.js';

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

//Parameters for the simulation, this is done as a class to allow parameters modifications
//it also allows to have different parameters in different files.

//Function used to reset the simulation with the UI
let resetSimulation = ()=> PBF.reset(particlesData.particlesPosition, particlesData.particlesVelocity);

let params = new Params(resetSimulation);
let particlesData = params.generateParticles();
startUIParams(params);


//Initiate the shaders programs
Programs.init();

let camera = new Camera(canvas);

//Generate random positions for the photons
let arrayRays = [];
for (let i = 0; i < params.totalPhotons; i++) arrayRays.push(Math.random(), Math.random(), Math.random(), i);


//=======================================================================================================
// Textures and framebuffers
//=======================================================================================================


//Textures
let tVoxelsHigh = webGL2.createTexture2D(params.expandedTextureSize, params.expandedTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
let tVoxelsLow = webGL2.createTexture2D(params.lowResolutionTextureSize, params.lowResolutionTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
let tScreenPositions = webGL2.createTexture2D(params.sceneSize, params.sceneSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
let tScreenNormals = webGL2.createTexture2D(params.sceneSize, params.sceneSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
let tFloorLines = webGL2.createTexture2D(params.floorTextureSize, params.floorTextureSize, gl.RGBA8, gl.RGBA, gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR, gl.UNSIGNED_BYTE, null, gl.REPEAT);
let tShadows = webGL2.createTexture2D(params.sceneSize, params.sceneSize, gl.RGBA16F, gl.RGBA, gl.LINEAR, gl.LINEAR, gl.HALF_FLOAT);
let tShadows2 = webGL2.createTexture2D(params.sceneSize, params.sceneSize, gl.RGBA16F, gl.RGBA, gl.LINEAR, gl.LINEAR, gl.HALF_FLOAT);
let tRaysRandom = webGL2.createTexture2D(params.causticsSize, params.causticsSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(arrayRays));
let tPhotons1 = webGL2.createTexture2D(params.causticsSize, params.causticsSize, gl.RGBA16F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.HALF_FLOAT,);
let tPhotons2 = webGL2.createTexture2D(params.causticsSize, params.causticsSize, gl.RGBA16F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.HALF_FLOAT);
let tCaustics = webGL2.createTexture2D(params.causticsSize, params.causticsSize, gl.RGBA16F, gl.RGBA, gl.LINEAR, gl.LINEAR, gl.HALF_FLOAT);
let tRadiance = webGL2.createTexture2D(params.causticsSize, params.causticsSize, gl.RGBA16F, gl.RGBA, gl.LINEAR, gl.LINEAR, gl.HALF_FLOAT);
let tRadiance2 = webGL2.createTexture2D(params.causticsSize, params.causticsSize, gl.RGBA16F, gl.RGBA, gl.LINEAR, gl.LINEAR, gl.HALF_FLOAT);
let tScene = webGL2.createTexture2D(params.sceneSize, params.sceneSize, gl.RGBA8, gl.RGBA, gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR, gl.UNSIGNED_BYTE);
let tScene2 = webGL2.createTexture2D(params.sceneSize, params.sceneSize, gl.RGBA8, gl.RGBA, gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR, gl.UNSIGNED_BYTE);



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
gl.viewport(0, 0, params.floorTextureSize, params.floorTextureSize);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
gl.bindTexture(gl.TEXTURE_2D, tFloorLines);
gl.generateMipmap(gl.TEXTURE_2D);
gl.bindTexture(gl.TEXTURE_2D, null);


//Initiate the position based fluids solver
PBF.init(particlesData.particlesPosition, particlesData.particlesVelocity, params.pbfResolution, params.voxelTextureSize, params.particlesTextureSize);

//Initiate the mesher generator
Mesher.init(params.resolution, params.expandedTextureSize, params.compressedTextureSize, params.compactTextureSize, params.compressedBuckets, params.expandedBuckets, params.depthLevels);


//Function used to render the particles in a framebuffer.
let renderParticles = (_x, _u, _width, _height, buffer, cleanBuffer = true) => {
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, buffer);
    gl.viewport(_x, _u, _width, _height);
    gl.useProgram(Programs.renderParticles);
    webGL2.bindTexture(Programs.renderParticles.positionTexture, PBF.positionTexture, 0);
    gl.uniform1f(Programs.renderParticles.scale, params.pbfResolution);
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
    gl.uniform1f(Programs.radiance.radius, params.radianceRadius);
    gl.uniform1f(Programs.radiance.radiancePower, params.radiancePower);
    gl.viewport(0, 0, params.causticsSize, params.causticsSize);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbRadiance);
    gl.clear(gl.COLOR_BUFFER_BIT);
    webGL2.bindTexture(Programs.radiance.photonTexture, tCaustics, 0);
    gl.uniform2f(Programs.radiance.axis, 0, 1 / params.causticsSize);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbRadiance2);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(Programs.radiance.axis, 1 / params.causticsSize, 0);
    webGL2.bindTexture(Programs.radiance.photonTexture, tRadiance, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
}

gl.cullFace(gl.FRONT);
gl.blendEquation(gl.FUNC_ADD);
gl.blendFunc(gl.ONE, gl.ONE);

let currentFrame = 0;
let render = () => {

    requestAnimationFrame(render);

    if(!params.lockCamera) camera.updateCamera(params.FOV, 1, params.cameraDistance);

    //Calculate the light position
    let lightPos = {x: 0, y: 0, z: 0};
    let lAlpha = params.lightAlpha * Math.PI / 180;
    let lBeta = params.lightBeta * Math.PI / 180;
    let r = params.lightDistance;
    let s = Math.sin(lAlpha);
    lightPos.x = r * s * Math.cos(lBeta) + 0.5;
    lightPos.y = r * Math.cos(lAlpha);
    lightPos.z = r * s * Math.sin(lBeta) + 0.5;

    let acceleration = {
        x: 0 * Math.sin(currentFrame * Math.PI / 180),
        y: -10,
        z: 0 * Math.cos(currentFrame * Math.PI / 180)
    }


    if (params.updateSimulation) {

        //Update the simulation
        PBF.updateFrame(acceleration, params.deltaTime, params.constrainsIterations);

        currentFrame++;
    }

    //Generate the mesh from the simulation particles
    if(params.updateMesh) Mesher.generateMesh(PBF.positionTexture, PBF.totalParticles, params.pbfResolution, params.particleSize, params.blurSteps, params.range, params.maxCells, params.fastNormals);


    //Ray tracing section
    if(params.updateImage) {
        let activeMCells = Math.ceil(params.maxCells * params.expandedTextureSize * params.expandedTextureSize / 100);


        //Generate the high resolution grid for the ray tracer
        gl.useProgram(Programs.highResGrid);
        webGL2.bindTexture(Programs.highResGrid.verticesTexture, Mesher.tVoxelsOffsets, 0);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbVoxelsHigh);
        gl.viewport(0, 0, params.expandedTextureSize, params.expandedTextureSize);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.drawArrays(gl.POINTS, 0, 15 * activeMCells);
        gl.disable(gl.DEPTH_TEST);


        //Generate the low resolution grid for the ray tracer
        gl.useProgram(Programs.lowResGrid);
        webGL2.bindTexture(Programs.lowResGrid.positionTexture, Mesher.tTriangles, 0);
        gl.uniform3f(Programs.lowResGrid.gridPartitioning, 1 / params.lowResolutionTextureSize, params.lowGridPartitions, params.lowSideBuckets);
        gl.viewport(0, 0, params.lowResolutionTextureSize, params.lowResolutionTextureSize);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbVoxelsLow);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, 15 * activeMCells);


        //Render the triangles to save positions and normals for screen space raytracing.
        gl.useProgram(Programs.deferred);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbDeferred);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, params.sceneSize, params.sceneSize);
        webGL2.bindTexture(Programs.deferred.textureTriangles, Mesher.tTriangles, 0);
        webGL2.bindTexture(Programs.deferred.textureNormals, Mesher.tNormals, 1);
        gl.uniformMatrix4fv(Programs.deferred.cameraMatrix, false, camera.cameraTransformMatrix);
        gl.uniformMatrix4fv(Programs.deferred.perspectiveMatrix, false, camera.perspectiveMatrix);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.drawArrays(gl.TRIANGLES, 0, 15 * activeMCells);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);


        if (params.calculateShadows) {

            //Calculate the shadows for the floor
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbShadowsData);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.viewport(0, 0, params.sceneSize, params.sceneSize);
            gl.useProgram(Programs.floorShadows);
            webGL2.bindTexture(Programs.floorShadows.textureTriangles, Mesher.tTriangles, 0);
            webGL2.bindTexture(Programs.floorShadows.textureNormals, Mesher.tNormals, 1);
            webGL2.bindTexture(Programs.floorShadows.potentialTexture, tVoxelsHigh, 2);
            webGL2.bindTexture(Programs.floorShadows.lowResPotential, tVoxelsLow, 3);
            gl.uniform1i(Programs.floorShadows.iterations, params.maxIterations);
            gl.uniform1i(Programs.floorShadows.maxStepsPerBounce, params.maxStepsPerBounce);
            gl.uniform3f(Programs.floorShadows.texture3DData, params.expandedTextureSize, params.resolution, params.expandedBuckets);
            gl.uniform3f(Programs.floorShadows.voxelLowData, tVoxelsLow.size, params.lowGridPartitions, params.lowSideBuckets);
            gl.uniform4f(Programs.floorShadows.lightData, lightPos.x, lightPos.y, lightPos.z, params.lightIntensity);
            gl.uniform1f(Programs.floorShadows.scaler, params.floorScale);
            gl.uniform1f(Programs.floorShadows.size, params.sceneSize);
            gl.uniform1f(Programs.floorShadows.compactTextureSize, params.compactTextureSize);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


            //Evaluate the bounding box of the shadow for the fsCaustics
            let levels = Math.ceil(Math.log(params.sceneSize) / Math.log(2));
            gl.useProgram(Programs.shadowBoundingBox);
            for (let i = 0; i < levels; i++) {
                gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, Mesher.fbPyramid[levels - i - 1]);
                let size = Math.pow(2, levels - 1 - i);
                gl.viewport(0, 0, size, size);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.uniform1f(Programs.shadowBoundingBox.size, Math.pow(2, i + 1) / params.sceneSize);
                webGL2.bindTexture(Programs.shadowBoundingBox.potentialTexture, i == 0 ? tShadows2 : Mesher.tLevels[levels - i], 0);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }


            //Blur for the shadows
            gl.useProgram(Programs.blurShadow);
            gl.uniform1f(Programs.blurShadow.radius, params.blurShadowsRadius);
            gl.viewport(0, 0, params.sceneSize, params.sceneSize);

            gl.bindFramebuffer(gl.FRAMEBUFFER, fbShadows2);
            webGL2.bindTexture(Programs.blurShadow.shadowTexture, tShadows, 0);
            gl.uniform2f(Programs.blurShadow.axis, 0, 1 / params.sceneSize);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            gl.bindFramebuffer(gl.FRAMEBUFFER, fbShadows);
            webGL2.bindTexture(Programs.blurShadow.shadowTexture, tShadows2, 0);
            gl.uniform2f(Programs.blurShadow.axis, 1 / params.sceneSize, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        }

        let photonHeight = Math.ceil(params.causticsSize * params.photonsToEmit / params.photonSteps);

        //Calculate the caustics
        if (params.calculateCaustics) {

            if (params.causticSteps < params.photonSteps) {

                //Caustics photon map saved in a plane
                gl.useProgram(Programs.caustics);
                webGL2.bindTexture(Programs.caustics.boundingBoxTexture, Mesher.tLevels[0], 0);
                webGL2.bindTexture(Programs.caustics.randomTexture, tRaysRandom, 1);
                webGL2.bindTexture(Programs.caustics.textureTriangles, Mesher.tTriangles, 2);
                webGL2.bindTexture(Programs.caustics.textureNormals, Mesher.tNormals, 3);
                webGL2.bindTexture(Programs.caustics.potentialTexture, tVoxelsHigh, 4);
                webGL2.bindTexture(Programs.caustics.lowResPotential, tVoxelsLow, 5);
                gl.uniform3f(Programs.caustics.lightPosition, lightPos.x, lightPos.y, lightPos.z);
                gl.uniform3f(Programs.caustics.absorption, 1. - params.absorptionColor[0] / 255, 1. - params.absorptionColor[1] / 255, 1. - params.absorptionColor[2] / 255);
                gl.uniform3f(Programs.caustics.texture3DData, params.expandedTextureSize, params.resolution, params.expandedBuckets);
                gl.uniform3f(Programs.caustics.voxelLowData, params.lowResolutionTextureSize, params.lowGridPartitions, params.lowSideBuckets);
                gl.uniform3f(Programs.caustics.lightColor, params.lightColor[0] / 255, params.lightColor[1] / 255, params.lightColor[2] / 255);
                gl.uniform1f(Programs.caustics.reflectionPhotons, params.reflectionPhotons);
                gl.uniform1f(Programs.caustics.scale, params.floorScale);
                gl.uniform1f(Programs.caustics.photonEnergy, params.photonEnergy);
                gl.uniform1f(Programs.caustics.refract, params.refraction);
                gl.uniform1f(Programs.caustics.distanceAbsorptionScale, params.distanceAbsorptionScale);
                gl.uniform1i(Programs.caustics.refractions, params.refractions);
                gl.uniform1i(Programs.caustics.reflections, params.reflections);
                gl.uniform1i(Programs.caustics.iterations, params.maxIterations);
                gl.uniform1i(Programs.caustics.maxStepsPerBounce, params.maxStepsPerBounce);
                gl.uniform1f(Programs.caustics.dispersion, params.dispersion);
                gl.uniform1f(Programs.caustics.compactTextureSize, params.compactTextureSize);


                gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbPhotons);
                if (params.causticSteps == 0) {
                    gl.clearColor(0, 0, 0, 0);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                }
                gl.viewport(0, 0, params.causticsSize, params.causticsSize);
                gl.enable(gl.SCISSOR_TEST);
                gl.scissor(0, photonHeight * params.causticSteps, params.causticsSize, photonHeight);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                gl.disable(gl.SCISSOR_TEST);
                params.causticSteps++;
            }

            else {

                // calculateCaustics = false;
                params.causticSteps = 0;

                //allocate the calculated vsPhotons on the fsCaustics texture
                gl.useProgram(Programs.photonsGather);
                gl.uniform1f(Programs.photonsGather.photonSize, params.photonSize);
                webGL2.bindTexture(Programs.photonsGather.positions, tPhotons1, 0);
                webGL2.bindTexture(Programs.photonsGather.colors, tPhotons2, 1);
                gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbCaustics);
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.viewport(0, 0, params.causticsSize, params.causticsSize);
                gl.enable(gl.BLEND);
                gl.drawArrays(gl.POINTS, 0, Math.floor(params.totalPhotons * params.photonsToEmit));
                gl.disable(gl.BLEND);

                evaluateRadiance();

            }
        }

        //Render the triangles using the raytracer
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbScene);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, params.sceneSize, params.sceneSize);
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
        gl.uniform1f(Programs.raytracer.refract, params.refraction);
        gl.uniform1f(Programs.raytracer.energyDecay, 1. - params.energyDecay);
        gl.uniform1i(Programs.raytracer.iterations, params.maxIterations);
        gl.uniform1i(Programs.raytracer.refractions, params.refractions);
        gl.uniform1i(Programs.raytracer.reflections, params.reflections);
        gl.uniform3f(Programs.raytracer.absorption, 1. - params.absorptionColor[0] / 255, 1. - params.absorptionColor[1] / 255, 1. - params.absorptionColor[2] / 255);
        gl.uniform1i(Programs.raytracer.maxStepsPerBounce, params.maxStepsPerBounce);
        gl.uniform1f(Programs.raytracer.distanceAbsorptionScale, params.distanceAbsorptionScale);
        gl.uniform3f(Programs.raytracer.texture3DData, params.expandedTextureSize, params.resolution, params.expandedBuckets);
        gl.uniform3f(Programs.raytracer.voxelLowData, tVoxelsLow.size, params.lowGridPartitions, params.lowSideBuckets);
        gl.uniform4f(Programs.raytracer.shadeData, params.kS, params.kD, params.kA, params.shinny);
        gl.uniform1f(Programs.raytracer.backgroundColor, params.backgroundColor);
        gl.uniform4f(Programs.raytracer.lightData, lightPos.x, lightPos.y, lightPos.z, params.lightIntensity);
        gl.uniform1f(Programs.raytracer.shadowIntensity, params.shadowIntensity);
        gl.uniform1f(Programs.raytracer.scaler, params.floorScale);
        gl.uniform1f(Programs.raytracer.compactTextureSize, params.compactTextureSize);
        gl.uniform1f(Programs.raytracer.killRay, params.killRay);
        gl.uniform3f(Programs.raytracer.lightColor, params.lightColor[0] / 255, params.lightColor[1] / 255, params.lightColor[2] / 255);
        gl.uniform3f(Programs.raytracer.materialColor, params.materialColor[0] / 255, params.materialColor[1] / 255, params.materialColor[2] / 255);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.bindTexture(gl.TEXTURE_2D, tScene);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);


        //Make the composition
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbScene2);
        let bg = params.backgroundColor;
        gl.clearColor(bg, bg, bg, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, params.sceneSize, params.sceneSize);


        //Rendering the floor with shadows and caustics
        gl.useProgram(Programs.renderFloor);
        webGL2.bindTexture(Programs.renderFloor.floorTexture, tFloorLines, 0);
        webGL2.bindTexture(Programs.renderFloor.shadowTexture, tShadows, 1);
        webGL2.bindTexture(Programs.renderFloor.radianceTexture, tRadiance2, 2);
        gl.uniformMatrix4fv(Programs.renderFloor.cameraMatrix, false, camera.cameraTransformMatrix);
        gl.uniformMatrix4fv(Programs.renderFloor.perspectiveMatrix, false, camera.perspectiveMatrix);
        gl.uniform1f(Programs.renderFloor.backgroundColor, params.backgroundColor);
        gl.uniform1f(Programs.renderFloor.scaler, 500);
        gl.uniform1f(Programs.renderFloor.scaleShadow, params.floorScale);
        gl.uniform1f(Programs.renderFloor.shadowIntensity, params.shadowIntensity);
        gl.uniform4f(Programs.renderFloor.lightData, lightPos.x, lightPos.y, lightPos.z, params.lightIntensity);
        gl.uniform3f(Programs.renderFloor.lightColor, params.lightColor[0] / 255, params.lightColor[1] / 255, params.lightColor[2] / 255);
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
    }

    //Check the simulation
    renderParticles(0, 0, 700, 700, null, true);

    //Checking texture results
    checkTexture(tScene2, 700, 0, 700, 700, null, false, true);

};

render();
