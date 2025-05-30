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

function generateTriangleGeometryData(
    geometryType,
    width,
    height,
    segments,
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
    const halfHeight = height * 0.5;
    const segmentLength = width / segments;

    for (let i = 0; i <= segments; ++i) {
        let y = i * segmentLength - halfHeight;
        let shift = i * segmentLength * 0.5;
        for (let j = 0; j <= segments - i; ++j) {
            let x = j * segmentLength - (halfWidth - shift);
            vertices.push(asr.vertex(
                x, y, 0.0,
                color[0], color[1], color[2], color[3])
            );

            if (geometryType === asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    if (geometryType === asr.geometryType().Lines || geometryType === asr.geometryType().Triangles) {
        let temp = 0;
        let shift = 0;
        for (let i = 0; i < segments; ++i) {
            shift += temp;
            for (let j = 0; j < segments - i; ++j) {
                let indexA = (i * (segments + 1) + j) - shift;
                let indexB = indexA + 1;
                let indexC = (indexA + (segments + 1)) - i;
                let indexD = indexC + 1;

                let last = (segments - i) - 1;
                if (geometryType === asr.geometryType().Lines) {
                    indices.push(
                        indexA, indexB, indexB, indexC, indexC, indexA
                    );
                    if (j != last) {
                        indices.push(
                            indexB, indexD, indexD, indexC, indexC, indexB
                        );
                    }
                } else {
                    indices.push(indexA, indexB, indexC);
                    if (j != last) {
                        indices.push(indexB, indexC, indexD);
                    }
                }
            }
            temp = i;
        }
    }

    const triangleGeometryVertices = new Float32Array(
        vertices.flatMap(v => [v.x, v.y, v.z, v.r, v.g, v.b, v.a])
    );
    const triangleGeometryIndices = new Uint16Array(indices);

    return {
        triangleVertices: triangleGeometryVertices,
        triangleIndices: triangleGeometryIndices
    };
}


function main() {
    asr.initializeWebGL(500, 500); // Width, Height
    asr.createShader(vertexShaderSource, fragmentShaderSource);

    asr.prepareForRendering();
    asr.setLineWidth(3);

    const width = 1.0, height = 1.0;
    const segments = 5;

    const triangle =
        generateTriangleGeometryData(
            asr.geometryType().Triangles, width, height, segments
        );
    const triangles = createGeometry(asr.geometryType().Triangles, triangle.triangleVertices, triangle.triangleIndices);


    const edgeColor = vec4.fromValues(1.0, 0.7, 0.7, 1.0);
    const edge =
        generateTriangleGeometryData(
            asr.geometryType().Lines, width, height, segments, edgeColor
        );
    const lines = createGeometry(asr.geometryType().Lines, edge.triangleVertices, edge.triangleIndices);

    const vertexColor = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
    const vertex =
        generateTriangleGeometryData(
            asr.geometryType().Points, width, height, segments, vertexColor
        );
    const points = createGeometry(asr.geometryType().Points, vertex.triangleVertices, vertex.triangleIndices);

    function render() {
        asr.prepareForRenderingFrame();

        asr.setCurrentGeometry(triangles);
        asr.renderCurrentGeometry();

        asr.setCurrentGeometry(lines);
        asr.renderCurrentGeometry();

        asr.setCurrentGeometry(points);
        asr.renderCurrentGeometry();

        requestAnimationFrame(render);
    }

    render();
}

main();