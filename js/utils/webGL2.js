
//=======================================================================================================
// Variables
//=======================================================================================================

let gl;
let contextReady = false;

//=======================================================================================================
// Public functions
//=======================================================================================================

//Generate the context using the provided canvas
const setContext = canvas => {
    gl = canvas.getContext('webgl2');

    //Load the extension to draw inside floating point textures
    gl.getExtension('EXT_color_buffer_float');

    //Load the extension to have linear interpolatino for floating point textures
    gl.getExtension("OES_texture_float_linear");

    contextReady = true;
}

//Generates a program from a vertex and fragment shader
const generateProgram = (vertexShader, fragmentShader) => {
    if(contextReady) {
        let program = gl.createProgram();
        gl.attachShader(program, getShader(vertexShader, 0));
        gl.attachShader(program, getShader(fragmentShader, 1));
        gl.linkProgram(program);
        if (! gl.getProgramParameter( program,  gl.LINK_STATUS)) {
            console.log(new Error("Could not generate the program"));
            return null;
        }
        return program;
    } else {
        console.log(new Error("Context not set yet"));
    }
}

//Function used to genarate an array buffer
const createBuffer = data => {
    if(contextReady) {
        let buffer =  gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, buffer);
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(data),  gl.STATIC_DRAW);
        gl.bindBuffer(null);
        return buffer;
    } else {
        console.log(new Error("Context not set yet"));
    }
}

//Function used to generate an empty texture2D
let memory = 0;
const createTexture2D = (width, height, internalFormat, format, maxFilter, minFilter, type, data = null) => {
    if(contextReady) {
        let texture = gl.createTexture();
        texture.width = width;
        texture.height = height;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, maxFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindTexture(gl.TEXTURE_2D, null);

        if(type == gl.FLOAT) memory += width * height * 32 * 4;
        else memory += width * height * 8 * 4;

        let m = memory / 8; //<----- bits to bytes
        m /= 1000000; //<----- bytes to mega bytes

        // console.log("current GPU memory usage: " + m + " Mb");

        return texture;
    } else {
        console.log(new Error("Content not set yet"));
    }
}

//Function used for texture binding
const bindTexture = (programData, texture, texturePos) => {
    if(contextReady) {
        let textures = [gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2, gl.TEXTURE3, gl.TEXTURE4, gl.TEXTURE5, gl.TEXTURE6, gl.TEXTURE7, gl.TEXTURE8, gl.TEXTURE9, gl.TEXTURE10, gl.TEXTURE11, gl.TEXTURE12, gl.TEXTURE13, gl.TEXTURE14];
        gl.activeTexture(textures[texturePos]);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(programData, texturePos);
    } else {
        console.log(new Error("Content not set yet"));
    }
}

//Function used to generate multiple drawing buffers
const createDrawFramebuffer = (_textures, useDepth = false, useStencil = false) => {
    if(contextReady) {

        //This allows to either have a single texture as input or an array of textures
        let textures = _textures.length == undefined ? [_textures] : _textures;

        let frameData = gl.createFramebuffer();
        let colorAttachments = [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3, gl.COLOR_ATTACHMENT4, gl.COLOR_ATTACHMENT5, gl.COLOR_ATTACHMENT6];
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, frameData);
        frameData.width = textures[0].width;
        frameData.height = textures[0].height;
        let drawBuffers = [];
        for(let i = 0; i < textures.length; i ++) {
            gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, colorAttachments[i], gl.TEXTURE_2D, textures[i], 0);
            drawBuffers.push(colorAttachments[i]);
        }
        if(useDepth) {
            let renderbuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, textures[0].width, textures[0].height);
            if(useStencil) {
                gl.renderbufferStorage( gl.RENDERBUFFER, gl.DEPTH_STENCIL,  textures[0].width, textures[0].height);
                gl.framebufferRenderbuffer( gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
            } else {
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
            }
        }
        gl.drawBuffers(drawBuffers);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

        let status = gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER);
        if (status != gl.FRAMEBUFFER_COMPLETE) {
            console.log('fb status: ' + status.toString(16));
            return null;
        }

        return frameData;
    } else {
        console.log(new Error("Content not set yet"));
    }
}


export {
    gl,
    setContext,
    generateProgram,
    createTexture2D,
    bindTexture,
    createBuffer,
    createDrawFramebuffer
}

//=======================================================================================================
// Private functions
//=======================================================================================================

const getShader = (str, type) => {
    let shader;
    if (type == 1) {
        shader =  gl.createShader( gl.FRAGMENT_SHADER);
    } else  {
        shader =  gl.createShader( gl.VERTEX_SHADER);
    }
    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (! gl.getShaderParameter(shader,  gl.COMPILE_STATUS)) {
        console.log(new Error("Could not generate the program"));
        console.log( gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}
