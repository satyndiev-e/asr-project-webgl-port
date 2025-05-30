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

    uniform bool textureEnabled;
    uniform int texturingMode;
    uniform sampler2D textureSampler;

    varying vec4 fragmentColor;
    varying vec2 fragmentTextureCoordinates;

    void main() {
        gl_FragColor = fragmentColor;

       if (textureEnabled) {
            vec4 texelColor = texture2D(textureSampler, fragmentTextureCoordinates);
            gl_FragColor = vec4(texelColor.rgb, texelColor.a);
        }
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
                    indices.push(indexA, indexC, indexB);
                    indices.push(indexB, indexC, indexD);
                }
            }
        }
    }

    const rectangleGeometryVertices = new Float32Array(
        vertices.flatMap(v => [v.x, v.y, v.z, v.r, v.g, v.b, v.a, v.u, v.v])
    );
    const rectangleGeometryIndices = new Uint16Array(indices);

    return {
        rectangleVertices: rectangleGeometryVertices,
        rectangleIndices: rectangleGeometryIndices
    };
}

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
            color[0], color[1], color[2], color[3],
            nextU, nextV
        ));

        indices.push(vertices.length - 1);
        angle += angleDelta;
    }

    const circleGeometryVertices = new Float32Array(
        vertices.flatMap(v => [v.x, v.y, v.z, v.r, v.g, v.b, v.a, v.u, v.v])
    );
    const circleGeometryIndices = new Uint16Array(indices);

    return {
        circleVertices: circleGeometryVertices,
        circleIndices: circleGeometryIndices
    };
}

function generateSphereGeometryData(
    geometryType,
    radius,
    widthSegmentsCount,
    heightSegmentsCount,
    color = null
) {
    if (!color) color = vec4.fromValues(1.0, 0.1, 0.2, 1.0);

    if (geometryType !== asr.geometryType().Triangles &&
        geometryType !== asr.geometryType().Lines &&
        geometryType !== asr.geometryType().Points) {
        throw new Error("Geometry type is not correct.");
    }

    let vertices = [];
    let indices = [];

    for (let i = 0; i <= heightSegmentsCount; ++i) {
        let v = i / heightSegmentsCount;
        let phi = v * asr.PI;

        for (let j = 0; j <= widthSegmentsCount; ++j) {
            let u = j / widthSegmentsCount;
            let theta = u * asr.TWO_PI;

            let cosPhi = Math.cos(phi);
            let sinPhi = Math.sin(phi);
            let cosTheta = Math.cos(theta);
            let sinTheta = Math.sin(theta);

            let x = cosTheta * sinPhi;
            let y = cosPhi;
            let z = sinPhi * sinTheta;

            vertices.push(asr.vertex(
                x * radius, y * radius, z * radius,
                color[0], color[1], color[2], color[3],
                1.0 - u, v
            ));

            if (geometryType === asr.geometryType().Points) {
                indices.push(vertices.length - 1);
            }
        }
    }

    if (geometryType === asr.geometryType().Lines || geometryType === asr.geometryType().Triangles) {
        for (let rows = 0; rows < heightSegmentsCount; ++rows) {
            for (let columns = 0; columns < widthSegmentsCount; ++columns) {
                let indexA = rows * (widthSegmentsCount + 1) + columns;
                let indexB = indexA + 1;
                let indexC = indexA + (widthSegmentsCount + 1);
                let indexD = indexC + 1;
                if (geometryType === asr.geometryType().Lines) {
                    if (rows != 0) {
                        indices.push(
                            indexA, indexB, indexB, indexC, indexC, indexA
                        );
                    }
                    if (rows != heightSegmentsCount - 1) {
                        indices.push(
                            indexB, indexD, indexD, indexC, indexC, indexB
                        );
                    }

                } else {
                    if (rows != 0) {
                        indices.push(indexA, indexB, indexC);
                    }
                    if (rows != heightSegmentsCount - 1) {
                        indices.push(indexB, indexD, indexC);
                    }
                }
            }
        }
    }
    const sphereGeometryVertices = new Float32Array(
        vertices.flatMap(v => [v.x, v.y, v.z, v.r, v.g, v.b, v.a, v.u, v.v])
    );
    const sphereGeometryIndices = new Uint16Array(indices);

    return {
        sphereVertices: sphereGeometryVertices,
        sphereIndices: sphereGeometryIndices
    };
}

function main() {
    asr.initializeWebGL(500, 500); // Width, Height
    asr.createShader(vertexShaderSource, fragmentShaderSource);

    const radius = 0.5;
    const segments = 20;
    const width = 1.0, height = 1.0;
    const widthSegments = 20, heightSegments = 20;

    const triangle =
        generateRectangleGeometryData(
            asr.geometryType().Triangles, width, height, widthSegments, heightSegments
        );
    const triangles = asr.createGeometry(asr.geometryType().Triangles, triangle.rectangleVertices, triangle.rectangleIndices);

    const color = vec3.fromValues(1.0, 0.7, 0.7, 1.0);
    const hourRecTriangle =
        generateRectangleGeometryData(
            asr.geometryType().Triangles, width, height, widthSegments, heightSegments, color
        );
    const hourRecTriangles = asr.createGeometry(asr.geometryType().Triangles, hourRecTriangle.rectangleVertices, hourRecTriangle.rectangleIndices);

    const sphereTriangle =
        generateSphereGeometryData(
            asr.geometryType().Triangles, radius, widthSegments, heightSegments
        );
    const sphereTriangles = asr.createGeometry(asr.geometryType().Triangles, sphereTriangle.sphereVertices, sphereTriangle.sphereIndices);

    const circleTriangle =
        generateCircleGeometryData(
            asr.geometryType().Triangles, radius, segments
        );
    const CircleTriangles = asr.createGeometry(asr.geometryType().Triangles, circleTriangle.circleVertices, circleTriangle.circleIndices);

    asr.prepareForRendering();
    asr.enableDepthTest();
    asr.setLineWidth(3);

    const CAMERA_SPEED = 1.0;
    const CAMERA_ROT_SPEED = 1.0;
    const CAMERA_FOV = 1.3;
    const CAMERA_NEAR_PLANE = 0.1;
    const CAMERA_FAR_PLANE = 200;

    let cameraPosition = vec3.fromValues(0.0, 0.0, 3.0);
    let cameraRotation = vec3.fromValues(0.0, 0.0, 0.0);
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

    asr.setMatrixMode(asr.matrixMode().Projection);
    asr.loadPerspectiveProjectionMatrix(CAMERA_FOV, CAMERA_NEAR_PLANE, CAMERA_FAR_PLANE);

    //Sphere data

    let baseAngle = 0.0;
    const sphereScale = 0.1;
    const quarterRecScale = 0.15;

    //Hour data

    const hourScaleX = 0.75;
    const hourScaleY = 0.03;
    const hourRecScale = 0.05;
    const hourRecAngle = asr.TWO_PI / 8.0;

    //Minute data

    const minutes = 60;
    const minuteScaleX = 0.85;
    const minuteScaleY = 0.02;
    const minuteCircleScale = 0.03;
    const minutesAngleDelta = asr.TWO_PI / minutes;

    //Second data

    const secondScaleX = 0.5;
    const secondScaleY = 0.015;

    //Rotation data

    let clockRotation = 0.0;
    const clockRotationDelta = 0.01;

    function render() {
        asr.prepareForRenderingFrame();

        asr.setMatrixMode(asr.matrixMode().View);
        asr.loadIdentityMatrix();
        asr.rotateMatrix(vec3.fromValues(0.0, clockRotation, 0.0));
        clockRotation += clockRotationDelta;
        asr.translateMatrix(cameraPosition);
        asr.rotateMatrix(cameraRotation);


        asr.setMatrixMode(asr.matrixMode().Model);

        //Sphere center

        asr.loadIdentityMatrix();
        asr.scaleMatrix(vec3.fromValues(sphereScale, sphereScale, sphereScale));
        asr.setCurrentGeometry(sphereTriangles);
        asr.renderCurrentGeometry();

        //Outer layer

        for (let circle = 0; circle < minutes; circle++) {
            if (circle != 0) {
                baseAngle += minutesAngleDelta;
            }

            //Circle minute

            asr.loadIdentityMatrix();
            asr.pushMatrix();
            const circleSphereDistanceX = Math.cos(baseAngle) * 1.2;
            const circleSphereDistanceY = Math.sin(baseAngle) * 1.2;
            asr.translateMatrix(vec3.fromValues(circleSphereDistanceX, circleSphereDistanceY, 0.0));
            asr.scaleMatrix(vec3.fromValues(minuteCircleScale, minuteCircleScale, minuteCircleScale));
            asr.setCurrentGeometry(CircleTriangles);
            asr.renderCurrentGeometry();
            asr.popMatrix();

            //Rectangle hour

            if (circle % 5 === 0) {
                asr.loadIdentityMatrix();
                asr.pushMatrix();
                const hourRecSphereDistanceX = Math.cos(baseAngle) * 1.2;
                const hourRecSphereDistanceY = Math.sin(baseAngle) * 1.2;
                asr.translateMatrix(vec3.fromValues(hourRecSphereDistanceX, hourRecSphereDistanceY, 0.1));
                asr.rotateMatrix(vec3.fromValues(0.0, 0.0, hourRecAngle));
                asr.scaleMatrix(vec3.fromValues(hourRecScale, hourRecScale, hourRecScale));
                asr.setCurrentGeometry(hourRecTriangles);
                asr.renderCurrentGeometry();
                asr.popMatrix();
            }

            //Rectangle quarter

            if (circle % 15 === 0) {
                asr.loadIdentityMatrix();
                asr.pushMatrix();
                const quarterRecSphereDistanceX = Math.cos(baseAngle) * 1.2;
                const quarterRecSphereDistanceY = Math.sin(baseAngle) * 1.2;
                asr.translateMatrix(vec3.fromValues(quarterRecSphereDistanceX, quarterRecSphereDistanceY, 0.1));
                asr.rotateMatrix(vec3.fromValues(0.0, 0.0, hourRecAngle));
                asr.scaleMatrix(vec3.fromValues(quarterRecScale, quarterRecScale, quarterRecScale));
                asr.setCurrentGeometry(triangles);
                asr.renderCurrentGeometry();
                asr.popMatrix();
            }
        }
        baseAngle = 0.0;

        let currentTime = new Date();
        let hour = currentTime.getHours();
        let minute = currentTime.getMinutes();
        let second = currentTime.getSeconds();

        //Hour


        asr.loadIdentityMatrix();
        asr.pushMatrix();
        asr.rotateMatrix(vec3.fromValues(0.0, 0.0, asr.TWO_PI / 4.0));
        asr.rotateMatrix(vec3.fromValues(0.0, 0.0, -(hour / 12.0 * asr.TWO_PI)));
        asr.translateMatrix(vec3.fromValues(hourScaleX / 2.0, 0.0, 0.0));
        asr.scaleMatrix(vec3.fromValues(hourScaleX, hourScaleY, 0.0));
        asr.setCurrentGeometry(triangles);
        asr.renderCurrentGeometry();
        asr.popMatrix();

        //Minute 

        asr.loadIdentityMatrix();
        asr.pushMatrix();
        asr.rotateMatrix(vec3.fromValues(0.0, 0.0, asr.TWO_PI / 4.0));
        asr.rotateMatrix(vec3.fromValues(0.0, 0.0, -(asr.TWO_PI * minute / 60)));
        asr.translateMatrix(vec3.fromValues(minuteScaleX / 2.0, 0.0, 0.0));
        asr.scaleMatrix(vec3.fromValues(minuteScaleX, minuteScaleY, 0.0));
        asr.setCurrentGeometry(triangles);
        asr.renderCurrentGeometry();
        asr.popMatrix();

        //Second

        asr.loadIdentityMatrix();
        asr.pushMatrix();
        asr.rotateMatrix(vec3.fromValues(0.0, 0.0, asr.TWO_PI / 4.0));
        asr.rotateMatrix(vec3.fromValues(0.0, 0.0, -(asr.TWO_PI * second / 60)));
        asr.translateMatrix(vec3.fromValues(secondScaleX / 2.0, 0.0, 0.0));
        asr.scaleMatrix(vec3.fromValues(secondScaleX, secondScaleY, 0.0));
        asr.setCurrentGeometry(triangles);
        asr.renderCurrentGeometry();
        asr.popMatrix();

        asr.finishFrameRendering();
        requestAnimationFrame(render);
    }

    render();
}

main();