"use strict";

import * as asr from "./asr.js";

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

function generateBoxGeometryData (
    geometryType, 
    width, height,
    depth, 
    widthSegments,
    heightSegments, 
    depthSegments,
    color = null
) {
    if (!color) color = vec4.fromValues(1.0, 1.0, 1.0, 1.0);

    if(geometryType !== asr.geometryType().Triangles && 
        geometryType !== asr.geometryType().Lines    &&
        geometryType !== asr.geometryType().Points) {
        throw new Error("Geometry type is not correct.");
    }

    let vertices = [];
    let indices = [];

    const halfHeight = height * 0.5;
    const segmentHeight = height / heightSegments;

    const halfWidth = width * 0.5;
    const segmentWidth = width / widthSegments;

    const halfDepth = depth * 0.5;

    //front-side
    for (let i = 0; i <= heightSegments; ++i) {
        let y = i * segmentHeight - halfHeight;
        for (let j = 0; j <= widthSegments; ++j) {
            let x = j * segmentWidth - halfWidth;
            vertices.push(asr.vertex(
                    x, y, halfDepth,
                    color[0], color[1], color[2], color[3]
            ));
            if (geometryType == asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    //right-side
    for (let i = 0; i <= heightSegments; ++i) {
        let y = i * segmentHeight - halfHeight;
        for (let j = 0; j <= widthSegments; ++j) {
            let z = halfWidth - j * segmentWidth;
            vertices.push(asr.vertex(
                    halfDepth, y, z,
                    color[0], color[1], color[2], color[3]
            ));
            if (geometryType == asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    //back-side
    for (let i = 0; i <= heightSegments; ++i) {
        let y = i * segmentHeight - halfHeight;
        for (let j = 0; j <= widthSegments; ++j) {
            let x = halfWidth - j * segmentWidth;
            vertices.push(asr.vertex(
                    x, y, -halfDepth,
                    color[0], color[1], color[2], color[3]
            ));
            if (geometryType == asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    //left-side
    for (let i = 0; i <= heightSegments; ++i) {
        let y = i * segmentHeight - halfHeight;
        for (let j = 0; j <= widthSegments; ++j) {
            let z = j * segmentWidth - halfWidth;
            vertices.push(asr.vertex(
                    -halfDepth, y, z,
                    color[0], color[1], color[2], color[3]
            ));
            if (geometryType == asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    //bottom-side
    for (let i = 0; i <= heightSegments; ++i) {
        let z = i * segmentHeight - halfHeight;
        for (let j = 0; j <= widthSegments; ++j) {
            let x = j * segmentWidth - halfWidth;
            vertices.push(asr.vertex(
                    x, -halfDepth, z,
                    color[0], color[1], color[2], color[3]
            ));
            if (geometryType == asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    //top-side
    for (let i = 0; i <= heightSegments; ++i) {
        let z = i * segmentHeight - halfHeight;
        for (let j = 0; j <= widthSegments; ++j) {
            let x = halfWidth - j * segmentWidth;
            vertices.push(asr.vertex(
                    x, halfDepth, z,
                    color[0], color[1], color[2], color[3]
            ));
            if (geometryType == asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    if (geometryType === asr.geometryType().Lines || geometryType === asr.geometryType().Triangles) {
        let nextSide = (widthSegments + 1) * (heightSegments + 1);
        let side = 0;
        for (let i = 0; i <= depthSegments; ++i) {
            side = nextSide * i;
            for (let j = 0; j < heightSegments; ++j) {
                for(let k = 0; k < widthSegments; ++k) {
                    let indexA = side + j * (widthSegments + 1) + k;
                    let indexB = indexA + 1;
                    let indexC = indexA + (widthSegments + 1);
                    let indexD = indexC + 1;
                    if (geometryType === asr.geometryType().Lines) {
                        if(i % 2 === 0) {
                            indices.push(
                                    indexA, indexB, indexB, indexC, indexC, indexA
                            );
                            indices.push(
                                    indexB, indexD, indexD, indexC, indexC, indexB
                            );
                        }
                        else {
                            indices.push(
                                    indexA, indexD, indexD, indexC, indexC, indexA
                            );
                            indices.push(
                                    indexA, indexB, indexB, indexD, indexD, indexA
                            );
                        }
                    } else {
                        if(i % 2 === 0) {
                            indices.push(indexA, indexB, indexC);
                            indices.push(indexB, indexD, indexC);
                        }
                        else {
                            indices.push(indexA, indexD, indexC);
                            indices.push(indexA, indexB, indexD);
                        }
                    }
                }
            }
        }
    }

    const boxGeometryVertices = new Float32Array(
        vertices.flatMap(v => [v.x, v.y, v.z, v.r, v.g, v.b, v.a])
    );
    const boxGeometryIndices = new Uint16Array(indices);

    return {
        boxVertices: boxGeometryVertices,
        boxIndices: boxGeometryIndices
    };
}

function main() {
    asr.initializeWebGL();
    asr.createShader(vertexShaderSource, fragmentShaderSource);

    asr.prepareForRendering();
    asr.enableFaceCulling();
    asr.enableDepthTest();
    asr.setLineWidth(3);

    const CAMERA_SPEED = 0.05;
    const CAMERA_ROT_SPEED = 0.05;
    const CAMERA_FOV = 1.13;
    const CAMERA_NEAR_PLANE = 0.1;
    const CAMERA_FAR_PLANE = 200.0;

    let cameraPosition = vec3.fromValues(1.4, 0.8, 1.5);
    let cameraRotation = vec3.fromValues(-0.5, 0.75, 0.0);

    const bodyElement = document.querySelector("body");

    bodyElement.addEventListener("keydown", keyDown, true);

    function keyDown( event ) {
        if ("w" === event.key) cameraRotation[0] += CAMERA_ROT_SPEED;
        if ("a" === event.key) cameraRotation[1] += CAMERA_ROT_SPEED;
        if ("s" === event.key) cameraRotation[0] -= CAMERA_ROT_SPEED;
        if ("d" === event.key) cameraRotation[1] -= CAMERA_ROT_SPEED;

        if ("ArrowUp" === event.key) {
            let move = vec3.fromValues(0.0, 0.0, 1.0);
            vec3.transformMat4(move, move, asr.getViewMatrix());
            vec3.scaleAndAdd(cameraPosition, cameraPosition, move, -CAMERA_SPEED);
        }
        if ("ArrowDown" === event.key) {
            let move = vec3.fromValues(0.0, 0.0, 1.0);
            vec3.transformMat4(move, move, asr.getViewMatrix());
            vec3.scaleAndAdd(cameraPosition, cameraPosition, move, CAMERA_SPEED);
        }
    }
    asr.setMatrix(asr.setMatrixMode(asr.matrixMode().Projection));
    asr.loadPerspectiveProjectionMatrix(CAMERA_FOV, CAMERA_NEAR_PLANE, CAMERA_FAR_PLANE);

    function render() {
        asr.prepareForRenderingFrame();
        asr.setMatrix(asr.setMatrixMode(asr.matrixMode().View));
        asr.loadIdentityMatrix();
        asr.translateMatrix(cameraPosition);
        asr.rotateMatrix(cameraRotation);

        const width = 1.0, height = 1.0, depth = 1.0;
        const widthSegments = 5,  heightSegments = 5, depthSegments = 5;
        const triangle = 
            generateBoxGeometryData(
                asr.geometryType().Triangles, width, height, depth, widthSegments, heightSegments, depthSegments
            );
        const triangles = asr.createGeometry(asr.geometryType().Triangles, triangle.boxVertices, triangle.boxIndices); 

        asr.setCurrentGeometry(triangles);
        asr.renderCurrentGeometry();

        const edgeColor = vec4.fromValues(1.0, 0.7, 0.7, 1.0);
        const edge = 
            generateBoxGeometryData(
                asr.geometryType().Lines, width, height, depth, widthSegments, heightSegments, depthSegments, edgeColor
            );
        const lines = asr.createGeometry(asr.geometryType().Lines, edge.boxVertices, edge.boxIndices);

        asr.setCurrentGeometry(lines);
        asr.renderCurrentGeometry();

        const vertexColor = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
        const vertex =
        generateBoxGeometryData(
                asr.geometryType().Points, width, height, depth, widthSegments, heightSegments, depthSegments, vertexColor
            );
        const points = asr.createGeometry(asr.geometryType().Points, vertex.boxVertices, vertex.boxIndices);

        asr.setCurrentGeometry(points);
        asr.renderCurrentGeometry();
        requestAnimationFrame(render);
    }

    render();
}

main();
