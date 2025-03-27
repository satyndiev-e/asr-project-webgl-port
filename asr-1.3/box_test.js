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

            outputColor = vec4(texelColor.rgb, texelColor.a);
        }

        gl_FragColor = outputColor;
    }
`;

function generateBoxGeometryData(
    geometryType,
    width, height,
    depth,
    widthSegmentsCount,
    heightSegmentsCount,
    depthSegmentsCount,
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

    const halfHeight = height * 0.5;
    const segmentHeight = height / heightSegmentsCount;

    const halfWidth = width * 0.5;
    const segmentWidth = width / widthSegmentsCount;

    const halfDepth = depth * 0.5;
    const segmentDepth = depth / depthSegmentsCount;

    //Front Face of the Box

    for (let i = 0; i <= heightSegmentsCount; ++i) {
        let y = i * segmentHeight - halfHeight;
        let v = 1.0 / 3.0 + (1.0 - i / heightSegmentsCount) / 3.0;
        for (let j = 0; j <= widthSegmentsCount; ++j) {
            let x = j * segmentWidth - halfWidth;
            let u = 0.25 + j / widthSegmentsCount * 0.25;
            vertices.push(asr.vertex(
                x, y, halfDepth,
                0.0, 0.0, 1.0,
                color[0], color[1], color[2], color[3],
                u, v
            ));
            if (geometryType == asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    //Right Face of the Box

    for (let i = 0; i <= heightSegmentsCount; ++i) {
        let y = i * segmentHeight - halfHeight;
        let v = 1.0 / 3.0 + (1.0 - i / heightSegmentsCount) / 3.0;
        for (let j = 0; j <= depthSegmentsCount; ++j) {
            let z = halfDepth - j * segmentDepth;
            let u = 0.5 + (1.0 - j / depthSegmentsCount) * 0.25;
            vertices.push(asr.vertex(
                halfDepth, y, z,
                1.0, 0.0, 0.0,
                color[0], color[1], color[2], color[3],
                u, v
            ));
            if (geometryType == asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    //Back Face of the Box

    for (let i = 0; i <= heightSegmentsCount; ++i) {
        let y = i * segmentHeight - halfHeight;
        let v = 1.0 / 3.0 + (1.0 - i / heightSegmentsCount) / 3.0;
        for (let j = 0; j <= widthSegmentsCount; ++j) {
            let x = halfWidth - j * segmentWidth;
            let u = 0.75 + (1.0 - j / widthSegmentsCount) * 0.25;
            vertices.push(asr.vertex(
                x, y, -halfDepth,
                0.0, 0.0, -1.0,
                color[0], color[1], color[2], color[3],
                u, v
            ));
            if (geometryType == asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    //Left Face of the Box

    for (let i = 0; i <= heightSegmentsCount; ++i) {
        let y = i * segmentHeight - halfHeight;
        let v = 1.0 / 3.0 + (1.0 - i / heightSegmentsCount) / 3.0;
        for (let j = 0; j <= depthSegmentsCount; ++j) {
            let z = j * segmentDepth - halfDepth;
            let u = j / depthSegmentsCount * 0.25;
            vertices.push(asr.vertex(
                -halfDepth, y, z,
                -1.0, 0.0, 0.0,
                color[0], color[1], color[2], color[3],
                u, v
            ));
            if (geometryType == asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    //Bottom Face of the Box

    for (let i = 0; i <= depthSegmentsCount; ++i) {
        let z = i * segmentDepth - halfDepth;
        let v = 2.0 / 3.0 + (1.0 - i / depthSegmentsCount) / 3.0;
        for (let j = 0; j <= widthSegmentsCount; ++j) {
            let x = j * segmentWidth - halfWidth;
            let u = 0.25 + j / widthSegmentsCount * 0.25;
            vertices.push(asr.vertex(
                x, -halfDepth, z,
                0.0, -1.0, 0.0,
                color[0], color[1], color[2], color[3],
                u, v
            ));
            if (geometryType == asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    //Top Face of the Box

    for (let i = 0; i <= depthSegmentsCount; ++i) {
        let z = i * segmentDepth - halfDepth;
        let v = i / depthSegmentsCount / 3.0;
        for (let j = 0; j <= widthSegmentsCount; ++j) {
            let x = halfWidth - j * segmentWidth;
            let u = 0.25 + j / widthSegmentsCount * 0.25;
            vertices.push(asr.vertex(
                x, halfDepth, z,
                0.0, 1.0, 0.0,
                color[0], color[1], color[2], color[3],
                u, v
            ));
            if (geometryType == asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    if (geometryType === asr.geometryType().Lines || geometryType === asr.geometryType().Triangles) {
        let nextSide = (widthSegmentsCount + 1) * (heightSegmentsCount + 1);
        let side = 0;
        for (let i = 0; i <= depthSegmentsCount; ++i) {
            side = nextSide * i;
            for (let j = 0; j < heightSegmentsCount; ++j) {
                for (let k = 0; k < widthSegmentsCount; ++k) {
                    let indexA = side + j * (widthSegmentsCount + 1) + k;
                    let indexB = indexA + 1;
                    let indexC = indexA + (widthSegmentsCount + 1);
                    let indexD = indexC + 1;
                    if (geometryType === asr.geometryType().Lines) {
                        if (i % 2 === 0) {
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
                        if (i % 2 === 0) {
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
        vertices.flatMap(v => [v.x, v.y, v.z, v.nx, v.ny, v.nz, v.r, v.g, v.b, v.a, v.u, v.v])
    );
    const boxGeometryIndices = new Uint16Array(indices);

    return {
        boxVertices: boxGeometryVertices,
        boxIndices: boxGeometryIndices
    };
}

function main() {
    asr.initializeWebGL();
    const material = asr.createMaterial(vertexShaderSource, fragmentShaderSource);

    const width = 1.0, height = 1.0, depth = 1.0;
    const widthSegments = 5, heightSegments = 5, depthSegments = 5;
    const triangle =
        generateBoxGeometryData(
            asr.geometryType().Triangles, width, height, depth, widthSegments, heightSegments, depthSegments
        );
    const triangles = asr.createGeometry(asr.geometryType().Triangles, triangle.boxVertices, triangle.boxIndices);

    const edgeColor = vec4.fromValues(1.0, 0.7, 0.7, 1.0);
    const edge =
        generateBoxGeometryData(
            asr.geometryType().Lines, width * 1.005, height * 1.005, depth * 1.005, widthSegments, heightSegments, depthSegments, edgeColor
        );
    const lines = asr.createGeometry(asr.geometryType().Lines, edge.boxVertices, edge.boxIndices);

    const vertexColor = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
    const vertex =
        generateBoxGeometryData(
            asr.geometryType().Points, width * 1.01, height * 1.01, depth * 1.01, widthSegments, heightSegments, depthSegments, vertexColor
        );
    const points = asr.createGeometry(asr.geometryType().Points, vertex.boxVertices, vertex.boxIndices);

    const texture = asr.createTexture("cubemap_test");

    asr.prepareForRendering();
    asr.setMaterialCurrent(material);
    asr.setMaterialLineWidth(3);
    asr.setMaterialPointSize(10);
    asr.setMaterialFaceCullingEnabled(true);
    asr.setMaterialDepthTestEnabled(true);

    const CAMERA_SPEED = 1.0;
    const CAMERA_ROT_SPEED = 1.0;
    const CAMERA_FOV = 1.13;
    const CAMERA_NEAR_PLANE = 0.1;
    const CAMERA_FAR_PLANE = 200.0;

    let cameraPosition = vec3.fromValues(1.4, 0.8, 1.5);
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

    asr.setMatrix(asr.setMatrixMode(asr.matrixMode().Projection));
    asr.loadPerspectiveProjectionMatrix(CAMERA_FOV, CAMERA_NEAR_PLANE, CAMERA_FAR_PLANE);

    function render() {
        asr.prepareForRenderingFrame();

        asr.setMatrix(asr.setMatrixMode(asr.matrixMode().View));
        asr.loadIdentityMatrix();
        asr.translateMatrix(cameraPosition);
        asr.rotateMatrix(cameraRotation);

        asr.setTextureCurrent(texture);
        asr.setCurrentGeometry(triangles);
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
