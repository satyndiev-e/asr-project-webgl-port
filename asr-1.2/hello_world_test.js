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
    //         Position           Color (RGBA)        Texture Coordinates (UV)
    asr.vertex(0.5,    0.0,  0.0, 1.0, 0.0, 0.0, 1.0, 1.0,  0.5),
    asr.vertex(-0.25,  0.43, 0.0, 0.0, 1.0, 0.0, 1.0, 0.25, 0.07),
    asr.vertex(-0.25, -0.43, 0.0, 0.0, 0.0, 1.0, 1.0, 0.25, 0.93)
];

const triangleGeometryVertices = new Float32Array(
    vertices.flatMap(v => [v.x, v.y, v.z, v.r, v.g, v.b, v.a, v.u, v.v])
);

const triangleGeometryIndices = new Uint16Array([0, 1, 2]);

function main() {
    asr.initializeWebGL();
    asr.createShader(vertexShaderSource, fragmentShaderSource);
    const triangle = asr.createGeometry(asr.geometryType().Triangles, triangleGeometryVertices, triangleGeometryIndices);
    asr.prepareForRendering();
    asr.setCurrentGeometry(triangle);

    function render() {
        asr.prepareForRenderingFrame();
        asr.renderCurrentGeometry();

        asr.finishFrameRendering();
        requestAnimationFrame(render); 
    }
    render();
}

main();
