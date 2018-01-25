
export class Params {

    constructor(resetSimulation) {

        //Function used to update the animation
        this.resetSimulation = resetSimulation;

        //Camera parameters
        this.cameraDistance = 3.;
        this.FOV = 30;
        this.lockCamera = false;

        //Position based fluids parameters
        this.updateSimulation = true;
        this.deltaTime = 0.01;
        this.constrainsIterations = 5;
        this.pbfResolution = 128;
        this.voxelTextureSize = 2048;
        this.particlesTextureSize = 1000;

        //Marching cubes parameters, Change these values to change marching cubes resolution (128/2048/1024 or 256/4096/2048)
        this.resolution = 256;
        this.expandedTextureSize = 4096;
        this.expandedBuckets = 16;
        this.compressedTextureSize = 2048;
        this.compressedBuckets = 8;
        this.depthLevels = 64;
        this.compactTextureSize = 2500;
        this.particleSize = 2;
        this.blurSteps = 24;
        this.range = 0.1;
        this.maxCells = 3.5;
        this.fastNormals = false;
        this.updateMesh = true;

        //General raytracer parameters
        this.lowResolutionTextureSize = 256;
        this.lowGridPartitions = 32;
        this.lowSideBuckets = 8;
        this.sceneSize = 2048;       //Requires to be a power of two for mip mapping
        this.floorTextureSize = 2048;
        this.floorScale = 5;
        this.killRay = 0.02;
        this.updateImage = true;

        //Material parameters (dielectric)
        this.refraction = 1.2;
        this.maxIterations = 600.;
        this.refractions = 8;
        this.reflections = 3;
        this.maxStepsPerBounce = 800;
        this.absorptionColor = [150, 150, 152];
        this.dispersion = 0.0;
        this.energyDecay = 0;
        this.distanceAbsorptionScale = 6;
        this.materialColor = [255, 255, 255];
        this.kS = 0.;
        this.kD = 0.;
        this.kA = 0.;
        this.shinny = 60;


        //Light parameters
        this.lightAlpha = 30;
        this.lightBeta = 0;
        this.lightIntensity = 2.5;
        this.lightDistance = 3;
        this.backgroundColor = 0.6;
        this.lightColor = [255, 255, 255];
        this.calculateShadows = true;
        this.shadowIntensity = 0.3;
        this.blurShadowsRadius = 30;

        //Caustics parameters
        this.photonSize = 2;
        this.photonEnergy = 0.2;
        this.reflectionPhotons = 0.;
        this.photonsToEmit = 1;
        this.photonSteps = 1;
        this.radianceRadius = 5.6;
        this.radiancePower = 0.2;
        this.calculateCaustics = true;
        this.causticsSize = 1000;
        this.totalPhotons = this.causticsSize * this.causticsSize;
        this.causticSteps = 0;

    }

    //Generate the particles, this is done here to have different particles setup in
    //different params files
    generateParticles() {

        let particlesPosition = [];
        let particlesVelocity = [];
        let radius = this.pbfResolution * 0.45;
        //Generate the position and velocity
        for (let i = 0; i < this.pbfResolution; i++) {
            for (let j = 0; j < this.pbfResolution; j++) {
                for (let k = 0; k < this.pbfResolution; k++) {

                    //Condition for the particle position and existence
                    let x = i - this.pbfResolution * 0.5;
                    let y = j - this.pbfResolution * 0.5;
                    let z = k - this.pbfResolution * 0.5;

                    if (x * x + y * y + z * z < radius * radius && k < this.pbfResolution * 0.4) {
                        particlesPosition.push(i, j, k, 1);
                        particlesVelocity.push(0, 0, 0, 0);
                    }
                }
            }
        }

        return {particlesPosition: particlesPosition, particlesVelocity: particlesVelocity}
    }

}




