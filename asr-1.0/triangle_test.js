"use strict";

import * as asr from "./asr.js";

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

const triangleGeometryData = new Float32Array([
    //  Position       Color (RGBA)
     0.5, -0.305, 0.0, 0.0, 0.0, 1.0, 1.0,
     0.0,  0.565, 0.0, 0.0, 1.0, 0.0, 1.0,
    -0.5, -0.305, 0.0, 1.0, 0.0, 0.0, 1.0
]);

const triangleGeometryVertexCount = 3;

function main() {
    asr.initializeWebGL();
    asr.createShader(vertexShaderSource, fragmentShaderSource);
    asr.createGeometry(asr.getGeometryType().Triangles, triangleGeometryData, triangleGeometryVertexCount);

    asr.prepareForRendering();
    asr.renderNextFrame();

}

main();
