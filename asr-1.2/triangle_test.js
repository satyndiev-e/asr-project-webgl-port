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
    precision highp float;

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

function generateTriangleGeometryData(
    geometryType,
    width, height,
    segmentsCount,
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

    const halfWidth = width * 0.5;
    const segmentWidth = width / segmentsCount;

    const halfHeight = height * 0.5;
    const segmentHeight = height / segmentsCount;

    for (let i = 0; i <= segmentsCount; ++i) {
        let y = i * segmentHeight - halfHeight;
        let v = 1.0 - i / segmentsCount;
        for (let j = 0; j <= segmentsCount - i; ++j) {
            let x = (j + 0.5 * i) * segmentWidth - halfWidth;
            let u = j / segmentsCount + 0.5 * i / segmentsCount
            vertices.push(asr.vertex(
                x, y, 0.0,
                color[0], color[1], color[2], color[3],
                u, v)
            );

            if (geometryType === asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    if (geometryType === asr.geometryType().Lines || geometryType === asr.geometryType().Triangles) {
        for (let i = 0, cursor = 0; i < segmentsCount; ++i) {
            for (let j = 0; j < segmentsCount - i; ++j, ++cursor) {
                let indexA = cursor;
                let indexB = indexA + 1;
                let indexC = indexA + (segmentsCount - i + 1);
                let indexD = (indexC + 1);

                if (geometryType == asr.geometryType().Lines) {
                    indices.push(
                        indexA, indexB, indexB, indexC, indexC, indexA
                    );
                    if (j < segmentsCount - i - 1) {
                        indices.push(
                            indexB, indexD, indexD, indexC, indexC, indexB
                        );
                    } else {
                        ++cursor;
                    }
                } else {
                    indices.push(indexA, indexC, indexB);
                    if (j < segmentsCount - i - 1) {
                        indices.push(indexB, indexC, indexD);
                    } else {
                        ++cursor;
                    }
                }
            }
        }
    }

    const triangleGeometryVertices = new Float32Array(
        vertices.flatMap(v => [v.x, v.y, v.z, v.r, v.g, v.b, v.a, v.u, v.v])
    );
    const triangleGeometryIndices = new Uint16Array(indices);

    return {
        triangleVertices: triangleGeometryVertices,
        triangleIndices: triangleGeometryIndices
    };
}

function main() {
    asr.initializeWebGL(500, 500);
    asr.createShader(vertexShaderSource, fragmentShaderSource);

    const width = 1.0, height = 1.0;
    const segments = 5;

    const triangle =
        generateTriangleGeometryData(
            asr.geometryType().Triangles, width, height, segments
        );
    const triangles = asr.createGeometry(asr.geometryType().Triangles, triangle.triangleVertices, triangle.triangleIndices);

    const edgeColor = vec4.fromValues(1.0, 0.7, 0.7, 1.0);
    const edge =
        generateTriangleGeometryData(
            asr.geometryType().Lines, width, height, segments, edgeColor
        );
    const lines = asr.createGeometry(asr.geometryType().Lines, edge.triangleVertices, edge.triangleIndices);

    const vertexColor = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
    const vertex =
        generateTriangleGeometryData(
            asr.geometryType().Points, width, height, segments, vertexColor
        );
    const points = asr.createGeometry(asr.geometryType().Points, vertex.triangleVertices, vertex.triangleIndices);

    asr.prepareForRendering();
    asr.setLineWidth(3);

    const texture = asr.createTexture("uv_test");

    function render() {
        asr.prepareForRenderingFrame();

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
