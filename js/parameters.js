
export class Params {

    constructor() {

        //Camera parameters
        this.cameraDistance = 3.;
        this.FOV = 30;

        //Position based fluids parameters
        this.updateSimulation = true;
        this.deltaTime = 0.005;
        this.constrainsIterations = 4;
        this.pbfResolution = 256;
        this.voxelTextureSize = 4096;
        this.particlesTextureSize = 2000;

        //Marching cubes parameters, Change these values to change marching cubes resolution (128/2048/1024 or 256/4096/2048)
        this.resolution = 256;
        this.expandedTextureSize = 4096;
        this.compressedTextureSize = 2048;
        this.compactTextureSize = 3000;
        this.compressedBuckets = 8;
        this.expandedBuckets = 16;
        this.particleSize = 1;
        this.blurSteps = 2;
        this.range = 0.1;
        this.maxCells = 3.5;
        this.fastNormals = false;

        //General raytracer parameters
        this.lowResolutionTextureSize = 256;
        this.lowGridPartitions = 32;
        this.lowSideBuckets = 8;
        this.sceneSize = 4096;       //Requires to be a power of two for mip mapping
        this.floorTextureSize = 2048;
        this.floorScale = 5;
        this.killRay = 0.02;

        //Material parameters (dielectric)
        this.refraction = 1.2;
        this.maxIterations = 1200.;
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
        this.photonSize = 3;
        this.photonEnergy = 0.2;
        this.reflectionPhotons = 0.;
        this.photonsToEmit = 1;
        this.photonSteps = 1;
        this.radianceRadius = 5.6;
        this.radiancePower = 0.2;
        this.calculateCaustics = true;
        this.causticsSize = 3000;
        this.totalPhotons = this.causticsSize * this.causticsSize;
        this.causticSteps = 0;
    }
}




