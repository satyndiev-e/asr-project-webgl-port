"use strict";

const vertexShaderSource = `
    attribute vec4 position;
    attribute vec4 color;

    uniform mat4 modelViewProjectionMatrix;

    varying vec4 fragmentColor;

    void main() {
        fragmentColor = color;

        gl_Position = modelViewProjectionMatrix * position;
        gl_PointSize = 10.0;
    }
`;

const fragmentShaderSource = `
    precision mediump float;

    varying vec4 fragmentColor;

    void main() {
        gl_FragColor = fragmentColor;
    }
`;

function generateSphereGeometryData(
    geometryType,
    radius,
    widthSegments,
    heightSegments,
    color = null
) {
    if (!color) color = vec4.fromValues(1.0, 1.0, 1.0, 1.0);

    if (geometryType !== asr.geometryType().Triangles &&
        geometryType !== asr.geometryType().Lines &&
        geometryType !== asr.geometryType().Points) {
        throw new Error("Geometry type is not correct!");
    }

    let vertices = [];
    let indices = [];

    for (let i = 0; i <= heightSegments; ++i) {
        let v = i / heightSegments;
        let phi = v * asr.PI;
        for (let j = 0; j <= widthSegments; ++j) {
            let u = j / widthSegments;
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
                color[0], color[1], color[2], color[3]
            ));

            if (geometryType === asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    if (geometryType === asr.geometryType().Lines || geometryType === asr.geometryType().Triangles) {
        for (let i = 0; i < heightSegments; ++i) {
            for (let j = 0; j < widthSegments; ++j) {
                let indexA = i * (widthSegments + 1) + j;
                let indexB = indexA + 1;
                let indexC = indexA + (widthSegments + 1);
                let indexD = indexC + 1;
                if (geometryType === asr.geometryType().Lines) {
                    indices.push(
                        indexA, indexB, indexB, indexC, indexC, indexA
                    );
                    indices.push(
                        indexB, indexD, indexD, indexC, indexC, indexB
                    );
                } else {
                    indices.push(indexA, indexB, indexC);
                    indices.push(indexB, indexD, indexC);
                }
            }
        }
    }
    const sphereGeometryVertices = new Float32Array(
        vertices.flatMap(v => [v.x, v.y, v.z, v.r, v.g, v.b, v.a])
    );
    const sphereGeometryIndices = new Uint16Array(indices);

    return {
        sphereVertices: sphereGeometryVertices,
        sphereIndices: sphereGeometryIndices
    };
}

function main() {
    asr.initializeWebGL();
    asr.createShader(vertexShaderSource, fragmentShaderSource);

    const radius = 0.7;
    const widthSegments = 20, heightSegments = 20;

    const triangle =
        generateSphereGeometryData(
            asr.geometryType().Triangles, radius, widthSegments, heightSegments
        );
    const triangles = asr.createGeometry(asr.geometryType().Triangles, triangle.sphereVertices, triangle.sphereIndices);

    const edgeColor = vec4.fromValues(1.0, 0.7, 0.7, 1.0);
    const edge =
        generateSphereGeometryData(
            asr.geometryType().Lines, radius * 1.001, widthSegments, heightSegments, edgeColor
        );
    const lines = asr.createGeometry(asr.geometryType().Lines, edge.sphereVertices, edge.sphereIndices);

    const vertexColor = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
    const vertex =
        generateSphereGeometryData(
            asr.geometryType().Points, radius * 1.01, widthSegments, heightSegments, vertexColor
        );
    const points = asr.createGeometry(asr.geometryType().Points, vertex.sphereVertices, vertex.sphereIndices);

    asr.prepareForRendering();
    asr.enableDepthTest();
    asr.enableFaceCulling();
    asr.setLineWidth(3);

    const CAMERA_SPEED = 0.01;
    const CAMERA_ROT_SPEED = 0.01;
    const CAMERA_FOV = 1.3;
    const CAMERA_NEAR_PLANE = 0.1;
    const CAMERA_FAR_PLANE = 200;

    let cameraPosition = vec3.fromValues(1.4, 1.0, 1.5);
    let cameraRotation = vec3.fromValues(-0.5, 0.75, 0.0);

    const keys = asr.setKeysEventHandler();

    function updateCamera() {
        if (keys.isKeyPressed("w")) cameraRotation[0] += CAMERA_ROT_SPEED;
        if (keys.isKeyPressed("a")) cameraRotation[1] += CAMERA_ROT_SPEED;
        if (keys.isKeyPressed("s")) cameraRotation[0] -= CAMERA_ROT_SPEED;
        if (keys.isKeyPressed("d")) cameraRotation[1] -= CAMERA_ROT_SPEED;
    
        if (keys.isKeyPressed("ArrowUp")) {
            let move = vec3.fromValues(0.0, 0.0, 1.0);
            vec3.transformMat4(move, move, asr.getViewMatrix());
            vec3.scaleAndAdd(cameraPosition, cameraPosition, move, -CAMERA_SPEED);
        }
        if (keys.isKeyPressed("ArrowDown")) {
            let move = vec3.fromValues(0.0, 0.0, 1.0);
            vec3.transformMat4(move, move, asr.getViewMatrix());
            vec3.scaleAndAdd(cameraPosition, cameraPosition, move, CAMERA_SPEED);
        }

        requestAnimationFrame(updateCamera);
    }

    updateCamera();

    asr.setMatrix(asr.setMatrixMode(asr.matrixMode().Projection));
    asr.loadPerspectiveProjectionMatrix(CAMERA_FOV, CAMERA_NEAR_PLANE, CAMERA_FAR_PLANE);

    function render() {
        asr.prepareForRenderingFrame();
        asr.setMatrix(asr.setMatrixMode(asr.matrixMode().View));
        asr.loadIdentityMatrix();
        asr.translateMatrix(cameraPosition);
        asr.rotateMatrix(cameraRotation);

        asr.setCurrentGeometry(triangles);
        asr.renderCurrentGeometry();

        asr.setCurrentGeometry(lines);
        asr.renderCurrentGeometry();

        asr.setCurrentGeometry(points);
        asr.renderCurrentGeometry();
        requestAnimationFrame(render)
    }

    render();
}

main();
