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
                0.0, 0.0, 1.0,
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
                    indices.push(indexA, indexB, indexC);
                    if (j < segmentsCount - i - 1) {
                        indices.push(indexB, indexD, indexC);
                    } else {
                        ++cursor;
                    }
                }
            }
        }
    }

    const triangleGeometryVertices = new Float32Array(
        vertices.flatMap(v => [v.x, v.y, v.z, v.nx, v.ny, v.nz, v.r, v.g, v.b, v.a, v.u, v.v])
    );
    const triangleGeometryIndices = new Uint16Array(indices);

    return {
        triangleVertices: triangleGeometryVertices,
        triangleIndices: triangleGeometryIndices
    };
}

function main() {
    asr.initializeWebGL();

    const material = asr.createMaterial(vertexShaderSource, fragmentShaderSource);

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

    const texture = asr.createTexture("uv_test");

    asr.prepareForRendering();

    asr.setMaterialCurrent(material);
    asr.setMaterialLineWidth(2.0);
    asr.setMaterialPointSize(10.0);

    function render() {
        asr.prepareForRenderingFrame();

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
