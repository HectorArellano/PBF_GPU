const fsRaytracer = `#version 300 es

 precision highp sampler2D;
 precision highp float;
 
 uniform sampler2D uPot;
 uniform sampler2D uTT;
 uniform sampler2D uTN;
 uniform sampler2D uScreenPositions;
 uniform sampler2D uScreenNormals;
 uniform sampler2D uFloor;
 uniform sampler2D uLowRes;
 uniform int uMaxSteps;
 uniform int uMaxBounceSteps;
 uniform float uRefract;
 uniform int uReflections;
 uniform int uRefractions;
 uniform float uShadows;
 uniform vec3 uAbsorption;
 uniform vec3 uEye;
 uniform bool uDisableAcceleration;
 uniform vec3 uTexture3D;
 uniform vec3 uVoxelLow;
 uniform vec4 uShade;
 uniform float uAbsorptionDistanceScaler;
 uniform float uBg;
 uniform vec4 uLightData;
 uniform sampler2D uTShadows;
 uniform float uScaleShadow;
 uniform float uShadowIntensity;
 uniform sampler2D uRadiance;
 uniform float uColor;
 uniform float uEnergyDecay;
 uniform float uKillRay;
 uniform vec3 uLightColor;
 uniform vec3 uMaterialColor;
 uniform float uCompactSize;

 in vec2 uv;
 out vec4 colorData;

 const float EPSILON = 1.e-10 ;
 const float e = 2.71828;
 const float acne = 0.00001;

 const vec3 bordersLimits = vec3(1.1, 1.1, 1.1);
 vec3 limits;
 vec3 limits_l;

 float counter = 0.;

 const vec3 yVector = vec3(0., 1., 0.);
 float R0;

 mat3 rotY(float g) {
    g = radians(g);
    vec2 a = vec2(cos(g), sin(g));
    return mat3(a.x, 0.0, a.y,
                0.0, 1.0, 0.0,
                -a.y, 0.0, a.x);
 }

 vec3 lightShade(vec3 matColor, vec3 eye, vec3 norm, vec3 light) {

     float specular = pow(max(dot(normalize(reflect(light, norm)), -eye), 0.), uShade.w);
     float diffuse = max(dot(light, norm), 0.);
     return uShade.x * specular * vec3(1.) + uShade.y * diffuse * matColor * uLightColor;
;
 }

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

 bool planeIntersect(vec3 rayOrigin, vec3 rayDirection, vec3 planeNormal, float d, out float param) {
    param = -1.;
    float ang = dot(rayDirection, planeNormal);
    if(ang == 0.) return false;
    param = -(dot(rayOrigin, planeNormal) - d) / ang;
    return param >= 0.;
 }

float sphereIntersect(vec3 rayOrigin, vec3 rayDirection, vec3 center, float radius) {
 vec3 op = center - rayOrigin;
 float t = 0.;
 float epsilon = 1e-10;
 float b = dot(op, rayDirection);
 float disc = b * b - dot(op, op) + radius * radius;
 if(disc < 0.) return 0.;
 disc = sqrt(disc);
 return (t = b - disc) > epsilon ? t : ((t = b + disc) > epsilon ? t : 0.);
}

 float Fresnel(in vec3 incom, in vec3 normal, in float index_internal, in float index_external) {
 	float eta = index_internal / index_external;
 	float cos_theta1 = dot(incom, normal);
 	float cos_theta2 = 1.0 - (eta * eta) * (1.0 - cos_theta1 * cos_theta1);

 	if (cos_theta2 < 0.0) return 1.0;

 	else {
 		cos_theta2 = sqrt(cos_theta2);
 		float fresnel_rs = (index_internal * cos_theta1 - index_external * cos_theta2) / (index_internal * cos_theta1 + index_external * cos_theta2);
 		float fresnel_rp = (index_internal * cos_theta2 - index_external * cos_theta1) / (index_internal * cos_theta2 + index_external * cos_theta1);
 		return (fresnel_rs * fresnel_rs + fresnel_rp * fresnel_rp) * 0.5;
 	}
 }

  vec3 floorShade(vec3 matColor, vec3 light) {
      return max(dot(light, yVector), 0.) * matColor * uLightColor;
  }

 vec3 rayTrace( vec3 eye, vec3 initPos,  vec3 rayDirection,  int rayType,  int totalBounces) {
 
    limits = vec3(uTexture3D.y) * bordersLimits;
    limits_l = vec3(uVoxelLow.y) * bordersLimits;
    vec3 color = pow(vec3(uBg), vec3(2.2));
    vec3 normal = vec3(0.);
    const int maxIter = 1200;
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
    float tPlane = 0.;
    float voxelIndex = 0.;
    vec2 UV = vec2(0.);
    vec2 _UV = vec2(0.);
    float tPlane2 = 100000.;


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

            //Floor plane
            if(planeIntersect(initPos, rayDirection, vec3(0., 1., 0.), 0.0, tPlane)) {
                vec3 pointInPlane = initPos + tPlane * rayDirection;
                vec3 rotVector = rotY(-0.) * pointInPlane;
                vec3 lightVector = uLightData.rgb - pointInPlane;
                vec3 lightDirection = normalize(lightVector);
                color = textureLod(uFloor, rotVector.xz, 3.).rgb;
                color = floorShade(color, lightDirection);
                color *= uLightData.a / pow(length(lightVector), 2.);
                color += pow(vec3(uBg), vec3(2.2));
                vec2 st = (pointInPlane.xz - vec2(0.5)) / uScaleShadow + vec2(0.5);
                if(all(greaterThan(st, vec2(0.))) && all(lessThan(st, vec2(1.)))) {
                    float shadow = 1. - textureLod(uTShadows, st, 3.).r;
                    color *= clamp(shadow, 1.- uShadowIntensity, 1.);
                    color += pow(texture(uRadiance, st).rgb, vec3(2.2));
                }
            }

//            //polar array of white spheres used for reflecting fake lights
//            for(float i = 0.; i < 360.; i += 40.) {
//                float j = radians(i);
//                vec3 center = 10. * vec3(cos(j), sin(j), 0.) + vec3(0.5);
//                if(sphereIntersect(initPos, rayDirection, center, .5) > 0.) color = vec3(2.);
//            }

            break;
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

                    float index = partialIndex + voxelIndex;

                     if(param > 0. && param < 10.) {

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


                         if(rayType == 1) {
                            float refractValue = uRefract;
                            rayDirection = refract(rayDirection, n, inside ? uRefract : 1. / uRefract);

                             //Handling total internal reflection.
                            if(length(rayDirection) == 0.) {
                               rayDirection = reflect(prevRay, n);
                               inside = true;
                            }
                         }

                         else rayDirection = reflect(rayDirection, normal);

                         initPos += acne * rayDirection;

                         deltaDist = abs(1. / max(abs(rayDirection), vec3(EPSILON)));
                         rayStep = sign(rayDirection);
                         pos = uTexture3D.y * initPos;
                         pos0_h = pos;
                         pos0_l = changeToLow * pos;
                         mapPos = floor(pos);
                         sideDist = (rayStep * (mapPos - pos) + (rayStep * 0.5) + 0.5) * deltaDist;

                         bounces++;

                         counter ++;
                     }
                }
            }

        } else {

            mapPos_l = mapPos;

            if(resolution) {

                highResolution = true;
                pos0_h = changeToHigh * (pos0_l + 0.9999 * t * rayDirection);
                pos = pos0_h;
                mapPos = floor(pos);
                sideDist = (rayStep * (mapPos - pos + 0.5) + 0.5) * deltaDist;
            }
        }

        highResolution = resolution;
    }


     if(rayType == 1) color *= pow(vec3(e), -distanceTraveled * uAbsorption * uAbsorptionDistanceScaler);
     return color;
  }



 void main(void) {

    vec4 data = texture(uScreenPositions, uv);
    if(data.a < EPSILON) discard;

    vec3 position = data.rgb;
    vec3 normal = texture(uScreenNormals, uv).rgb;

    vec3 eye = normalize(position - uEye);
    vec3 initialPos = position;

    vec3 lightVector = uLightData.rgb - position;
    vec3 lightDirection = normalize(lightVector);

    vec3 color = lightShade(uMaterialColor, -eye, normal, lightDirection);
    color *= uLightData.a / pow(length(lightVector), 2.);

    float fresnel = Fresnel(-eye, normal, 1., uRefract);
    float Kr = fresnel;
    float Kt = 1. - Kr;

//    Kr *= step(-Kr, -uKillRay);
//    Kt *= step(-Kt, -uKillRay);

    vec3 dielectricColor = vec3(0.);

    if(uRefractions > 0 && Kt > 0.) dielectricColor += Kt * (rayTrace(eye, initialPos, refract(eye, normal, 1. / uRefract), 1, uRefractions));

    if(uReflections > 0 && Kr > 0.) dielectricColor += Kr * (rayTrace(eye, initialPos, normalize(reflect(eye, normal)), 2, uReflections));

    color += dielectricColor;
    //color = mix(dielectricColor, color, uShade.y);

    colorData = vec4(pow(color, vec3(.4545)), 1.);

}
`;

export {fsRaytracer}