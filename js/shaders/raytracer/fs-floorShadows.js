const fsFloorShadows = `#version 300 es

 precision highp sampler2D;
 precision highp float;
 uniform sampler2D uPot;
 uniform sampler2D uTT;
 uniform sampler2D uTN;
 uniform sampler2D uLowRes;

 uniform int uMaxSteps;
 uniform int uMaxBounceSteps;
 uniform vec3 uTexture3D;
 uniform vec3 uVoxelLow;
 uniform vec4 uLightData;
 uniform float uSize;
 uniform float uCompactSize;

 in vec3 vNor;
 in vec3 vPos;
 in vec2 vText;
 
 const float EPSILON = 1.e-10 ;
 const float E = 0.00;
 const float e = 2.71828;
 const float acne = 0.000001;

 const vec3 bordersLimits = vec3(1.1, 1.1, 1.1);
 vec3 limits;
 vec3 limits_l;

 const vec3 yVector = vec3(0., 1., 0.);
 float R0;
 
 layout(location = 0) out vec4 data0;
 layout(location = 1) out vec4 data1;

 vec2 index2D(vec3 pos, vec3 voxelData) {
     return (pos.xz + voxelData.y * vec2(mod(pos.y, voxelData.z), floor(pos.y / voxelData.z)) + vec2(0.5)) / voxelData.x;
 }

 vec2 index_triangles(float index) {
     return (vec2(mod(index, uCompactSize), floor(index / uCompactSize)) + vec2(0.5)) / uCompactSize;
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

   float boxIntersect( in vec3 ro, in vec3 rd, in vec3 rad ) {
    vec3 m = 1.0/rd;
    vec3 n = m*ro;
    vec3 k = abs(m)*rad;
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;
    float tN = max( max( t1.x, t1.y ), t1.z );
    float tF = min( min( t2.x, t2.y ), t2.z );
    if( tN > tF || tF < 0.0) return -1.;
    return tN;
   }

 float rayTrace(vec3 initPos,  vec3 rayDirection) {

    const int maxIter = 600;
    limits = vec3(uTexture3D.y) * bordersLimits;
    limits_l = vec3(uVoxelLow.y) * bordersLimits;
 
    vec3 bouncesLimits = vec3(1, uMaxSteps, uMaxBounceSteps);
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

    for(int i = 0; i < maxIter; i ++) {

        bool stepsLimits = any(greaterThanEqual(vec3(bounces, i, maxStepsPerBounce), bouncesLimits));
        bool borders = any(lessThan(mapPos, vec3(0.))) || any(greaterThan(mapPos_h, limits)) || any(greaterThan(mapPos_l, limits_l));

        t = min(sideDist.x, min(sideDist.y, sideDist.z));

        stepForward = step(sideDist.xyz, sideDist.yxy) * step(sideDist.xyz, sideDist.zzx);

        sideDist += stepForward * deltaDist;
        pos += stepForward * rayStep;
        mapPos = floor(pos);
    	maxStepsPerBounce ++;

        if(borders || stepsLimits) return -1.;

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

                if(voxelIndex > 0.) {

                    float comparator = 1e10;
                    float param = 1e10;
                    float partialIndex = 0.;
                    float q = 0.;
                    float numberOfTriangles = texture(uTT, index_triangles(voxelIndex)).a;

                    //Evaulate triangles with if branching.
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

                    if(param > 0. && param < 10.) return param;
                }
            }

        } else {

            mapPos_l = mapPos;

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

     return -1.;
  }



 void main(void) {

    vec3 lightVector = uLightData.rgb - vPos;
    float intensity = 0.;
    vec3 rayDirection = normalize(lightVector);
    vec3 initialPosition = vPos;
    bool shadows = false;
    vec2 posShadows = vec2(0.5);
    float distance = 0.;

    if(all(bvec4(vPos.x >= 0., vPos.x <= 1., vPos.z >= 0., vPos.z <= 1.))) {
        distance = rayTrace(initialPosition, rayDirection);
    } else {
        float t = boxIntersect(vPos - vec3(0.5, 1.0, 0.5), rayDirection, vec3(.5, 1., .5));
        if(t > 0.) {
            initialPosition += 1.01 * t * rayDirection;
            distance = rayTrace(initialPosition, rayDirection);
        }
    }

    if(distance > 0.) {
        intensity = 1.;
        posShadows = gl_FragCoord.xy / uSize;
//        distance *= 2.;
//        distance = 1. / (1. + distance * distance);
    }

    data0 = vec4(intensity, distance, 1., 1.);
    data1 = vec4(posShadows, posShadows);

}

`;

export {fsFloorShadows}