"use strict";

const vertexShaderSource = `
    attribute vec4 position;
    attribute vec4 color;

    uniform float time;

    varying vec4 fragmentColor;

    void main() {
        fragmentColor = color;

        vec4 rotatedPosition = position;
        rotatedPosition.x = position.x * cos(time) - position.y * sin(time);
        rotatedPosition.y = position.x * sin(time) + position.y * cos(time);

        gl_Position = rotatedPosition;
    }
`;

const fragmentShaderSource = `
    precision mediump float;

    varying vec4 fragmentColor;

    void main() {
        gl_FragColor = fragmentColor;
    }
`;

const vertices = [
    asr.vertex(0.5, -0.305, 0.0, 1.0, 0.0, 0.0, 1.0),
    asr.vertex(0.0,  0.565, 0.0, 0.0, 1.0, 0.0, 1.0),
    asr.vertex(-0.5, -0.305, 0.0, 0.0, 0.0, 1.0, 1.0)
];

const triangleGeometryVertices = new Float32Array(
    vertices.flatMap(v => [v.x, v.y, v.z, v.r, v.g, v.b, v.a])
);

const triangleGeometryIndices = new Uint16Array([0, 1, 2]);

function main() {
    asr.initializeWebGL(500, 500); // Width, Height
    asr.createShader(vertexShaderSource, fragmentShaderSource);
    const triangle = asr.createGeometry(asr.geometryType().Triangles, triangleGeometryVertices, triangleGeometryIndices);
    asr.prepareForRendering();

    function render() {
        asr.prepareForRenderingFrame();

        asr.setCurrentGeometry(triangle);
        asr.renderCurrentGeometry();
        requestAnimationFrame(render);
    }
    
    render();
}

main();
