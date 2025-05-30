"use strict";

const vertexShaderSource = `
    attribute vec4 position;
    attribute vec4 color;
    attribute vec4 textureCoordinates;

    uniform bool textureEnabled;
    uniform mat4 textureTransformationMatrix;

    uniform mat4 modelViewProjectionMatrix;

    varying vec4 fragmentColor;
    varying vec2 fragmentTextureCoordinates;

    void main() {
        fragmentColor = color;
        if(textureEnabled) {
            vec4 transformedTextureCoordinates = textureTransformationMatrix * vec4(textureCoordinates.st, 0.0, 1.0);
            fragmentTextureCoordinates = transformedTextureCoordinates.st;
        }

        gl_Position = modelViewProjectionMatrix * position;
        gl_PointSize = 10.0;
    }
`;

const fragmentShaderSource = `
    precision mediump float;

    uniform bool textureEnabled;
    uniform int texturingMode;
    uniform sampler2D textureSampler;

    varying vec4 fragmentColor;
    varying vec2 fragmentTextureCoordinates;

    void main() {
        gl_FragColor = fragmentColor;

       if (textureEnabled) {
            vec4 texelColor = texture2D(textureSampler, fragmentTextureCoordinates);
            gl_FragColor = vec4(texelColor.rgb, texelColor.a);
        }
    }
`;

function generateSphereGeometryData(
    geometryType,
    radius,
    widthSegmentsCount,
    heightSegmentsCount,
    color = null
) {
    if (!color) color = vec4.fromValues(1.0, 1.0, 1.0, 1.0);

    if (geometryType !== asr.geometryType().Triangles &&
        geometryType !== asr.geometryType().Lines &&
        geometryType !== asr.geometryType().Points) {
        throw new Error("Geometry type is not correct.");
    }

    let vertices = [];
    let indices = [];

    for (let i = 0; i <= heightSegmentsCount; ++i) {
        let v = i / heightSegmentsCount;
        let phi = v * asr.PI;

        for (let j = 0; j <= widthSegmentsCount; ++j) {
            let u = j / widthSegmentsCount;
            let theta = u * asr.TWO_PI;

            let cosPhi = Math.cos(phi);
            let sinPhi = Math.sin(phi);
            let cosTheta = Math.cos(theta);
            let sinTheta = Math.sin(theta);

            let x = cosTheta * sinPhi;
            let y = cosPhi;
            let z = sinPhi * sinTheta;

            vertices.push(asr.vertex(
                x * radius, y * radius, z * radius,
                color[0], color[1], color[2], color[3],
                1.0 - u, v
            ));

            if (geometryType === asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    if (geometryType === asr.geometryType().Lines || geometryType === asr.geometryType().Triangles) {
        for (let rows = 0; rows < heightSegmentsCount; ++rows) {
            for (let columns = 0; columns < widthSegmentsCount; ++columns) {
                let indexA = rows * (widthSegmentsCount + 1) + columns;
                let indexB = indexA + 1;
                let indexC = indexA + (widthSegmentsCount + 1);
                let indexD = indexC + 1;
                if (geometryType === asr.geometryType().Lines) {
                    if (rows != 0) {
                        indices.push(
                            indexA, indexB, indexB, indexC, indexC, indexA
                        );
                    }
                    if (rows != heightSegmentsCount - 1) {
                        indices.push(
                            indexB, indexD, indexD, indexC, indexC, indexB
                        );
                    }

                } else {
                    if (rows != 0) {
                        indices.push(indexA, indexB, indexC);
                    }
                    if (rows != heightSegmentsCount - 1) {
                        indices.push(indexB, indexD, indexC);
                    }
                }
            }
        }
    }
    const sphereGeometryVertices = new Float32Array(
        vertices.flatMap(v => [v.x, v.y, v.z, v.r, v.g, v.b, v.a, v.u, v.v])
    );
    const sphereGeometryIndices = new Uint16Array(indices);

    return {
        sphereVertices: sphereGeometryVertices,
        sphereIndices: sphereGeometryIndices
    };
}

function main() {
    asr.initializeWebGL(500, 500); // Width, Height
    asr.createShader(vertexShaderSource, fragmentShaderSource);

    const radius = 0.5;
    const widthSegments = 20, heightSegments = 20;

    const triangle =
        generateSphereGeometryData(
            asr.geometryType().Triangles, radius, widthSegments, heightSegments
        );
    const triangles = asr.createGeometry(asr.geometryType().Triangles, triangle.sphereVertices, triangle.sphereIndices);

    //Sun texture

    const sunTexture = asr.createTexture("sun");

    //Venus texture

    const venusTexture = asr.createTexture("venus");

    //Earth texture

    const earthTexture = asr.createTexture("earth");

    //Moon texture

    const moonTexture = asr.createTexture("moon");

    asr.prepareForRendering();
    asr.enableDepthTest();
    asr.enableFaceCulling();
    asr.setLineWidth(3);

    const CAMERA_SPEED = 1.0;
    const CAMERA_ROT_SPEED = 1.0;
    const CAMERA_FOV = 1.3;
    const CAMERA_NEAR_PLANE = 0.1;
    const CAMERA_FAR_PLANE = 200;

    let cameraPosition = vec3.fromValues(1.4, 1.0, 1.5);
    let cameraRotation = vec3.fromValues(-0.5, 0.75, 0.0);
    let dt = asr.getDeltaTime();

    const keys = asr.setKeysEventHandler();

    function updateCamera() {
        if (keys.isKeyPressed("w")) cameraRotation[0] += CAMERA_ROT_SPEED * dt;
        if (keys.isKeyPressed("a")) cameraRotation[1] += CAMERA_ROT_SPEED * dt;
        if (keys.isKeyPressed("s")) cameraRotation[0] -= CAMERA_ROT_SPEED * dt;
        if (keys.isKeyPressed("d")) cameraRotation[1] -= CAMERA_ROT_SPEED * dt;

        if (keys.isKeyPressed("ArrowUp")) {
            let move = vec3.fromValues(0.0, 0.0, 1.0);
            vec3.transformMat4(move, move, asr.getViewMatrix());
            vec3.scaleAndAdd(cameraPosition, cameraPosition, move, -CAMERA_SPEED * dt);
        }
        if (keys.isKeyPressed("ArrowDown")) {
            let move = vec3.fromValues(0.0, 0.0, 1.0);
            vec3.transformMat4(move, move, asr.getViewMatrix());
            vec3.scaleAndAdd(cameraPosition, cameraPosition, move, CAMERA_SPEED * dt);
        }

        requestAnimationFrame(updateCamera);
    }

    updateCamera();

    asr.setMatrixMode(asr.matrixMode().Projection);
    asr.loadPerspectiveProjectionMatrix(CAMERA_FOV, CAMERA_NEAR_PLANE, CAMERA_FAR_PLANE);

    //Sun data

    let sunRotation = 0.0;
    const sunRotationDelta = 0.02;
    const sunScale = 1.0;

    //Venus data

    let venusRotation = 0.0;
    const venusRotationDelda = 0.07;
    const venusToSunDistance = 0.8;
    let venusSunOrbitAngle = 0.0;
    const venusSunOrbitAngleDelta = 0.009;
    const venusScale = 0.22;

    //Earth data

    let earthRotation = 0.0;
    const earthRotationDelta = -0.02;
    const earthToSunDistance = 1.5;
    let earthSunOrbitAngle = 0.0;
    const earthSunOrbitAngleDelta = 0.003;
    const earthScale = 0.3;

    //Moon data

    let moonRotation = 0.0;
    const moonRotationDelta = 0.1;
    const moonToEarthDistance = 0.7;
    let moonEarthOrbitAngle = 0.0;
    const moonEarthOrbitAngleDelta = -0.03;
    const moonScale = 0.3;

    function render() {
        asr.prepareForRenderingFrame();

        asr.setMatrixMode(asr.matrixMode().View);
        asr.loadIdentityMatrix();
        asr.translateMatrix(cameraPosition);
        asr.rotateMatrix(cameraRotation);

        //Sun

        asr.setMatrixMode(asr.matrixMode().Model);
        asr.loadIdentityMatrix();
        asr.rotateMatrix(vec3.fromValues(0.0, sunRotation, 0.0));
        sunRotation += sunRotationDelta;
        asr.scaleMatrix(vec3.fromValues(sunScale, sunScale, sunScale));

        asr.setTextureCurrent(sunTexture);
        asr.setCurrentGeometry(triangles);
        asr.renderCurrentGeometry();

        //Venus

        asr.loadIdentityMatrix();
        asr.rotateMatrix(vec3.fromValues(0.0, venusSunOrbitAngle, 0.0));
        venusSunOrbitAngle += venusSunOrbitAngleDelta;
        asr.translateMatrix(vec3.fromValues(venusToSunDistance, 0.0, 0.0));
        asr.rotateMatrix(vec3.fromValues(0.0, venusRotation, 0.0));
        venusRotation += venusRotationDelda;
        asr.scaleMatrix(vec3.fromValues(venusScale, venusScale, venusScale));

        asr.setTextureCurrent(venusTexture);
        asr.renderCurrentGeometry();

        //Earth

        asr.loadIdentityMatrix();
        asr.rotateMatrix(vec3.fromValues(0.0, earthSunOrbitAngle, 0.0));
        earthSunOrbitAngle += earthSunOrbitAngleDelta;
        asr.translateMatrix(vec3.fromValues(earthToSunDistance, 0.0, 0.0));
        asr.pushMatrix();
        asr.rotateMatrix(vec3.fromValues(0.0, earthRotation, 0.0));
        earthRotation += earthRotationDelta;
        asr.scaleMatrix(vec3.fromValues(earthScale, earthScale, earthScale));

        asr.setTextureCurrent(earthTexture);
        asr.renderCurrentGeometry();

        //Moon

        asr.popMatrix();
        asr.rotateMatrix(vec3.fromValues(0.0, moonEarthOrbitAngle, 0.0));
        moonEarthOrbitAngle += moonEarthOrbitAngleDelta;
        asr.translateMatrix(vec3.fromValues(moonToEarthDistance, 0.0, 0.0));
        asr.rotateMatrix(vec3.fromValues(0.0, moonRotation, 0.0));
        moonRotation += moonRotationDelta;
        asr.scaleMatrix(vec3.fromValues(moonScale, moonScale, moonScale));

        asr.setTextureCurrent(moonTexture);
        asr.renderCurrentGeometry();

        asr.finishFrameRendering();
        requestAnimationFrame(render);
    }
    render();
}

main();