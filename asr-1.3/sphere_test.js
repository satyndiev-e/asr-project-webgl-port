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

    #define TEXTURING_MODE_ADDITION            0
    #define TEXTURING_MODE_SUBTRACTION         1
    #define TEXTURING_MODE_REVERSE_SUBTRACTION 2
    #define TEXTURING_MODE_MODULATION          3
    #define TEXTURING_MODE_DECALING            4

    uniform bool textureEnabled;
    uniform int texturingMode;
    uniform sampler2D textureSampler;

    varying vec4 fragmentColor;
    varying vec2 fragmentTextureCoordinates;

    void main() {
        vec4 outputColor = fragmentColor;

        if (textureEnabled) {
            vec4 texelColor = texture2D(textureSampler, fragmentTextureCoordinates);

            if (texturingMode == TEXTURING_MODE_ADDITION) {
                outputColor.rgb += texelColor.rgb;
                outputColor.a = min(outputColor.a + texelColor.a, 1.0);
            } else if (texturingMode == TEXTURING_MODE_SUBTRACTION) {
                outputColor.rgb = max(outputColor.rgb - texelColor.rgb, 0.0);
            } else if (texturingMode == TEXTURING_MODE_REVERSE_SUBTRACTION) {
                outputColor.rgb = max(texelColor.rgb - outputColor.rgb, 0.0);
            } else if (texturingMode == TEXTURING_MODE_MODULATION) {
                outputColor *= texelColor;
            } else if (texturingMode == TEXTURING_MODE_DECALING) {
                outputColor.rgb = mix(outputColor.rgb, texelColor.rgb, texelColor.a);
            }
        }

        gl_FragColor = outputColor;
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
                0.0, 0.0, 1.0,
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
        vertices.flatMap(v => [v.x, v.y, v.z, v.nx, v.ny, v.nz, v.r, v.g, v.b, v.a, v.u, v.v])
    );
    const sphereGeometryIndices = new Uint16Array(indices);

    return {
        sphereVertices: sphereGeometryVertices,
        sphereIndices: sphereGeometryIndices
    };
}

function main() {
    asr.initializeWebGL(500, 500); // Width, Height

    const meterial = asr.createMaterial(vertexShaderSource, fragmentShaderSource);

    const radius = 0.5;
    const widthSegments = 20, heightSegments = 20;

    const triangle =
        generateSphereGeometryData(
            asr.geometryType().Triangles, radius, widthSegments, heightSegments
        );
    const triangles = asr.createGeometry(asr.geometryType().Triangles, triangle.sphereVertices, triangle.sphereIndices);

    const edgeColor = vec4.fromValues(1.0, 0.7, 0.7, 1.0);
    const edge =
        generateSphereGeometryData(
            asr.geometryType().Lines, radius * 1.005, widthSegments, heightSegments, edgeColor
        );
    const lines = asr.createGeometry(asr.geometryType().Lines, edge.sphereVertices, edge.sphereIndices);

    const vertexColor = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
    const vertex =
        generateSphereGeometryData(
            asr.geometryType().Points, radius * 1.01, widthSegments, heightSegments, vertexColor
        );
    const points = asr.createGeometry(asr.geometryType().Points, vertex.sphereVertices, vertex.sphereIndices);

    const texture = asr.createTexture("uv_test");

    asr.prepareForRendering();
    asr.setMaterialCurrent(meterial);
    asr.setMaterialLineWidth(3);
    asr.setMaterialPointSize(10);
    asr.setMaterialFaceCullingEnabled(true);
    asr.setMaterialDepthTestEnabled(true);

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

    function render() {
        asr.prepareForRenderingFrame();

        asr.setMatrixMode(asr.matrixMode().View);
        asr.loadIdentityMatrix();
        asr.translateMatrix(cameraPosition);
        asr.rotateMatrix(cameraRotation);

        asr.setCurrentGeometry(triangles);
        asr.setTextureCurrent(texture);
        asr.renderCurrentGeometry();

        asr.setTextureCurrent(null);
        asr.setCurrentGeometry(lines);
        asr.renderCurrentGeometry();

        asr.setCurrentGeometry(points);
        asr.renderCurrentGeometry();

        asr.finishFrameRendering();
        requestAnimationFrame(render);
    }
    render();
}

main();