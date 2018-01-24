
class Camera {

    constructor(canvas) {
        this.position = vec3.create();
        this.down = false;
        this.prevMouseX = 0;
        this.prevMouseY = 0;
        this.currentMouseX = 0;
        this.currentMouseY = 0;

        this.alpha = 1 * Math.PI * 0.5;
        this.beta = .5 * Math.PI;
        this._alpha = this.alpha;
        this._beta = this.beta;
        this.ratio = 1;

        this.init = true;
        this.target = [0.5, 0.5, 0.5];

        this.perspectiveMatrix = mat4.create();
        this.cameraTransformMatrix = mat4.create();

        canvas.style.cursor = "-moz-grab";
        canvas.style.cursor = " -webkit-grab";


        document.addEventListener('mousemove', (e) => {
            this.currentMouseX = e.clientX;
            this.currentMouseY = e.clientY;
        }, false);

        document.addEventListener('mousedown', (e) => {
            canvas.style.cursor = "-moz-grabbing";
            canvas.style.cursor = " -webkit-grabbing";
            this.down = true;
        }, false);

        document.addEventListener('mouseup', (e) => {
            canvas.style.cursor = "-moz-grab";
            canvas.style.cursor = " -webkit-grab";
            this.down = false;
        }, false);
    }

    updateCamera(perspective, aspectRatio, radius) {

       this.ratio = radius;

        mat4.perspective(this.perspectiveMatrix, perspective * Math.PI / 180, aspectRatio, 0.01, 10);

        if (this.down) {
            this.alpha -= 0.1 * (this.currentMouseY - this.prevMouseY) * Math.PI / 180;
            this.beta += 0.1 * (this.currentMouseX - this.prevMouseX) * Math.PI / 180;
            if (this.alpha <= 0) this.alpha = 0.001;
            if (this.alpha >= 0.99 *  Math.PI) this.alpha = 0.99 * Math.PI;
        }

        if (this._alpha != this.alpha || this._beta != this.beta || this.init) {
            this._alpha += (this.alpha - this._alpha) / 7;
            this._beta += (this.beta - this._beta) / 7;
            this.position[0] = this.ratio * Math.sin(this._alpha) * Math.sin(this._beta) + this.target[0];
            this.position[1] = this.ratio * Math.cos(this._alpha) + this.target[1];
            this.position[2] = this.ratio * Math.sin(this._alpha) * Math.cos(this._beta) + this.target[2];
            this.cameraTransformMatrix = this.defineTransformMatrix(this.position, this.target);
        }
        this.prevMouseX = this.currentMouseX;
        this.prevMouseY = this.currentMouseY;
    }

    defineTransformMatrix(objectVector, targetVector) {
        let matrix = mat4.create();
        let eyeVector = vec3.create();
        let normalVector = vec3.create();
        let upVector = vec3.create();
        let rightVector = vec3.create();
        let yVector = vec3.create();

        yVector[0] = 0;
        yVector[1] = 1;
        yVector[2] = 0;

        vec3.subtract(eyeVector, objectVector, targetVector);

        vec3.normalize(normalVector, eyeVector);

        let reference = vec3.dot(normalVector, yVector);
        let reference2 = vec3.create();

        vec3.scale(reference2, normalVector, reference);
        vec3.subtract(upVector, yVector, reference2);
        vec3.normalize(upVector, upVector);
        vec3.cross(rightVector, normalVector, upVector);

        matrix[0] = rightVector[0];
        matrix[1] = upVector[0];
        matrix[2] = normalVector[0];
        matrix[3] = 0;
        matrix[4] = rightVector[1];
        matrix[5] = upVector[1];
        matrix[6] = normalVector[1];
        matrix[7] = 0;
        matrix[8] = rightVector[2];
        matrix[9] = upVector[2];
        matrix[10] = normalVector[2];
        matrix[11] = 0;
        matrix[12] = -vec3.dot(objectVector, rightVector);
        matrix[13] = -vec3.dot(objectVector, upVector);
        matrix[14] = -vec3.dot(objectVector, normalVector);
        matrix[15] = 1;
        return matrix;
    }
}

export {Camera}