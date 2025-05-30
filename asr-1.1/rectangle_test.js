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

function generateRectangleGeometryData(
    geometryType,
    width, height,
    widthSegments,
    heightSegments,
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
    const segmentHeight = height / heightSegments;

    const halfWidth = width * 0.5;
    const segmentWidth = width / widthSegments;

    for (let i = 0; i <= heightSegments; ++i) {
        let y = i * segmentHeight - halfHeight;
        for (let j = 0; j <= widthSegments; ++j) {
            let x = j * segmentWidth - halfWidth;
            vertices.push(asr.vertex(
                x, y, 0.0,
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
                    indices.push(indexA, indexC, indexB);
                    indices.push(indexB, indexC, indexD);
                }
            }
        }
    }

    const rectangleGeometryVertices = new Float32Array(
        vertices.flatMap(v => [v.x, v.y, v.z, v.r, v.g, v.b, v.a])
    );
    const rectangleGeometryIndices = new Uint16Array(indices);

    return {
        rectangleVertices: rectangleGeometryVertices,
        rectangleIndices: rectangleGeometryIndices
    };
}

function main() {
    asr.initializeWebGL(500, 500); // Width, Height
    asr.createShader(vertexShaderSource, fragmentShaderSource);

    const width = 1.0, height = 1.0;
    const widthSegments = 5, heightSegments = 5;

    const triangle =
        generateRectangleGeometryData(
            asr.geometryType().Triangles, width, height, widthSegments, heightSegments
        );
    const triangles = asr.createGeometry(asr.geometryType().Triangles, triangle.rectangleVertices, triangle.rectangleIndices);

    const edgeColor = vec4.fromValues(1.0, 0.7, 0.7, 1.0);
    const edge =
        generateRectangleGeometryData(
            asr.geometryType().Lines, width, height, widthSegments, heightSegments, edgeColor
        );
    const lines = asr.createGeometry(asr.geometryType().Lines, edge.rectangleVertices, edge.rectangleIndices);

    const vertexColor = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
    const vertex =
        generateRectangleGeometryData(
            asr.geometryType().Points, width, height, widthSegments, heightSegments, vertexColor
        );
    const points = asr.createGeometry(asr.geometryType().Points, vertex.rectangleVertices, vertex.rectangleIndices);

    asr.prepareForRendering();
    asr.setLineWidth(3);

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
