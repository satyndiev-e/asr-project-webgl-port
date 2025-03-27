"use strict";

const vertexShaderSource = `
    attribute vec4 position;
    attribute vec4 color;
    attribute vec4 textureCoordinates;

    attribute mat4 instanceTransform;
    attribute vec4 instanceColor;

    uniform bool textureEnabled;
    uniform mat4 textureTransformationMatrix;

    uniform float pointSize;

    uniform mat4 modelViewProjectionMatrix;

    varying vec4 fragmentColor;
    varying vec2 fragmentTextureCoordinates;

    void main() {
        fragmentColor = color * instanceColor;
        if(textureEnabled) {
            vec4 transformedTextureCoordinates = textureTransformationMatrix * vec4(textureCoordinates.st, 0.0, 1.0);
            fragmentTextureCoordinates = transformedTextureCoordinates.st;
        }

        gl_Position = modelViewProjectionMatrix * instanceTransform * position;
        gl_PointSize = pointSize;
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
        vec4 outputColor = vec4(0.0);

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
                outputColor = texelColor * fragmentColor;
            } else if (texturingMode == TEXTURING_MODE_DECALING) {
                outputColor.rgb = mix(outputColor.rgb, texelColor.rgb, texelColor.a);
            }
        }

        gl_FragColor = outputColor;
    }
`;

function generateRectangleGeometryData(
    geometryType,
    width, height,
    widthSegmentsCount,
    heightSegmentsCount,
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
    const segmentHeight = height / heightSegmentsCount;

    const halfWidth = width * 0.5;
    const segmentWidth = width / widthSegmentsCount;

    for (let i = 0; i <= heightSegmentsCount; ++i) {
        let y = i * segmentHeight - halfHeight;
        let v = 1.0 - i / heightSegmentsCount;
        for (let j = 0; j <= widthSegmentsCount; ++j) {
            let x = j * segmentWidth - halfWidth;
            let u = j / widthSegmentsCount;
            vertices.push(asr.vertex(
                x, y, 0.0,
                0.0, 0.0, 1.0,
                color[0], color[1], color[2], color[3],
                u, v
            ));

            if (geometryType === asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    if (geometryType === asr.geometryType().Lines || geometryType === asr.geometryType().Triangles) {
        for (let i = 0; i < heightSegmentsCount; ++i) {
            for (let j = 0; j < widthSegmentsCount; ++j) {
                let indexA = i * (widthSegmentsCount + 1) + j;
                let indexB = indexA + 1;
                let indexC = indexA + (widthSegmentsCount + 1);
                let indexD = indexC + 1;

                if (geometryType === asr.geometryType().Lines) {
                    indices.push(
                        indexA, indexB, indexB, indexC, indexC, indexA
                    );
                    indices.push(
                        indexB, indexD, indexD, indexC, indexC, indexB
                    );
                } else {
                    indices.push(indexA, indexB, indexC);
                    indices.push(indexB, indexD, indexC);
                }
            }
        }
    }

    const rectangleGeometryVertices = new Float32Array(
        vertices.flatMap(v => [v.x, v.y, v.z, v.nx, v.ny, v.nz, v.r, v.g, v.b, v.a, v.u, v.v])
    );
    const rectangleGeometryIndices = new Uint16Array(indices);

    return {
        rectangleVertices: rectangleGeometryVertices,
        rectangleIndices: rectangleGeometryIndices
    };
}

function main() {
    asr.initializeWebGL();

    const material = asr.createMaterial(vertexShaderSource, fragmentShaderSource);

    const width = 1.0, height = 1.0;
    const widthSegments = 5, heightSegments = 5;

    const triangle =
        generateRectangleGeometryData(
            asr.geometryType().Triangles, width, height, widthSegments, heightSegments
        );

    const ROWS = 20;
    const COLS = 20;
    const DEPTH = 20;
    const scale = 40.0;

    let instance = [];
    for (let i = 0; i < ROWS; ++i) {
        for (let j = 0; j < COLS; ++j) {
            for (let k = 0; k < DEPTH; ++k) {
                let y = i / ROWS;
                let x = j / COLS;
                let z = k / DEPTH;

                let translation = mat4.create();
                mat4.translate(translation, translation, vec3.fromValues(x * scale, y * scale, z * scale));

                for (let m = 0; m < 16; ++m) {
                    instance.push(translation[m]);
                }
                instance.push(1.0, 1.0, 1.0, 1.0);
            }
        }
    }

    const instances = new Float32Array(instance);

    const geometry = asr.createGeometry(asr.geometryType().Triangles, triangle.rectangleVertices, triangle.rectangleIndices, instances);

    const texture = asr.createTexture("uv_test");

    asr.prepareForRendering();

    asr.setMaterialCurrent(material);
    asr.setMaterialDepthTestEnabled(true);
    asr.setMaterialFaceCullingEnabled(false);
    asr.setMaterialLineWidth(3.0);
    asr.setMaterialPointSize(10.0);

    const CAMERA_SPEED = 6.0;
    const CAMERA_ROT_SPEED = 1.5;
    const CAMERA_FOV = 1.3;
    const CAMERA_NEAR_PLANE = 0.1;
    const CAMERA_FAR_PLANE = 10000;

    let cameraPosition = vec3.fromValues(-16.5, 52.5, -16.5);
    let cameraRotation = vec3.fromValues(-0.65, -2.36, 0.0);
    let dt = asr.getDeltaTime();

    const keys = asr.setKeysEventHandler();

    function updateCamera() {
        if (keys.isKeyPressed("w")) cameraRotation[0] += CAMERA_ROT_SPEED * dt;
        if (keys.isKeyPressed("a")) cameraRotation[1] += CAMERA_ROT_SPEED * dt;
        if (keys.isKeyPressed("s")) cameraRotation[0] -= CAMERA_ROT_SPEED * dt;
        if (keys.isKeyPressed("d")) cameraRotation[1] -= CAMERA_ROT_SPEED * dt;

        if (keys.isKeyPressed("ArrowUp")) {
            let move = vec3.fromValues(0.0, 0.0, 1.0);
            vec3.transformMat4(move, move, asr.getViewMatrix());
            vec3.scaleAndAdd(cameraPosition, cameraPosition, move, -CAMERA_SPEED * dt);
        }
        if (keys.isKeyPressed("ArrowDown")) {
            let move = vec3.fromValues(0.0, 0.0, 1.0);
            vec3.transformMat4(move, move, asr.getViewMatrix());
            vec3.scaleAndAdd(cameraPosition, cameraPosition, move, CAMERA_SPEED * dt);
        }

        requestAnimationFrame(updateCamera);
    }

    updateCamera();

    asr.setMatrix(asr.setMatrixMode(asr.matrixMode().Projection));
    asr.loadPerspectiveProjectionMatrix(CAMERA_FOV, CAMERA_NEAR_PLANE, CAMERA_FAR_PLANE);

    function render() {
        asr.prepareForRenderingFrame();

        asr.setMatrixMode(asr.matrixMode().View);
        asr.loadIdentityMatrix();
        asr.translateMatrix(cameraPosition);
        asr.rotateMatrix(cameraRotation);

        asr.setTextureCurrent(texture);
        asr.setCurrentGeometry(geometry);
        asr.renderCurrentGeometry();

        asr.finishFrameRendering();
        requestAnimationFrame(render);
    }

    render();
}

main();