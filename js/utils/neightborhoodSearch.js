/*
Module used to allocate the neighborhood of a particle, based from the original idea of Harada,
based on https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch29.html
 */

import {gl}             from '../utils/webGL2.js';
import * as webGL2      from '../utils/webGL2.js';
import {vsNeighbors}    from '../shaders/neighbors/vs-neighbors.js';
import {fsColor}        from '../shaders/utils/fs-simpleColor.js';

let started = false;
let searchProgram;

let searchNeighbords = (inputTexture, _outputBuffers, totalParticles, bucketSize) => {

    //This allows to either have a single framebuffer as input or an array
    let outputBuffers = _outputBuffers.length == undefined ? [_outputBuffers] : _outputBuffers;

    if(!started) {
        searchProgram = webGL2.generateProgram(vsNeighbors, fsColor);
        searchProgram.positionTexture =     gl.getUniformLocation(searchProgram, "uTexPositions");
        searchProgram.bucketData =          gl.getUniformLocation(searchProgram, "uBucketData");
        searchProgram.totalParticles =      gl.getUniformLocation(searchProgram, "uTotalParticles");
        started = true;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffers[0]);
    gl.viewport(0, 0, outputBuffers[0].width, outputBuffers[0].height);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.STENCIL_TEST);
    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(searchProgram);
    webGL2.bindTexture(searchNeighbords.positionTexture, inputTexture, 0);
    gl.uniform3f(searchProgram.bucketData, outputBuffers[0].width, bucketSize, outputBuffers[0].width / bucketSize);
    gl.uniform1f(searchProgram.totalParticles, totalParticles);

    gl.colorMask(true, false, false, false);
    gl.depthFunc(gl.LESS);
    gl.drawArrays(gl.POINTS, 0, totalParticles);

    gl.colorMask(false, true, false, false);
    gl.depthFunc(gl.GREATER);
    gl.stencilFunc(gl.GREATER, 1, 1);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
    gl.clear(gl.STENCIL_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, totalParticles);

    gl.colorMask(false, false, true, false);
    gl.clear(gl.STENCIL_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, totalParticles);

    gl.colorMask(false, false, false, true);
    gl.clear(gl.STENCIL_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, totalParticles);

    if(outputBuffers.length > 1) {
        for(let i = 1; i < outpufBuffer.length; i ++) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, outputBuffers[i]);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.colorMask(true, false, false, false);
            gl.clear(gl.STENCIL_BUFFER_BIT);
            gl.drawArrays(gl.POINTS, 0, totalParticles);

            gl.colorMask(false, true, false, false);
            gl.clear(gl.STENCIL_BUFFER_BIT);
            gl.drawArrays(gl.POINTS, 0, totalParticles);

            gl.colorMask(false, false, true, false);
            gl.clear(gl.STENCIL_BUFFER_BIT);
            gl.drawArrays(gl.POINTS, 0, totalParticles);

            gl.colorMask(false, false, false, true);
            gl.clear(gl.STENCIL_BUFFER_BIT);
            gl.drawArrays(gl.POINTS, 0, totalParticles);
        }
    }

    gl.colorMask(true, true, true, true);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

}

export {searchNeighbords}