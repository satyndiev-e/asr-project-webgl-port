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
    precision mediump float;

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

            outputColor = vec4(texelColor.rgb, texelColor.a);
        }

        gl_FragColor = outputColor;
    }
`;

function generateCircleGeometryData(
    geometryType,
    radius, segmentCount,
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
        0.0, 0.0, 1.0,
        color[0], color[1], color[2], color[3],
        0.5, 0.5
    ));

    if (geometryType === asr.geometryType().Points) {
        indices.push(0);
    }

    let angle = 0.0;
    const angleDelta = asr.TWO_PI / segmentCount;

    let x = Math.cos(angle) * radius;
    let y = Math.sin(angle) * radius;
    let u = 0.5 + Math.cos(angle) * 0.5;
    let v = 1.0 - (0.5 + Math.sin(angle) * 0.5);

    vertices.push(asr.vertex(
        x, y, 0.0,
        0.0, 0.0, 1.0,
        color[0], color[1], color[2], color[3],
        u, v
    ));

    if (geometryType === asr.geometryType().Points) {
        indices.push(1);
    }

    for (let i = 0; i < segmentCount; ++i) {
        if (geometryType === asr.geometryType().Triangles || geometryType === asr.geometryType().Lines) {
            indices.push(0);
            indices.push(vertices.length - 1);
            if (geometryType === asr.geometryType().Lines) {
                indices.push(vertices.length - 1);
            }
        }

        let nextX = Math.cos(angle + angleDelta) * radius;
        let nextY = Math.sin(angle + angleDelta) * radius;
        let nextU = 0.5 + Math.cos(angle + angleDelta) * 0.5;
        let nextV = 1.0 - (0.5 + Math.sin(angle + angleDelta) * 0.5);
        vertices.push(asr.vertex(
            nextX, nextY, 0.0,
            0.0, 0.0, 1.0,
            color[0], color[1], color[2], color[3],
            nextU, nextV
        ));

        indices.push(vertices.length - 1);
        angle += angleDelta;
    }

    const circleGeometryVertices = new Float32Array(
        vertices.flatMap(v => [v.x, v.y, v.z, v.nx, v.ny, v.nz, v.r, v.g, v.b, v.a, v.u, v.v])
    );
    const circleGeometryIndices = new Uint16Array(indices);

    return {
        circleVertices: circleGeometryVertices,
        circleIndices: circleGeometryIndices
    };
}


function main() {
    asr.initializeWebGL();
    const material = asr.createMaterial(vertexShaderSource, fragmentShaderSource);

    const radius = 0.5;
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

    const texture = asr.createTexture("uv_test");

    asr.prepareForRendering();

    asr.setMaterialCurrent(material);
    asr.setMaterialLineWidth(3.0);
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
