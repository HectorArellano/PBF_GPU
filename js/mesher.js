import {gl}                         from './utils/webGL2.js';
import * as webGL2                  from './utils/webGL2.js';
import  {ti5, trianglesOnVoxels}    from './utils/marchingCubesTables.js';

//Shaders
import {vsQuad}                     from './shaders/utils/vs-quad.js';
import {fsColor}                    from './shaders/utils/fs-simpleColor.js';
import {fsTextureColor}             from './shaders/utils/fs-simpleTexture.js';
import {vsParticlesPlacement}       from './shaders/marchingCubes/vs-partticlesPlacement.js';
import {blur2D}                     from './shaders/marchingCubes/fs-blu2D.js';
import {blurDepth}                  from './shaders/marchingCubes/fs-blurDepth.js';
import {getCorners}                 from './shaders/marchingCubes/fs-getCorners.js';
import {splitChannels}              from './shaders/marchingCubes/fs-splitChannels.js';
import {marchCase}                  from './shaders/marchingCubes/fs-marchCase.js';
import {generatePyramid}            from './shaders/marchingCubes/fs-generatePyramid.js';
import {generateTriangles}          from './shaders/marchingCubes/fs-generateTriangles.js';


//=======================================================================================================
// Variables & Constants
//=======================================================================================================

//Change these values to change marching cubes resolution (128/2048/1024 or 256/4096/2048), compactTextureSize
//holds the results for the triangles vertices positions and normals.
let resolution;
let expandedTextureSize;
let compressedTextureSize;
let compactTextureSize;
let compressedBuckets;
let expandedBuckets;
let depthLevels;
const amountOfTrianglesTextureSize = 16;
const indexesTextureSize = 64;


//Textures required
let tVoxels1,
    tVoxels2,
    tTriangles,
    tNormals,
    tVoxelsOffsets,
    tHelper,
    t3DExpanded,
    tMarchingCase,
    tAmountOfTrianglesPerIndex,
    tIndexes;

//Framebuffers for textures
let fbVoxels1,
    fbVoxels2,
    fb3DExpanded,
    fbIndexes,
    fbAmountOfTrianglesPerIndex,
    fbHelper,
    fbMarchingCase,
    fbTriangles;

//Shader programs
let setVoxelsProgram,
    blur2DProgram,
    blurDepthProgram,
    getCornersProgram,
    marchCaseProgram,
    splitChannelsProgram,
    generatePyramidProgram,
    textureProgram,
    generateTrianglesProgram;

//For the pyramid generation (stream compaction)
let tLevels, fbPyramid;

let tInV = [];
for (let i = 0; i <trianglesOnVoxels.length; i ++) tInV.push(trianglesOnVoxels[i].length);

let arrayTriIndex = [];
for(let i = 0; i < indexesTextureSize * indexesTextureSize; i ++) {
    if (i < ti5.length) {
        let val = ti5[i];
        let val2 = tInV[Math.floor(i / 15)];
        arrayTriIndex.push(val, val2, val2, 1.);
    } else arrayTriIndex.push(0, 0, 0, 0);
}

//Buffers for positions in a 256 texture, and triangles in voxel.
let arrayTriVoxel = [];
for(let i = 0; i < 256; i++) {
    let u = tInV[i] / 3;
    arrayTriVoxel.push(u, u, u, 1);
}


//Function used to initiate the marching cubes, should provide the resolution expected
let init = (_resolution, _expandedTextureSize, _compressedTextureSize, _compactTextureSize, _compressedbuckets, _expandedBuckets, _depthLevels) => {

    console.log("..............................");
    console.log("Potential resolution: " + _resolution);
    console.log("..............................");


    resolution = _resolution;
    expandedTextureSize = _expandedTextureSize;
    compressedTextureSize = _compressedTextureSize;
    compactTextureSize = _compactTextureSize;
    compressedBuckets = _compressedbuckets;
    expandedBuckets = _expandedBuckets;
    depthLevels = _depthLevels;

    tVoxels1 =                      webGL2.createTexture2D(compressedTextureSize, compressedTextureSize,               gl.RGBA8,   gl.RGBA, gl.NEAREST, gl.NEAREST, gl.UNSIGNED_BYTE);
    tVoxels2 =                      webGL2.createTexture2D(compressedTextureSize, compressedTextureSize,               gl.RGBA8,   gl.RGBA, gl.NEAREST, gl.NEAREST, gl.UNSIGNED_BYTE);
    tTriangles =                    webGL2.createTexture2D(compactTextureSize, compactTextureSize,                     gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
    tNormals =                      webGL2.createTexture2D(compactTextureSize, compactTextureSize,                     gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
    tVoxelsOffsets =                webGL2.createTexture2D(compactTextureSize, compactTextureSize,                     gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
    tHelper =                       webGL2.createTexture2D(expandedTextureSize, expandedTextureSize,                   gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
    t3DExpanded =                   webGL2.createTexture2D(expandedTextureSize, expandedTextureSize,                   gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
    tMarchingCase =                 webGL2.createTexture2D(expandedTextureSize, expandedTextureSize,                   gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
    tAmountOfTrianglesPerIndex =    webGL2.createTexture2D(amountOfTrianglesTextureSize, amountOfTrianglesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(arrayTriVoxel));
    tIndexes =                      webGL2.createTexture2D(indexesTextureSize, indexesTextureSize,                     gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(arrayTriIndex));


    fbVoxels1 =                    webGL2.createDrawFramebuffer(tVoxels1);
    fbVoxels2 =                    webGL2.createDrawFramebuffer(tVoxels2);
    fb3DExpanded =                 webGL2.createDrawFramebuffer(t3DExpanded);
    fbIndexes =                    webGL2.createDrawFramebuffer(tIndexes);
    fbAmountOfTrianglesPerIndex =  webGL2.createDrawFramebuffer(tAmountOfTrianglesPerIndex);
    fbHelper =                     webGL2.createDrawFramebuffer(tHelper);
    fbMarchingCase =               webGL2.createDrawFramebuffer(tMarchingCase);
    fbTriangles =                  webGL2.createDrawFramebuffer([tTriangles, tNormals, tVoxelsOffsets]);

    tLevels = [];
    fbPyramid = [];
    for (let i = 0; i < Math.ceil(Math.log(_expandedTextureSize) / Math.log(2)); i++) {
        let size = Math.pow(2, i);
        tLevels.push(webGL2.createTexture2D(size, size, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT));
        fbPyramid.push(webGL2.createDrawFramebuffer(tLevels[i]));
    }
    
    arrayTriIndex = null;
    arrayTriVoxel = null;


    //programs generation
    setVoxelsProgram =                              webGL2.generateProgram(vsParticlesPlacement, fsColor);
    setVoxelsProgram.positionTexture =              gl.getUniformLocation(setVoxelsProgram, "uTexturePosition");
    setVoxelsProgram.phase =                        gl.getUniformLocation(setVoxelsProgram, "uPhase");
    setVoxelsProgram.particleSize =                 gl.getUniformLocation(setVoxelsProgram, "uSize");
    setVoxelsProgram.gridPartitioning =             gl.getUniformLocation(setVoxelsProgram, "u3D");
    setVoxelsProgram.particlesGridScale =           gl.getUniformLocation(setVoxelsProgram, "uParticlesGridScale");

    blur2DProgram =                                 webGL2.generateProgram(vsQuad, blur2D);
    blur2DProgram.dataTexture =                     gl.getUniformLocation(blur2DProgram, "uDT");
    blur2DProgram.axis =                            gl.getUniformLocation(blur2DProgram, "uAxis");
    blur2DProgram.steps =                           gl.getUniformLocation(blur2DProgram, "uSteps");
    blur2DProgram.gridPartitioning =                gl.getUniformLocation(blur2DProgram, "u3D");


    blurDepthProgram =                              webGL2.generateProgram(vsQuad, blurDepth);
    blurDepthProgram.dataTexture =                  gl.getUniformLocation(blurDepthProgram, "uDT");
    blurDepthProgram.steps =                        gl.getUniformLocation(blurDepthProgram, "uSteps");
    blurDepthProgram.gridPartitioning =             gl.getUniformLocation(blurDepthProgram, "u3D");
    blurDepthProgram.depthLevels =                  gl.getUniformLocation(blurDepthProgram, "uDepth");

    getCornersProgram =                             webGL2.generateProgram(vsQuad, getCorners);
    getCornersProgram.dataTexture =                 gl.getUniformLocation(getCornersProgram, "uDataTexture");
    getCornersProgram.gridPartitioning =            gl.getUniformLocation(getCornersProgram, "u3D");
    getCornersProgram.depthLevels =                 gl.getUniformLocation(getCornersProgram, "uDepth");

    splitChannelsProgram =                          webGL2.generateProgram(vsQuad, splitChannels);
    splitChannelsProgram.dataTexture =              gl.getUniformLocation(splitChannelsProgram, "uDataTexture");
    splitChannelsProgram.gridPartitioningLow =      gl.getUniformLocation(splitChannelsProgram, "u3D_l");
    splitChannelsProgram.gridPartitioningHigh =     gl.getUniformLocation(splitChannelsProgram, "u3D_h");
    splitChannelsProgram.depthLevels =              gl.getUniformLocation(splitChannelsProgram, "uDepth");

    marchCaseProgram =                              webGL2.generateProgram(vsQuad, marchCase);
    marchCaseProgram.dataTexture =                  gl.getUniformLocation(marchCaseProgram, "uDT");
    marchCaseProgram.trianglesPerIndexTexture =     gl.getUniformLocation(marchCaseProgram, "uTrianglesIndex");
    marchCaseProgram.range =                        gl.getUniformLocation(marchCaseProgram, "uRange");
    marchCaseProgram.gridPartitioning =             gl.getUniformLocation(marchCaseProgram, "u3D");

    generatePyramidProgram =                        webGL2.generateProgram(vsQuad, generatePyramid);
    generatePyramidProgram.potentialTexture =       gl.getUniformLocation(generatePyramidProgram, "uPyT");
    generatePyramidProgram.size =                   gl.getUniformLocation(generatePyramidProgram, "uSize");

    textureProgram =                                webGL2.generateProgram(vsQuad, fsTextureColor);
    textureProgram.texture =                        gl.getUniformLocation(textureProgram, "uTexture");
    textureProgram.forceAlpha =                     gl.getUniformLocation(textureProgram, "uForceAlpha");

    generateTrianglesProgram =                      webGL2.generateProgram(vsQuad, generateTriangles);
    generateTrianglesProgram.pyramid =              gl.getUniformLocation(generateTrianglesProgram, "uPyramid");
    generateTrianglesProgram.base =                 gl.getUniformLocation(generateTrianglesProgram, "uBase");
    generateTrianglesProgram.gridPartitioning =     gl.getUniformLocation(generateTrianglesProgram, "u3D");
    generateTrianglesProgram.potentialTexture =     gl.getUniformLocation(generateTrianglesProgram, "uPot");
    generateTrianglesProgram.tiTexture =            gl.getUniformLocation(generateTrianglesProgram, "uTrianglesIndexes");
    generateTrianglesProgram.range =                gl.getUniformLocation(generateTrianglesProgram, "uRange");
    generateTrianglesProgram.limit =                gl.getUniformLocation(generateTrianglesProgram, "uLimit");
    generateTrianglesProgram.total =                gl.getUniformLocation(generateTrianglesProgram, "uTotal");
    generateTrianglesProgram.fastNormals =          gl.getUniformLocation(generateTrianglesProgram, "uFastNormals");
    generateTrianglesProgram.compactTextureSize =   gl.getUniformLocation(generateTrianglesProgram, "uCompactSize");
    generateTrianglesProgram.levels =               gl.getUniformLocation(generateTrianglesProgram, "uLevels");


}

//Function used to generate a 3D mesh using the marching cubes algorithm
let generateMesh = (positionTexture, totalParticles, particlesGridScale, particlesSize, blurSteps, range, maxCells, fastNormals) => {

    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);


    //Working with the compressed texture size
    gl.viewport(0, 0, compressedTextureSize, compressedTextureSize);


    //Place particles in the voxel space
    gl.useProgram(setVoxelsProgram);
    webGL2.bindTexture(setVoxelsProgram.positionTexture, positionTexture, 0);
    gl.uniform1f(setVoxelsProgram.particleSize, particlesSize);
    gl.uniform1f(setVoxelsProgram.particlesGridScale, particlesGridScale);
    gl.uniform3f(setVoxelsProgram.gridPartitioning, 1. / compressedTextureSize, resolution, compressedBuckets);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbVoxels1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);

    for (let i = 0; i < particlesSize; i++) {
        gl.uniform1f(setVoxelsProgram.phase, i);
        gl.drawArrays(gl.POINTS, 0, totalParticles);
    }

    gl.disable(gl.BLEND);

    
    //Use a 3D blur for the potential generation.
    let blurXY = (buffer, texture, axis) => {
        gl.uniform2fv(blur2DProgram.axis, axis);
        gl.uniform1i(blur2DProgram.steps, blurSteps);
        gl.uniform3f(blur2DProgram.gridPartitioning, 1. / compressedTextureSize, resolution, compressedBuckets);
        webGL2.bindTexture(blur2DProgram.dataTexture, texture, 0);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, buffer);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    let k = 1 / compressedTextureSize;
    gl.useProgram(blur2DProgram);
    blurXY(fbVoxels2, tVoxels1, [k, 0]);
    blurXY(fbVoxels1, tVoxels2, [0, k]);

    gl.useProgram(blurDepthProgram);
    webGL2.bindTexture(blurDepthProgram.dataTexture, tVoxels1, 0);
    gl.uniform1i(blurDepthProgram.steps, blurSteps);
    gl.uniform1f(blurDepthProgram.depthLevels, depthLevels);
    gl.uniform3f(blurDepthProgram.gridPartitioning, 1. / compressedTextureSize, resolution, compressedBuckets);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbVoxels2);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    
    //Evaluate the corners values for the potentials
    gl.useProgram(getCornersProgram);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbVoxels1);
    webGL2.bindTexture(getCornersProgram.dataTexture, tVoxels2, 0);
    gl.uniform3f(getCornersProgram.gridPartitioning, 1. / compressedTextureSize, resolution, compressedBuckets);
    gl.uniform1f(getCornersProgram.depthLevels, depthLevels);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


    //Working with the expanded texture size
    gl.viewport(0, 0, expandedTextureSize, expandedTextureSize);


    //Split the channels for expansion of the potential
    gl.useProgram(splitChannelsProgram);
    webGL2.bindTexture(splitChannelsProgram.dataTexture, tVoxels1, 0);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb3DExpanded);
    gl.uniform3f(splitChannelsProgram.gridPartitioningLow, 1. / compressedTextureSize, resolution, compressedBuckets);
    gl.uniform3f(splitChannelsProgram.gridPartitioningHigh, 1. / expandedTextureSize, resolution, expandedBuckets);
    gl.uniform1f(splitChannelsProgram.depthLevels, depthLevels);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


    //Evaluate the cells active for the marching cubes
    gl.useProgram(marchCaseProgram);
    webGL2.bindTexture(marchCaseProgram.dataTexture, t3DExpanded, 0);
    webGL2.bindTexture(marchCaseProgram.trianglesPerIndexTexture, tAmountOfTrianglesPerIndex, 1);
    gl.uniform1f(marchCaseProgram.range, range);
    gl.uniform3f(marchCaseProgram.gridPartitioning, 1. / expandedTextureSize, resolution, expandedBuckets);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbMarchingCase);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


    //This part set the levels of the pyramid for compaction.
    let levels = Math.ceil(Math.log(expandedTextureSize) / Math.log(2));
    gl.useProgram(generatePyramidProgram);
    for (let i = 0; i < levels; i++) {
        let size = Math.pow(2, levels - 1 - i);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbPyramid[levels - i - 1]);
        gl.viewport(0, 0, size, size);
        gl.uniform1f(generatePyramidProgram.size, Math.pow(2, i + 1) / expandedTextureSize);
        webGL2.bindTexture(generatePyramidProgram.potentialTexture, i == 0 ? tMarchingCase : tLevels[levels - i], 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }


    //Copy the pyramid partial result into the helper texture.
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbHelper);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    let offset = 0;
    for(let i = 0; i < levels; i ++) {
        let size = Math.pow(2, levels - 1 - i);
        gl.viewport(offset, 0, size, size);
        gl.useProgram(textureProgram);
        webGL2.bindTexture(textureProgram.texture, tLevels[levels - i - 1], 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        offset += size;
    }


    //Parse the pyramid and generate the positions and normals
    gl.useProgram(generateTrianglesProgram);
    webGL2.bindTexture(generateTrianglesProgram.pyramid, tHelper, 0);
    webGL2.bindTexture(generateTrianglesProgram.base, tMarchingCase, 1);
    webGL2.bindTexture(generateTrianglesProgram.tiTexture, tIndexes, 2);
    webGL2.bindTexture(generateTrianglesProgram.potentialTexture, t3DExpanded, 3);
    webGL2.bindTexture(generateTrianglesProgram.total, tLevels[0], 4);
    gl.uniform1f(generateTrianglesProgram.range, range);
    gl.uniform1i(generateTrianglesProgram.levels, levels);
    gl.uniform1f(generateTrianglesProgram.compactTextureSize, compactTextureSize);
    gl.uniform3f(generateTrianglesProgram.gridPartitioning, expandedTextureSize, resolution, expandedBuckets);
    gl.uniform1i(generateTrianglesProgram.fastNormals, fastNormals);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbTriangles);
    gl.viewport(0, 0, compactTextureSize, compactTextureSize);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

}

export {init,
        generateMesh,
        tTriangles,
        tNormals,
        tVoxelsOffsets,
        t3DExpanded
}