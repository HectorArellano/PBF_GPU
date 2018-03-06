
export class Params {

    constructor(resetSimulation) {

        //Function used to update the animation
        this.resetSimulation = resetSimulation;

        //Camera parameters
        this.cameraDistance = 3.;
        this.FOV = 30;
        this.lockCamera = false;

        //Position based fluids parameters
        this.updateSimulation = false;
        this.deltaTime = 0.007;
        this.constrainsIterations = 5;
        this.pbfResolution = 128;
        this.voxelTextureSize = 2048;
        this.particlesTextureSize = 512;

        //Marching cubes parameters, Change these values to change marching cubes resolution (128/2048/1024 or 256/4096/2048)
        this.resolution = 256;
        this.expandedTextureSize = 4096;
        this.expandedBuckets = 16;
        this.compressedTextureSize = 2048;
        this.compressedBuckets = 8;
        this.depthLevels = 64;
        this.compactTextureSize = 2500;
        this.particleSize = 2;
        this.blurSteps = 12;
        this.range = 0.12;
        this.maxCells = 3.5;
        this.fastNormals = false;
        this.updateMesh = true;

        //General raytracer parameters
        this.lowResolutionTextureSize = 512;
        this.lowGridPartitions = 64;
        this.lowSideBuckets = 8;
        this.sceneSize = 2048;
        this.floorTextureSize = 2048;
        this.floorScale = 5;
        this.killRay = 0.02;
        this.updateImage = false;

        //Material parameters (dielectric)
        this.refraction = 1.3;
        this.maxIterations = 600.;
        this.refractions = 0;
        this.reflections = 1;
        this.maxStepsPerBounce = 800;
        this.absorptionColor = [179, 184, 195];
        this.dispersion = 0.0;
        this.energyDecay = 0;
        this.distanceAbsorptionScale = 4;
        this.materialColor = [255, 255, 255];
        this.kS = 0.;
        this.kD = 0.;
        this.kA = 0.;
        this.shinny = 60;
        this.dielectricLOD = 3;


        //Light parameters
        this.lightAlpha = 26;
        this.lightBeta = 0;
        this.lightIntensity = 2.5;
        this.lightDistance = 3;
        this.backgroundColor = 0.0;
        this.lightColor = [255, 255, 255];
        this.calculateShadows = false;
        this.shadowIntensity = 0.7;
        this.blurShadowsRadius = 12;

        //Caustics parameters
        this.photonSize = 2;
        this.photonEnergy = 0.15;
        this.reflectionPhotons = 0.;
        this.photonsToEmit = 1;
        this.photonSteps = 1;
        this.radianceRadius = 2;
        this.radiancePower = 0.25;
        this.calculateCaustics = false;
        this.causticsSize = 2000;
        this.totalPhotons = this.causticsSize * this.causticsSize;
        this.causticSteps = 0;

    }

    //Generate the particles, this is done here to have different particles setup in
    //different params files

    //Distance field used to evaluate the particles active
    distance(point) {
        let center = {x: this.pbfResolution * 0.5, y: this.pbfResolution * 0.5, z: this.pbfResolution * 0.5}

        let r = this.pbfResolution * 0.4;
        let r1 = this.pbfResolution * 0.38;
        let p = Math.pow(point.x - center.x, 2) +  Math.pow(point.y - center.y, 2) +  Math.pow(point.z - center.z, 2);
        let d = Math.max(-(p - r1), (p - r));
        d = p - r * r;
        d = Math.max(-(-point.y + this.pbfResolution * 0.7), d);

        return d < 0;
    }

    generateParticles() {

        let particlesPosition = [];
        let particlesVelocity = [];
        let particlesColors = [];

        for (let i = 0; i < this.pbfResolution; i++) {
            for (let j = 0; j < this.pbfResolution; j++) {
                for (let k = 0; k < this.pbfResolution; k++) {

                    //Condition for the particle position and existence
                    let point = {x: i, y: j, z: k};
                    if (this.distance(point)) {
                        particlesPosition.push(i, j, k, 1);
                        particlesVelocity.push(0, 0, 0, 0); //Velocity is zero for all the particles.

                        if(j < this.pbfResolution * 0.5) {
                            if (i < this.pbfResolution * 0.35) particlesColors.push(251, 244, 66, 0);
                            if (i > this.pbfResolution * 0.35 && i <= this.pbfResolution * 0.5) particlesColors.push(201, 41, 33, 0);
                            if (i > this.pbfResolution * 0.5 && i <= this.pbfResolution * 0.65) particlesColors.push(73, 128, 193, 0);
                            if (i > this.pbfResolution * 0.65) particlesColors.push(241, 46, 106, 0);
                        } else  particlesColors.push(20, 240, 45, 0);

                    }
                }
            }
        }

        return {particlesPosition: particlesPosition, particlesVelocity: particlesVelocity, particlesColors : particlesColors}
    }
}




