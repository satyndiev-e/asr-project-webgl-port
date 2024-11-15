"use strict";

import * as asr from "./asr.js";

const vertexShaderSource = `
    attribute vec4 position;
    attribute vec4 color;

    varying vec4 fragmentColor;

    void main() {
        fragmentColor = color;

        gl_Position = position;
    }
`;

const fragmentShaderSource = `
    precision mediump float;

    varying vec4 fragmentColor;

    void main() {
        gl_FragColor = fragmentColor;
    }
`;

function generateCircleGeometryData (radius, segmentCount) {
    const array = [];

    let angle = 0.0;
    const angleDelta = 2.0 * Math.PI / segmentCount;

    for(let i = 0; i < segmentCount; ++i) {
        array.push(0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0);

        const x = Math.sin(angle) * radius;
        const y = Math.cos(angle) * radius;

        array.push(x, y, 0.0, 1.0, 1.0, 1.0, 1.0);
        angle -= angleDelta;

        const nextX = Math.sin(angle) * radius;
        const nextY = Math.cos(angle) * radius;

        array.push(nextX, nextY, 0.0, 1.0, 1.0, 1.0, 1.0);
    }
    const result = new Float32Array(array);
    return result;
}

function main() {
    asr.initializeWebGL();
    asr.createShader(vertexShaderSource, fragmentShaderSource);
    const circleGeometryData = generateCircleGeometryData(0.5, 50);
    asr.createGeometry(asr.getGeometryType().Triangles, circleGeometryData, circleGeometryData.length / 7.0);

    asr.prepareForRendering();
    asr.renderNextFrame();
}

main();
