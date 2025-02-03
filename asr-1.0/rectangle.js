"use strict";

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

function generateRectangleGeometryData (width, height, widthSegmentsCount, heightSegmentsCount) {
    const array = [];

    const halfWidth = width / 2.0;
    const halfHeight = height / 2.0;

    const segmentsWidth = width / widthSegmentsCount;
    const segmentsHeight = height / heightSegmentsCount;

    const nextPoint = 1.0;

    for(let i = 0; i < widthSegmentsCount; ++i) {
        for(let j = 0; j < heightSegmentsCount; ++j) {
            let x1 = (j * segmentsWidth) - halfWidth;
            let y1 = (i * segmentsHeight) - halfHeight;
            let x2 = ((j + nextPoint) * segmentsWidth) - halfWidth;
            let y2 = ((i + nextPoint) * segmentsHeight) - halfHeight;

            array.push(x1, y1, 0.0, 1.0, 1.0, 1.0, 1.0);
            array.push(x2, y1, 0.0, 1.0, 1.0, 1.0, 1.0);
            array.push(x2, y2, 0.0, 1.0, 1.0, 1.0, 1.0);
            array.push(x1, y1, 0.0, 1.0, 1.0, 1.0, 1.0);
            array.push(x2, y2, 0.0, 1.0, 1.0, 1.0, 1.0);
            array.push(x1, y2, 0.0, 1.0, 1.0, 1.0, 1.0);
        }
    }
    const result = new Float32Array(array);
    return result;
}

function main() {
    asr.initializeWebGL();
    asr.createShader(vertexShaderSource, fragmentShaderSource);
    const rectangleGeometryData = generateRectangleGeometryData(1.0, 1.0, 5, 5);
    asr.createGeometry(asr.getGeometryType().Triangles, rectangleGeometryData, rectangleGeometryData.length / 7);

    asr.prepareForRendering();
    
    function render() {
        asr.renderNextFrame();
        requestAnimationFrame(render);
    }

    render();
}

main();
