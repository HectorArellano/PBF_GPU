const generateTriangles = `#version 300 es

precision highp float;
precision highp sampler2D;

//Pyramid texture containing all the reduction steps.
uniform sampler2D uPyramid;

//Active voxels texture.
uniform sampler2D uBase;

//Potential corners values.
uniform sampler2D uPot;

//triTable data from Paul Bourke 64x64 texture
uniform sampler2D uTrianglesIndexes;

//level 0 of the pyramid.
uniform sampler2D uTotal;

//Uniform used to defined normals quality
uniform bool uFastNormals;

//iso level used to define the surface from the potential
uniform float uRange;
in vec2 uv;

layout(location = 0) out vec4 data1;
layout(location = 1) out vec4 data2;
layout(location = 2) out vec4 data3;

const float EPSILON = 0.00001;

uniform float uCompactSize;

uniform int uLevels;

//Constants used to simulate the 3D texture
uniform vec3 u3D;

//Calculate the 2D index to read the data in the 2D texture based in a 3D position
vec2 index2D(vec3 pos) {
 return (pos.xz + u3D.y * vec2(mod(pos.y, u3D.z), floor(pos.y / u3D.z)) + vec2(0.5)) / u3D.x;
}

void main(void) {
    float p = 1. / u3D.y;
    vec3 p0 = vec3(p, 0., 0.);
    vec3 p1 = vec3(p, p, 0.);
    vec3 p2 = vec3(0., p, 0.);
    vec3 p3 = vec3(0., 0., p);
    vec3 p4 = vec3(p, 0., p);
    vec3 p5 = vec3(p, p, p);
    vec3 p6 = vec3(0., p, p);

    //Evaluate the 1D index of the fragment evaluated.
    float vI = dot(floor(uCompactSize * uv), vec2(1., uCompactSize));
    //If the fragment's key is higher than the total of vertices needed to create the execution is halted.
    if(vI >= texture(uTotal, vec2(0.5)).r) discard;
    else {
        /*
        This is the compaction process, it's explained in
        http://www.miaumiau.cat/2016/10/stream-compaction-in-webgl/
        */
        float offset = u3D.x - 2.;
        float k = 1. / u3D.x;
        vec2 relativePosition = k * vec2(offset, 0.);
        vec4 partialSums = texture(uPyramid, relativePosition);
        float start = 0.;
        vec4 starts = vec4(0.);
        vec4 ends = vec4(0.);
        float div0 = 1. / u3D.y;
        float diff = 2.;
        vec4 m = vec4(0.);
        vec2 position = vec2(0.);
        vec4 vI4 = vec4(vI);

        for(int i = 1; i < uLevels; i++) {
            offset -= diff;
            diff *= 2.;
            relativePosition = position + k * vec2(offset, 0.);
            ends = partialSums.wzyx + vec4(start);
            starts = vec4(start, ends.xyz);
            m = vec4(greaterThanEqual(vI4, starts)) * vec4(lessThan(vI4, ends));
            relativePosition += m.y * vec2(k, 0.) + m.z * vec2(0., k) + m.w * vec2(k, k);
            start = dot(m, starts);
            position = 2. * (relativePosition - k * vec2(offset, 0.));
            partialSums = texture(uPyramid, relativePosition);
        }

        ends = partialSums.wzyx + vec4(start);
        starts = vec4(start, ends.xyz);
        m = vec4(greaterThanEqual(vI4, starts)) * vec4(lessThan(vI4, ends));
        position += m.y * vec2(k, 0.) + m.z * vec2(0., k) + m.w * vec2(k, k);

        /*
        * MARCHING CUBES TO GENERATE THE VERTICES
        * POSITIONS AND NORMALS
        */
        //This data contains the 2D position of the voxel reallocated, the index offset for the vertex to generate in the corresponding voxel
        //and the MC case used for that voxel.
        vec4 data = vec4(position * u3D.x,  vI - dot(m, starts), texture(uBase, position).a);
        //Up to 15 vertices can be generated per voxel, the current vertex to generate is saved in this variable
        float currentVertex = data.b;
        //Calculate the 3D position of the voxel based on the 2D position in the scattered data.
        data.xyz = p * vec3(mod(data.y, u3D.y), u3D.z * floor(data.y * p) + floor(data.x * p), mod(data.x, u3D.y));
        //Obtain the one dimensional index to read the corresponding edge to use.
        float mcIndex = 15. * data.a + currentVertex;
        //Obtain the edge to use from the voxel using the previous index and reading the data from the triTable texture.
        vec4 mcData = texture(uTrianglesIndexes, vec2(mod(mcIndex, 64.), floor(mcIndex / 64.)) / 64.);
        mcIndex = mcData.r;
        //To obtain the two points that define the edge the original implementation uses a set of if conditionals.
        //The shader makes a sum of all the corners using masks to discard the values that are not needed.
        vec4 m0 = vec4(mcIndex);
        //Check if values are in the edge
        vec4 m1 = vec4(equal(m0, vec4(0., 1., 2., 3.)));
        vec4 m2 = vec4(equal(m0, vec4(4., 5., 6., 7.)));
        vec4 m3 = vec4(equal(m0, vec4(8., 9., 10., 11.)));
        //The two points are the voxel position plus the point active using the mask calculated before.
        vec3 b0 = data.rgb + m1.y * p0 + m1.z * p1 + m1.w * p2 + m2.x * p3 + m2.y * p4 + m2.z * p5 + m2.w * p6 + m3.y * p0 + m3.z * p1 + m3.w * p2;
        vec3 b1 = data.rgb + m1.x * p0 + m1.y * p1 + m1.z * p2 + m2.x * p4 + m2.y * p5 + m2.z * p6 + m2.w * p3 + m3.x * p3 + m3.y * p4 + m3.z * p5 + m3.w * p6;
        //Potential values in the corresponding corners
        vec4 n0 = texture(uPot, index2D(u3D.y * b0));
        vec4 n1 = texture(uPot, index2D(u3D.y * b1));
        vec2 diff1 = vec2(uRange - n0.a, n1.a - n0.a);
        //Value used to evaluate the linear interpolation between the two corners points to define the position of the vertex to generate.
        vec3 mult = vec3(lessThan(abs(vec3(diff1.x, uRange - n1.a, -diff1.y)), vec3(0.)));
        vec3 normalA = vec3(0.);
        vec3 normalB = vec3(0.);
        //The regular normals evaluation used forward differences to calculate the gradient.
        if(uFastNormals) {
            vec2 deltaX = index2D(u3D.y * (b0 + vec3(p, 0., 0.)));
            vec2 deltaY = index2D(u3D.y * (b0 + vec3(0., p, 0.)));
            vec2 deltaZ = index2D(u3D.y * (b0 + vec3(0., 0., p)));
            normalA = normalize(-vec3(n0.a - texture(uPot, deltaX).a, n0.a - texture(uPot, deltaY).a, n0.a - texture(uPot, deltaZ).a));

            deltaX = index2D(u3D.y * (b1 + vec3(p, 0., 0.)));
            deltaY = index2D(u3D.y * (b1 + vec3(0., p, 0.)));
            deltaZ = index2D(u3D.y * (b1 + vec3(0., 0., p)));
            normalB = normalize(-vec3(n1.a - texture(uPot, deltaX).a, n1.a - texture(uPot, deltaY).a, n1.a - texture(uPot, deltaZ).a));
        } else {
            //If more smooth gradients are required, a higher order Sobel operator is used to calculate them.
            //this gives a more smoothed surface at the expense of less performance.
            float op = 1.;
            float scaler = 1.;
            vec3 S1A_X = vec3(1., op, 1.);
            vec3 S2A_X = vec3(op, scaler * op, op);
            vec3 S3A_X = vec3(1., op, 1.);
            vec3 S1B_X = vec3(0.);
            vec3 S2B_X = vec3(0.);
            vec3 S3B_X = vec3(0.);
            vec3 S1C_X = vec3(-1., -op, -1.);
            vec3 S2C_X = vec3(-op, -scaler * op, -op);
            vec3 S3C_X = vec3(-1., -op, -1.);
            vec3 S1A_Y = vec3(1., op, 1.);
            vec3 S2A_Y = vec3(0., 0., 0.);
            vec3 S3A_Y = vec3(-1., -op, -1.);
            vec3 S1B_Y = vec3(op, scaler * op, op);
            vec3 S2B_Y = vec3(0., 0., 0.);
            vec3 S3B_Y = vec3(-op, -scaler * op, -op);
            vec3 S1A_Z = vec3(-1., 0., 1.);
            vec3 S2A_Z = vec3(-op, 0., op);
            vec3 S3A_Z = vec3(-1., 0., 1.);
            vec3 S1B_Z = vec3(-op, 0., op);
            vec3 S2B_Z = vec3(-scaler * op, 0., scaler * op);
            vec3 S3B_Z = vec3(-op, 0., op);
            vec3 f1A = vec3(texture(uPot, index2D(u3D.y * (b0 + vec3(-p, p, p)))).a,   texture(uPot, index2D(u3D.y * (b0 + vec3(0., p, p)))).a,   texture(uPot, index2D(u3D.y * (b0 + vec3(p, p, p)))).a);
            vec3 f2A = vec3(texture(uPot, index2D(u3D.y * (b0 + vec3(-p, 0., p)))).a,  texture(uPot, index2D(u3D.y * (b0 + vec3(0., 0., p)))).a,  texture(uPot, index2D(u3D.y * (b0 + vec3(p, 0., p)))).a);
            vec3 f3A = vec3(texture(uPot, index2D(u3D.y * (b0 + vec3(-p, -p, p)))).a,  texture(uPot, index2D(u3D.y * (b0 + vec3(0., -p, p)))).a,  texture(uPot, index2D(u3D.y * (b0 + vec3(p, -p, p)))).a);
            vec3 f1B = vec3(texture(uPot, index2D(u3D.y * (b0 + vec3(-p, p, 0.)))).a,  texture(uPot, index2D(u3D.y * (b0 + vec3(0., p, 0.)))).a,  texture(uPot, index2D(u3D.y * (b0 + vec3(p, p, 0.)))).a);
            vec3 f2B = vec3(texture(uPot, index2D(u3D.y * (b0 + vec3(-p, 0., 0.)))).a, texture(uPot, index2D(u3D.y * (b0 + vec3(0., 0., 0.)))).a, texture(uPot, index2D(u3D.y * (b0 + vec3(p, 0., 0.)))).a);
            vec3 f3B = vec3(texture(uPot, index2D(u3D.y * (b0 + vec3(-p, -p, 0.)))).a, texture(uPot, index2D(u3D.y * (b0 + vec3(0., -p, 0.)))).a, texture(uPot, index2D(u3D.y * (b0 + vec3(p, -p, 0.)))).a);
            vec3 f1C = vec3(texture(uPot, index2D(u3D.y * (b0 + vec3(-p, p, -p)))).a,  texture(uPot, index2D(u3D.y * (b0 + vec3(0., p, -p)))).a,  texture(uPot, index2D(u3D.y * (b0 + vec3(p, p, -p)))).a);
            vec3 f2C = vec3(texture(uPot, index2D(u3D.y * (b0 + vec3(-p, 0., -p)))).a, texture(uPot, index2D(u3D.y * (b0 + vec3(0., 0., -p)))).a, texture(uPot, index2D(u3D.y * (b0 + vec3(p, 0., -p)))).a);
            vec3 f3C = vec3(texture(uPot, index2D(u3D.y * (b0 + vec3(-p, -p, -p)))).a, texture(uPot, index2D(u3D.y * (b0 + vec3(0., -p, -p)))).a, texture(uPot, index2D(u3D.y * (b0 + vec3(p, -p, -p)))).a);
            float xGradient = dot(f1A, S1A_X) + dot(f2A, S2A_X) + dot(f3A, S3A_X) + dot(f1B, S1B_X) + dot(f2B, S2B_X) + dot(f3B, S3B_X) + dot(f1C, S1C_X) + dot(f2C, S2C_X) + dot(f3C, S3C_X);
            float yGradient = dot(f1A, S1A_Y) + dot(f2A, S2A_Y) + dot(f3A, S3A_Y) + dot(f1B, S1B_Y) + dot(f2B, S2B_Y) + dot(f3B, S3B_Y) + dot(f1C, S1A_Y) + dot(f2C, S2A_Y) + dot(f3C, S3A_Y);
            float zGradient = dot(f1A, S1A_Z) + dot(f2A, S2A_Z) + dot(f3A, S3A_Z) + dot(f1B, S1B_Z) + dot(f2B, S2B_Z) + dot(f3B, S3B_Z) + dot(f1C, S1A_Z) + dot(f2C, S2A_Z) + dot(f3C, S3A_Z);
            normalA = vec3(zGradient, yGradient, xGradient);
            f1A = vec3(texture(uPot, index2D(u3D.y * (b1 + vec3(-p, p, p)))).a,   texture(uPot, index2D(u3D.y * (b1 + vec3(0., p, p)))).a,   texture(uPot, index2D(u3D.y * (b1 + vec3(p, p, p)))).a);
            f2A = vec3(texture(uPot, index2D(u3D.y * (b1 + vec3(-p, 0., p)))).a,  texture(uPot, index2D(u3D.y * (b1 + vec3(0., 0., p)))).a,  texture(uPot, index2D(u3D.y * (b1 + vec3(p, 0., p)))).a);
            f3A = vec3(texture(uPot, index2D(u3D.y * (b1 + vec3(-p, -p, p)))).a,  texture(uPot, index2D(u3D.y * (b1 + vec3(0., -p, p)))).a,  texture(uPot, index2D(u3D.y * (b1 + vec3(p, -p, p)))).a);
            f1B = vec3(texture(uPot, index2D(u3D.y * (b1 + vec3(-p, p, 0.)))).a,  texture(uPot, index2D(u3D.y * (b1 + vec3(0., p, 0.)))).a,  texture(uPot, index2D(u3D.y * (b1 + vec3(p, p, 0.)))).a);
            f2B = vec3(texture(uPot, index2D(u3D.y * (b1 + vec3(-p, 0., 0.)))).a, texture(uPot, index2D(u3D.y * (b1 + vec3(0., 0., 0.)))).a, texture(uPot, index2D(u3D.y * (b1 + vec3(p, 0., 0.)))).a);
            f3B = vec3(texture(uPot, index2D(u3D.y * (b1 + vec3(-p, -p, 0.)))).a, texture(uPot, index2D(u3D.y * (b1 + vec3(0., -p, 0.)))).a, texture(uPot, index2D(u3D.y * (b1 + vec3(p, -p, 0.)))).a);
            f1C = vec3(texture(uPot, index2D(u3D.y * (b1 + vec3(-p, p, -p)))).a,  texture(uPot, index2D(u3D.y * (b1 + vec3(0., p, -p)))).a,  texture(uPot, index2D(u3D.y * (b1 + vec3(p, p, -p)))).a);
            f2C = vec3(texture(uPot, index2D(u3D.y * (b1 + vec3(-p, 0., -p)))).a, texture(uPot, index2D(u3D.y * (b1 + vec3(0., 0., -p)))).a, texture(uPot, index2D(u3D.y * (b1 + vec3(p, 0., -p)))).a);
            f3C = vec3(texture(uPot, index2D(u3D.y * (b1 + vec3(-p, -p, -p)))).a, texture(uPot, index2D(u3D.y * (b1 + vec3(0., -p, -p)))).a, texture(uPot, index2D(u3D.y * (b1 + vec3(p, -p, -p)))).a);
            xGradient = dot(f1A, S1A_X) + dot(f2A, S2A_X) + dot(f3A, S3A_X) + dot(f1B, S1B_X) + dot(f2B, S2B_X) + dot(f3B, S3B_X) + dot(f1C, S1C_X) + dot(f2C, S2C_X) + dot(f3C, S3C_X);
            yGradient = dot(f1A, S1A_Y) + dot(f2A, S2A_Y) + dot(f3A, S3A_Y) + dot(f1B, S1B_Y) + dot(f2B, S2B_Y) + dot(f3B, S3B_Y) + dot(f1C, S1A_Y) + dot(f2C, S2A_Y) + dot(f3C, S3A_Y);
            zGradient = dot(f1A, S1A_Z) + dot(f2A, S2A_Z) + dot(f3A, S3A_Z) + dot(f1B, S1B_Z) + dot(f2B, S2B_Z) + dot(f3B, S3B_Z) + dot(f1C, S1A_Z) + dot(f2C, S2A_Z) + dot(f3C, S3A_Z);
            normalB = vec3(zGradient, yGradient, xGradient);
        }
        
        //Save the vertex position, uses a linear interpolation between the two corners points of the edge and the iso value required.
        data1 = vec4(mult.x * b0 + mult.y * b1 + mult.z * b0 + (1. - dot(mult, mult)) * mix(b0, b1, (diff1.x) / (diff1.y)), mcData.b);
        
        //Save the vertex normal, calculate as the pondered median of the two normals from the corners.
        data2 = vec4(normalize(- (n0.a * normalA + n1.a * normalB) / max(n0.a + n1.a, EPSILON)), mcIndex);
        
        //Save the voxel position with the corresponding number of triangles
        data3 = vec4(index2D(data.rgb * u3D.y), currentVertex, 1.);
    }
}
`;

export {generateTriangles}