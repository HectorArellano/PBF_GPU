/*
This is a UI to modify the parameeters in real time
It takes as an input the corresponding params object
used for each animation and sets a visual UI with
DatGUI
 */

export function startUIParams(params) {

    let uiContainer = document.querySelector(".uiContainer");

    //Simulation UI
    let simulationUI = new dat.GUI({ autoPlace: false });
    simulationUI.domElement.style.display = "none";
    uiContainer.appendChild(simulationUI.domElement);
    let simulationParamsActive = false;

    //For the position based fluids
    let  pbfFolder = simulationUI.addFolder('Position Based Fluids');
    pbfFolder.add(params, "deltaTime", 0.0000, 0.01, 0.0001).name("simulation speed");
    pbfFolder.add(params, "constrainsIterations", 1, 10, 1).name("constrains iterations").step(1);
    pbfFolder.add(params, "updateSimulation").name("update simulation");
    pbfFolder.add(params, "resetSimulation");

    pbfFolder.open();

    //For the mesh generation
    let meshFolder = simulationUI.addFolder('Marching Cubes');
    meshFolder.add(params, "particleSize", 1, 10, 1).name("particle size").step(1);
    meshFolder.add(params, "blurSteps", 1, 20, 1).name("spread steps").step(1);
    meshFolder.add(params, "range", 0, 1, 0.001).name("range").step(0.001);
    meshFolder.add(params, "maxCells", 0, 5, 0.1).name("max cells").step(0.1);
    meshFolder.add(params, "fastNormals").name("fast normals");
    meshFolder.add(params, "updateMesh").name("update mesh");
    meshFolder.open();


    //material UI
    let materialUI = new dat.GUI({ autoPlace: false });
    materialUI.domElement.style.display = "none";
    uiContainer.appendChild(materialUI.domElement);
    let materialUIActive = false;


    //For the mesh generation
    let materialFolder = materialUI.addFolder('Material Definition');
    materialFolder.add(params, "refraction", 0, 10, 0.1).name("refraction").step(0.1);
    materialFolder.add(params, "refractions", 0, 20, 0.1).name("refraction steps").step(1);
    materialFolder.add(params, "reflections", 0, 20, 0.1).name("reflection steps").step(1);
    materialFolder.add(params, "distanceAbsorptionScale", 0, 10, 1).name("absorption scale").step(1);
    materialFolder.add(params, "kS", 0, 1, 0.001).name("specular intensity").step(0.001);
    materialFolder.add(params, "kD", 0, 1, 0.001).name("diffuse intensity").step(0.001);
    materialFolder.add(params, "kA", 0, 1, 0.001).name("ambient intensity").step(0.001);
    materialFolder.add(params, "shinny", 0, 60, 1).name("specular power").step(1);
    materialFolder.add(params, "dispersion", 0, 0.2, 0.0001).name("dispersion").step(0.0001);
    materialFolder.add(params, "photonSize", 1, 10, 1).name("photons size").step(1);
    materialFolder.add(params, "photonEnergy", 0, 1, 0.001).name("photons energy").step(0.001);
    materialFolder.add(params, "reflectionPhotons", 0, 1, 0.001).name("reflection photons").step(0.01);
    materialFolder.add(params, "radianceRadius", 0, 30, 0.1).name("radiance radius").step(0.1);
    materialFolder.add(params, "radiancePower", 0, 1, 0.01).name("radiance power").step(0.01);
    materialFolder.add(params, "calculateCaustics").name("update caustics");
    materialFolder.addColor(params, 'absorptionColor');
    materialFolder.addColor(params, 'materialColor');
    materialFolder.open();


    //raytracer UI
    let raytracerUI = new dat.GUI({ autoPlace: false });
    raytracerUI.domElement.style.display = "none";
    uiContainer.appendChild(raytracerUI.domElement);
    let raytracerUiActive = false;




    //General raytracer folder
    let raytracerFolder = raytracerUI.addFolder('Ray tracer');
    raytracerFolder.add(params, "floorScale", 1, 15, 1).name("floor scale").step(2);
    raytracerFolder.add(params, "killRay", 0, 1, 0.001).name("kill ray").step(0.001);
    raytracerFolder.add(params, "maxIterations", 0, 1200, 1).name("max steps").step(1);
    raytracerFolder.add(params, "maxStepsPerBounce", 0, 1200, 1).name("max bounce steps").step(1);
    raytracerFolder.add(params, "updateImage").name("update image");
    raytracerFolder.open();

    //Light parameters folder
    let lightFolder = raytracerUI.addFolder('Light parameters');
    lightFolder.add(params, "lightAlpha", 0, 180, 1).name("light alpha").step(1);
    lightFolder.add(params, "lightBeta", 0, 180, 1).name("light beta").step(1);
    lightFolder.add(params, "lightDistance", 0, 20, 1).name("light distance").step(1);
    lightFolder.add(params, "backgroundColor", 0, 1, 0.01).name("background color").step(0.01);
    lightFolder.add(params, "shadowIntensity", 0, 1, 0.01).name("shadows intensity").step(0.01);
    lightFolder.add(params, "blurShadowsRadius", 0, 100, 1).name("shadows spread").step(1);
    lightFolder.add(params, "calculateShadows").name("update shadows");
    lightFolder.addColor(params, 'lightColor');
    lightFolder.open();


    //Light parameters folder
    let cameraFolder = raytracerUI.addFolder('camera parameters');
    cameraFolder.add(params, "cameraDistance", 1, 10, 1).name("camera distance").step(1);
    cameraFolder.add(params, "FOV", 1, 70, 1).name("FOV").step(1);
    cameraFolder.add(params, "lockCamera").name("camera lock");
    cameraFolder.open();


    //Function used to show the different UI params
    document.body.addEventListener("keypress", (e) => {

       if(e.key == "p") {
           simulationParamsActive = !simulationParamsActive;
           simulationUI.domElement.style.display = simulationParamsActive ? "block" : "none";
       }

        if(e.key == "m") {
            materialUIActive = !materialUIActive;
            materialUI.domElement.style.display = materialUIActive ? "block" : "none";
        }

        if(e.key == "r") {
            raytracerUiActive = !raytracerUiActive;
            raytracerUI.domElement.style.display = raytracerUiActive ? "block" : "none";
        }

    });

}