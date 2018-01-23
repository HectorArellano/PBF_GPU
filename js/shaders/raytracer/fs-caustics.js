const fsCaustics = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D   uRayTexture;
uniform sampler2D   uBoundingShadow;
uniform sampler2D   uPot;
uniform sampler2D   uLowRes;
uniform sampler2D   uTT;
uniform sampler2D   uTN;
uniform vec3        uLightPosition;
uniform vec3        uAbsorption;
uniform vec3        uTexture3D;
uniform vec3        uVoxelLow;
uniform vec3        uLightColor;
uniform float       uReflectionPhotons;
uniform float       uScale;
uniform float       uEnergy;
uniform float       uRefract;
uniform float       uAbsorptionDistanceScaler;
uniform float       uDispersion;
uniform float       uCompactSize;
uniform int         uRefractions;
uniform int         uReflections;
uniform int         uMaxSteps;
uniform int         uMaxBounceSteps;


const float EPSILON = 1.e-10 ;
const float E = 0.00;
const float e = 2.71828;
const float acne = 0.00001;

const vec3 bordersLimits = vec3(1.1, 1.1, 1.1);
vec3 limits;
vec3 limits_l;

vec4 photon = vec4(0.);

in vec2 uv;

layout(location = 0) out vec4 data0;
layout(location = 1) out vec4 data1;

  //Based on Simon Green box ray intersection no lo ha hehco.... Jaume me lo dijo
  float boxRay(vec3 ro, vec3 rd, vec3 boxmin, vec3 boxmax) {
    vec3 invR = 1. / rd;
    vec3 tbot = invR * (boxmin - ro);
    vec3 ttop = invR * (boxmax - ro);
    vec3 tmin = min(ttop, tbot);
    vec3 tmax = max(ttop, tbot);
    vec2 t0 = max(tmin.xx, tmin.yz);
    float tnear = max(t0.x, t0.y);
    t0 = min(tmax.xx, tmax.yz);
    float tfar = min(t0.x, t0.y);
    if( tnear > tfar || tfar < 0.0) return -1.;
    return tnear;
  }

   vec2 index2D(vec3 pos, vec3 voxelData) {
       return (pos.xz + voxelData.y * vec2(mod(pos.y, voxelData.z), floor(pos.y / voxelData.z)) + vec2(0.5)) / voxelData.x;
   }

   vec2 index_triangles(float index) {
       return (vec2(mod(index, uCompactSize), floor(index / uCompactSize)) + vec2(0.5)) / uCompactSize;
   }

    bool planeIntersect(vec3 rayOrigin, vec3 rayDirection, vec3 planeNormal, float d, out float param) {
       param = -1.;
       float ang = dot(rayDirection, planeNormal);
       if(ang > EPSILON || ang == 0.) return false;
       param = -(dot(rayOrigin, planeNormal) - d) / ang;
       return param >= 0.;
    }


  float triangleIntersect(float index, vec3 rayOrigin, vec3 rayDirection, out vec2 UV) {
       vec3 v1 = texture(uTT, index_triangles(index)).rgb;
       vec3 v2 = texture(uTT, index_triangles(index + 1.)).rgb;
       vec3 v3 = texture(uTT, index_triangles(index + 2.)).rgb;
       vec3 e1 = v2 - v1;
       vec3 e2 = v3 - v1;
       vec3 p = cross(rayDirection, e2);
       float det = dot(e1, p);
       if(abs(det) < EPSILON) return -1.;
       vec3 t = rayOrigin - v1;
       vec3 q = cross(t, e1);
       vec3 tri = vec3(dot(t, p), dot(rayDirection, q), dot(e2, q)) / det;
       UV = tri.xy;
       if(tri.x + tri.y <= 1. && all(greaterThanEqual(tri.xy, vec2(0.)))) return tri.z;
       return -1.;
  }

 vec3 rayTrace(vec3 initPos,  vec3 rayDirection,  int rayType,  int totalBounces, out vec3 color) {
 
    limits = vec3(uTexture3D.y) * bordersLimits;
    limits_l = vec3(uVoxelLow.y) * bordersLimits;
    vec3 hitPoint = vec3(0.);
    const int maxIter = 600;
    vec3 normal = vec3(0.);
    vec3 bouncesLimits = vec3(totalBounces, uMaxSteps, uMaxBounceSteps);
    bool inside = true;
    float distanceTraveled = 0.;
    int maxStepsPerBounce = 0;
    int bounces = 0;
    vec3 deltaDist = abs(1. / max(abs(rayDirection), vec3(EPSILON)));
    vec3 rayStep = sign(rayDirection);
    vec3 stepForward;
    float changeToHigh = uTexture3D.y / uVoxelLow.y;
    float changeToLow = uVoxelLow.y / uTexture3D.y;
    float t = 0.;
    initPos += acne * rayDirection;
    vec3 pos = uTexture3D.y * initPos;
    vec3 mapPos = floor(pos);
    vec3 sideDist =  (rayStep * (mapPos - pos + 0.5) + 0.5) * deltaDist;
    bool highResolution = true;
    bool resolution = true;
    vec3 mapPos_h = mapPos;
    vec3 mapPos_l = floor(pos * changeToLow);
    vec3 pos0_l = pos * changeToLow;
    vec3 pos0_h = pos;
    float voxelIndex = 0.;
    vec2 UV = vec2(0.);
    vec2 _UV = vec2(0.);
    float tPlane = 0.;


    //Traverse the 3D grid
    for(int i = 0; i < maxIter; i ++) {
        bool stepsLimits = any(greaterThanEqual(vec3(bounces, i, maxStepsPerBounce), bouncesLimits));
        bool borders = any(lessThan(mapPos, vec3(0.))) || any(greaterThan(mapPos_h, limits)) || any(greaterThan(mapPos_l, limits_l));
        t = min(sideDist.x, min(sideDist.y, sideDist.z));
        stepForward = step(sideDist.xyz, sideDist.yxy) * step(sideDist.xyz, sideDist.zzx);
        sideDist += stepForward * deltaDist;
        pos += stepForward * rayStep;
        mapPos = floor(pos);
    	maxStepsPerBounce ++;

         if(borders || stepsLimits) {
            //out of bounds
            if(planeIntersect(initPos, rayDirection, vec3(0., 1., 0.), 0.0, tPlane)) hitPoint = initPos + tPlane * rayDirection;
            if(rayType == 1) color *= pow(vec3(e), -distanceTraveled * uAbsorption * uAbsorptionDistanceScaler);
//            color *= max(dot(-rayDirection, vec3(0., 1., 0.)), 0.);
            return hitPoint;
         }

        resolution = texture(uLowRes, index2D(mix(mapPos, floor(mapPos * changeToLow), float(highResolution)), uVoxelLow)).r > 0.;
        if(highResolution) {
            mapPos_h = mapPos;
            if(!resolution) {
                highResolution = false;
                pos0_l = changeToLow * (pos0_h + t * rayDirection);
                pos = pos0_l;
                mapPos = floor(pos);
                sideDist =  (rayStep * (mapPos - pos + 0.5) + 0.5) * deltaDist;
            } else {
                voxelIndex = texture(uPot, index2D(mapPos, uTexture3D)).r;
                //There's a hit with a high resolution voxel
                if(voxelIndex > 0.) {
                    float comparator = 1e10;
                    float param = 1e10;
                    float partialIndex = 0.;
                    float q = 0.;
                    float numberOfTriangles = texture(uTT, index_triangles(voxelIndex)).a;
                    //Evaulate triangles with if branching. Much faster then using a for loop
                    comparator = triangleIntersect(voxelIndex, initPos, rayDirection, UV);
                    if(comparator > 0. && comparator < param) {
                        param = comparator;
                        _UV = UV;
                        partialIndex = 0.;
                    }
                    if(numberOfTriangles > 1.) {
                        comparator = triangleIntersect(voxelIndex + 3., initPos, rayDirection, UV);
                        if(comparator > 0. && comparator < param) {
                            param = comparator;
                            _UV = UV;
                            partialIndex = 3.;
                        }
                        if(numberOfTriangles > 2.) {
                            comparator = triangleIntersect(voxelIndex + 6., initPos, rayDirection, UV);
                            if(comparator > 0. && comparator < param) {
                                param = comparator;
                                _UV = UV;
                                partialIndex = 6.;
                            }
                            if(numberOfTriangles > 3.) {
                                comparator = triangleIntersect(voxelIndex + 9., initPos, rayDirection, UV);
                                if(comparator > 0. && comparator < param) {
                                    param = comparator;
                                    _UV = UV;
                                    partialIndex = 9.;
                                }
                                if(numberOfTriangles > 4.) {
                                    comparator = triangleIntersect(voxelIndex + 12., initPos, rayDirection, UV);
                                    if(comparator > 0. && comparator < param) {
                                        param = comparator;
                                        _UV = UV;
                                        partialIndex = 12.;
                                    }
                                }
                            }
                        }
                    }
                    float index = partialIndex + voxelIndex;

                    //There's a hit with a triangle
                     if(param > 0. && param < 10.) {

                        color = vec3(1.);

                        float refractValue = uRefract;

                         if(uDispersion > 0. && rayType == 1) {
                              float module = mod(photon.w, 3.);
                              if(module == 0.) color = vec3(0., 1., 0.);
                              if(module == 1.) color = vec3(1., 0., 0.);
                              if(module == 2.) color = vec3(0., 0., 1.);
                              refractValue = uRefract;
                              if(module == 1.) refractValue = uRefract - uDispersion;
                              if(module == 2.) refractValue = uRefract + uDispersion;
                         }

                         maxStepsPerBounce = 0;
                         vec3 prevPos = initPos;
                         vec3 advance = rayDirection * param;
                         initPos += advance;

                         vec3 ll = vec3(_UV, 1.0 - _UV.x - _UV.y);
                         normal = ll.z * texture(uTN, index_triangles(index)).rgb + ll.x * texture(uTN, index_triangles(index + 1.)).rgb + ll.y * texture(uTN, index_triangles(index + 2.)).rgb;
                         vec3 prevRay = rayDirection;
                         inside = dot(normal, rayDirection) > 0.;
                         vec3 n = inside ? -normal : normal;
                         if(rayType == 1 && inside) distanceTraveled += param;
                         rayDirection = rayType == 1 ? refract(rayDirection, n, inside ? refractValue : 1. / refractValue) : rayDirection = reflect(rayDirection, normal);
                         //Handling total internal reflection.
                         if(rayType == 1 && length(rayDirection) == 0.) {
                           rayDirection = reflect(prevRay, n);
                           inside = true;
                         }
                         initPos += acne * rayDirection;
                         deltaDist = abs(1. / max(abs(rayDirection), vec3(EPSILON)));
                         rayStep = sign(rayDirection);
                         pos = uTexture3D.y * initPos;
                         pos0_h = pos;
                         pos0_l = changeToLow * pos;
                         mapPos = floor(pos);
                         sideDist = (rayStep * (mapPos - pos) + (rayStep * 0.5) + 0.5) * deltaDist;
                         bounces++;
                     }
                }
            }
        } else {
            mapPos_l = mapPos;
            //There's a hit with a low resolution voxel.
            if(resolution) {
                highResolution = true;
                pos0_h = changeToHigh * (pos0_l + 0.99 * t * rayDirection);
                pos = pos0_h;
                mapPos = floor(pos);
                sideDist = (rayStep * (mapPos - pos + 0.5) + 0.5) * deltaDist;
            }
        }
        highResolution = resolution;
    }

     return hitPoint;
  }

void main(void) {

    photon = texture(uRayTexture, uv);
    int rayType = photon.z > uReflectionPhotons ? 1 : 0;
    vec4 position = vec4(1000000., 1000000., 0., 1.);
    vec3 color = vec3(0.);
    vec4 boundingBox = texture(uBoundingShadow, vec2(0.5));

    //Floor position based on white noise
    vec2 st = (2. * (boundingBox.xy + photon.xy * (boundingBox.zw - boundingBox.xy)) - 1.);
    vec3 floorPosition = uScale * vec3(st.x, 0., st.y) + vec3(0.5, 0., 0.5);
    vec3 ray = normalize(floorPosition - uLightPosition);

    float halfScale = 0.5 * uScale;
    //Based on box ray intersection from Simon Green
    float t = boxRay(uLightPosition, ray, vec3(0.), vec3(1.));


    if(t > 0.) {
        vec3 lightPosition = uLightPosition + t * ray;

        vec3 planeHit = rayTrace(lightPosition, ray, rayType, rayType == 1 ? uRefractions : uReflections, color);
        if(planeHit != vec3(0.)) {
            color = uEnergy * color * uLightColor;
            position.xy = planeHit.xz - vec2(0.5);
        }
        position.xy /= halfScale;
    }

    else st = vec2(100000.);

    data0 = vec4(position.xy, 0., 1.);
    data1 = vec4(color, 1.);
}
`;

export {fsCaustics}
