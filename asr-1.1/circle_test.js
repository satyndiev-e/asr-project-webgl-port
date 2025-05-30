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

function generateCircleGeometryData(
    geometryType,
    radius,
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

    vertices.push(asr.vertex(
        0.0, 0.0, 0.0,
        color[0], color[1], color[2], color[3])
    );

    if (geometryType === asr.geometryType().Points) indices.push(0);

    let angle = 0.0;
    const angleDelta = asr.TWO_PI / segments;

    let x = Math.cos(angle) * radius;
    let y = Math.sin(angle) * radius;

    vertices.push(asr.vertex(
        x, y, 0.0,
        color[0], color[1], color[2], color[3])
    );

    if (geometryType === asr.geometryType().Points) indices.push(1);

    for (let i = 0; i < segments; ++i) {
        if (geometryType === asr.geometryType().Triangles || geometryType === asr.geometryType().Lines) {
            indices.push(0);
            indices.push(vertices.length - 1);
            if (geometryType === asr.geometryType().Lines) {
                indices.push(vertices.length - 1);
            }
        }

        let next_x = Math.cos(angle + angleDelta) * radius;
        let next_y = Math.sin(angle + angleDelta) * radius;
        vertices.push(asr.vertex(
            next_x, next_y, 0.0,
            color[0], color[1], color[2], color[3])
        );

        indices.push(vertices.length - 1);
        angle += angleDelta;
    }

    const circleGeometryVertices = new Float32Array(
        vertices.flatMap(v => [v.x, v.y, v.z, v.r, v.g, v.b, v.a])
    );
    const circleGeometryIndices = new Uint16Array(indices);

    return {
        circleVertices: circleGeometryVertices,
        circleIndices: circleGeometryIndices
    };
}

function main() {
    asr.initializeWebGL(500, 500); // Width, Height
    asr.createShader(vertexShaderSource, fragmentShaderSource);

    const radius = 0.5
    const segments = 10;

    const triangle =
        generateCircleGeometryData(
            asr.geometryType().Triangles, radius, segments
        );
    const triangles = asr.createGeometry(asr.geometryType().Triangles, triangle.circleVertices, triangle.circleIndices);

    const edgeColor = vec4.fromValues(1.0, 0.7, 0.7, 1.0);
    const edge =
        generateCircleGeometryData(
            asr.geometryType().Lines, radius, segments, edgeColor
        );
    const lines = asr.createGeometry(asr.geometryType().Lines, edge.circleVertices, edge.circleIndices);

    const vertexColor = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
    const vertex =
        generateCircleGeometryData(
            asr.geometryType().Points, radius, segments, vertexColor
        );
    const points = asr.createGeometry(asr.geometryType().Points, vertex.circleVertices, vertex.circleIndices);

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
