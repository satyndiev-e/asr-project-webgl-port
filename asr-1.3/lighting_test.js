"use strict";

const vertexShaderSource = `
    attribute vec4 position;
    attribute vec3 normal;
    attribute vec4 color;
    attribute vec4 textureCoordinates;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat3 normalMatrix;

    uniform float pointSize;

    uniform bool textureEnabled;
    uniform mat4 textureTransformationMatrix;

    varying vec4 fragmentViewPosition;
    varying vec3 fragmentViewDirection;
    varying vec4 fragmentColor;
    varying vec2 fragmentTextureCoordinates;
    varying vec3 fragmentViewNormal;

    void main() {
        vec4 viewPosition = modelViewMatrix * position;
        fragmentViewPosition = viewPosition;
        fragmentViewDirection = -viewPosition.xyz;
        fragmentViewNormal = normalize(normalMatrix * normal);

        fragmentColor = color;
        if(textureEnabled) {
            vec4 transformedTextureCoordinates = textureTransformationMatrix * vec4(textureCoordinates.st, 0.0, 1.0);
            fragmentTextureCoordinates = transformedTextureCoordinates.st;
        }

        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = pointSize;
    }
`;

const fragmentShaderSource = `
    precision highp float;

    const int TEXTURING_MODE_ADDITION = 0;
    const int TEXTURING_MODE_SUBTRACTION = 1;
    const int TEXTURING_MODE_REVERSE_SUBTRACTION = 2;
    const int TEXTURING_MODE_MODULATION = 3;
    const int TEXTURING_MODE_DECALING = 4;

    uniform vec3 materialAmbientColor;
    uniform vec4 materialDiffuseColor;
    uniform vec4 materialEmissionColor;
    uniform vec3 materialSpecularColor;
    uniform float materialSpecularExponent;

    uniform bool pointLightEnabled;
    uniform bool pointLightTwoSided;
    uniform vec3 pointLightViewPosition;
    uniform vec3 pointLightAmbientColor;
    uniform vec3 pointLightDiffuseColor;
    uniform vec3 pointLightSpecularColor;
    uniform float pointLightIntensity;
    uniform float pointLightConstantAttenuation;
    uniform float pointLightLinearAttenuation;
    uniform float pointLightQuadraticAttenuation;

    uniform bool pointLight2Enabled;
    uniform bool pointLight2TwoSided;
    uniform vec3 pointLight2ViewPosition;
    uniform vec3 pointLight2AmbientColor;
    uniform vec3 pointLight2DiffuseColor;
    uniform vec3 pointLight2SpecularColor;
    uniform float pointLight2Intensity;
    uniform float pointLight2ConstantAttenuation;
    uniform float pointLight2LinearAttenuation;
    uniform float pointLight2QuadraticAttenuation;

    uniform bool textureEnabled;
    uniform int texturingMode;
    uniform sampler2D textureSampler;

    varying vec4 fragmentViewPosition;
    varying vec3 fragmentViewDirection;
    varying vec3 fragmentViewNormal;
    varying vec4 fragmentColor;
    varying vec2 fragmentTextureCoordinates;

    void main() {
        vec3 viewDirection = normalize(fragmentViewDirection);
        vec3 viewNormal = normalize(fragmentViewNormal);

        vec4 frontColor = materialEmissionColor;
        frontColor.rgb += materialAmbientColor;
        frontColor.a += materialDiffuseColor.a;

        vec4 backColor = frontColor;

        if (pointLightEnabled) {
            vec3 pointLightVector = pointLightViewPosition - fragmentViewPosition.xyz;

            float pointLightVectorLength = length(pointLightVector);
            pointLightVector /= pointLightVectorLength;

            float pointLightVectorLengthSquared = pointLightVectorLength * pointLightVectorLength;

            float attenuationFactor = 1.0 / (pointLightConstantAttenuation +
                                            pointLightLinearAttenuation * pointLightVectorLength +
                                            pointLightQuadraticAttenuation * pointLightVectorLengthSquared);
            attenuationFactor *= pointLightIntensity;

            float nDotL = max(dot(viewNormal, pointLightVector), 0.0);
            vec3 diffuseColor = materialDiffuseColor.rgb * pointLightDiffuseColor;
            vec3 diffuseTerm = nDotL * diffuseColor;

            vec3 reflectionVector = reflect(-pointLightVector, viewNormal);
            float nDotH = clamp(dot(viewDirection, reflectionVector), 0.0, 1.0);
            vec3 specularColor = materialSpecularColor * pointLightSpecularColor;
            vec3 specularTerm = pow(nDotH, materialSpecularExponent) * specularColor;

            frontColor.rgb += attenuationFactor * (pointLightAmbientColor + diffuseTerm + specularTerm);

            if (pointLightTwoSided) {
                vec3 invertedViewNormal = -viewNormal;

                nDotL = max(dot(invertedViewNormal, pointLightVector), 0.0);
                diffuseTerm = nDotL * diffuseColor;

                reflectionVector = reflect(-pointLightVector, invertedViewNormal);
                nDotH = clamp(dot(viewDirection, reflectionVector), 0.0, 1.0);
                specularTerm = pow(nDotH, materialSpecularExponent) * specularColor;

                backColor.rgb += attenuationFactor * (pointLightAmbientColor + diffuseTerm + specularTerm);
            }
        }

        if (pointLight2Enabled) {
            vec3 pointLightVector = pointLight2ViewPosition - fragmentViewPosition.xyz;

            float pointLightVectorLength = length(pointLightVector);
            pointLightVector /= pointLightVectorLength;

            float pointLightVectorLengthSquared = pointLightVectorLength * pointLightVectorLength;
            float attenuationFactor = 1.0 / (pointLight2ConstantAttenuation +
                                            pointLight2LinearAttenuation * pointLightVectorLength +
                                            pointLight2QuadraticAttenuation * pointLightVectorLengthSquared);
            attenuationFactor *= pointLight2Intensity;

            float nDotL = max(dot(viewNormal, pointLightVector), 0.0);
            vec3 diffuseColor = materialDiffuseColor.rgb * pointLight2DiffuseColor;
            vec3 diffuseTerm = nDotL * diffuseColor;

            vec3 reflectionVector = reflect(-pointLightVector, viewNormal);
            float nDotH = clamp(dot(viewDirection, reflectionVector), 0.0, 1.0);
            vec3 specularColor = materialSpecularColor * pointLight2SpecularColor;
            vec3 specularTerm = pow(nDotH, materialSpecularExponent) * specularColor;

            frontColor.rgb += attenuationFactor * (pointLight2AmbientColor + diffuseTerm + specularTerm);

            if (pointLight2TwoSided) {
                vec3 invertedViewNormal = -viewNormal;
                nDotL = max(dot(invertedViewNormal, pointLightVector), 0.0);
                diffuseTerm = nDotL * diffuseColor;

                reflectionVector = reflect(-pointLightVector, invertedViewNormal);
                nDotH = clamp(dot(viewDirection, reflectionVector), 0.0, 1.0);
                specularTerm = pow(nDotH, materialSpecularExponent) * specularColor;

                backColor.rgb += attenuationFactor * (pointLight2AmbientColor + diffuseTerm + specularTerm);
            }
        }

        gl_FragColor = fragmentColor;
        if (gl_FrontFacing) {
            gl_FragColor *= frontColor;
        } else {
            gl_FragColor *= backColor;
        }

        if (textureEnabled) {
            vec4 texelColor = texture2D(textureSampler, fragmentTextureCoordinates);
            if (texturingMode == TEXTURING_MODE_ADDITION) {
                gl_FragColor.rgb += texelColor.rgb;
                gl_FragColor.a = min(gl_FragColor.a + texelColor.a, 1.0);
            } else if (texturingMode == TEXTURING_MODE_SUBTRACTION) {
                gl_FragColor.rgb = max(gl_FragColor.rgb - texelColor.rgb, 0.0);
            } else if (texturingMode == TEXTURING_MODE_REVERSE_SUBTRACTION) {
                gl_FragColor.rgb = max(texelColor.rgb - gl_FragColor.rgb, 0.0);
            } else if (texturingMode == TEXTURING_MODE_MODULATION) {
                gl_FragColor *= texelColor;
            } else if (texturingMode == TEXTURING_MODE_DECALING) {
                gl_FragColor.rgb = mix(gl_FragColor.rgb, texelColor.rgb, texelColor.a);
            }
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

function generateSphereGeometryData(
    geometryType,
    radius,
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
                x, y, z,
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
        vertices.flatMap(v => [v.x, v.y, v.z, v.nx, v.ny, v.nz, v.r, v.g, v.b, v.a, v.u, v.v])
    );
    const sphereGeometryIndices = new Uint16Array(indices);

    return {
        sphereVertices: sphereGeometryVertices,
        sphereIndices: sphereGeometryIndices
    };
}

function main() {
    asr.initializeWebGL();

    // Material

    const materialAmbientColor = vec3.fromValues(0.0, 0.0, 0.0);
    const materialDiffuseColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
    const materialEmissionColor = vec4.fromValues(0.0, 0.0, 0.0, 0.0);
    const materialSpecularColor = vec3.fromValues(1.0, 1.0, 1.0);
    const materialSpecularExponent = 30.0;

    // First Light Data
    
    const pointLight1Enabled = true;
    const pointLight1Height = 1.0;
    const pointLight1AmbientColor = vec3.fromValues(0.1, 0.1, 0.1);
    const pointLight1DiffuseColor = vec3.fromValues(1.0, 1.0, 1.0);
    const pointLight1SpecularColor = vec3.fromValues(1.0, 1.0, 1.0);
    const pointLight1Intensity = 2.0;
    const pointLight1TwoSided = false;
    const pointLight1ConstantAttenuation = 3.0;
    const pointLight1LinearAttenuation = 0.0;
    const pointLight1QuadraticAttenuation = 0.0;
    let pointLight1OrbitAngle = 0.0;
    const pointLight1OrbitDeltaAngle = 0.01;
    const pointLight1OrbitRadius = 1.0;

    // Second Light Data

    const pointLight2Enabled = true;
    const pointLight2Height = 1.0;
    const pointLight2AmbientColor = vec3.fromValues(0.1, 0.1, 0.1);
    const pointLight2DiffuseColor = vec3.fromValues(1.0, 1.0, 1.0);
    const pointLight2SpecularColor = vec3.fromValues(1.0, 1.0, 1.0);
    const pointLight2Intensity = 1.5;
    const pointLight2TwoSided = false;
    const pointLight2ConstantAttenuation = 3.0;
    const pointLight2LinearAttenuation = 0.0;
    const pointLight2QuadraticAttenuation = 0.0;
    let pointLight2OrbitAngle = 0.0;
    const pointLight2OrbitDeltaAngle = -0.01;
    const pointLight2OrbitRadius = 1.0;

    const material = asr.createMaterial(vertexShaderSource, fragmentShaderSource);

    // Plane Geometry

    const plane =
        generateRectangleGeometryData(
            asr.geometryType().Triangles, 500, 500, 1, 1
        );
    const planeGeometry = asr.createGeometry(asr.geometryType().Triangles, plane.rectangleVertices, plane.rectangleIndices);

    // Sphere Geometry
    
    const sphere = 
        generateSphereGeometryData(
            asr.geometryType().Triangles, 0.025, 40, 40
        );
    const sphereGeometry = asr.createGeometry(asr.geometryType().Triangles, sphere.sphereVertices, sphere.sphereIndices);
    
    asr.prepareForRendering();

    asr.setMaterialCurrent(material);
    asr.setMaterialDepthTestEnabled(true);
    asr.setMaterialFaceCullingEnabled(false);
    

    asr.setMaterialParameter("materialAmbientColor", materialAmbientColor);
    asr.setMaterialParameter("materialDiffuseColor", materialDiffuseColor);
    asr.setMaterialParameter("materialEmissionColor", materialEmissionColor);
    asr.setMaterialParameter("materialSpecularColor", materialSpecularColor);
    asr.setMaterialParameter("materialSpecularExponent", materialSpecularExponent);

    // First

    asr.setMaterialParameter("pointLightEnabled", pointLight1Enabled);
    asr.setMaterialParameter("pointLightTwoSided", pointLight1TwoSided);
    asr.setMaterialParameter("pointLightAmbientColor", pointLight1AmbientColor);
    asr.setMaterialParameter("pointLightDiffuseColor", pointLight1DiffuseColor);
    asr.setMaterialParameter("pointLightSpecularColor", pointLight1SpecularColor);
    asr.setMaterialParameter("pointLightIntensity", pointLight1Intensity);
    asr.setMaterialParameter("pointLightConstantAttenuation", pointLight1ConstantAttenuation);
    asr.setMaterialParameter("pointLightLinearAttenuation", pointLight1LinearAttenuation);
    asr.setMaterialParameter("pointLightQuadraticAttenuation", pointLight1QuadraticAttenuation);

    // Second

    asr.setMaterialParameter("pointLight2Enabled", pointLight2Enabled);
    asr.setMaterialParameter("pointLight2TwoSided", pointLight2TwoSided);
    asr.setMaterialParameter("pointLight2AmbientColor", pointLight2AmbientColor);
    asr.setMaterialParameter("pointLight2DiffuseColor", pointLight2DiffuseColor);
    asr.setMaterialParameter("pointLight2SpecularColor", pointLight2SpecularColor);
    asr.setMaterialParameter("pointLight2Intensity", pointLight2Intensity);
    asr.setMaterialParameter("pointLight2ConstantAttenuation", pointLight2ConstantAttenuation);
    asr.setMaterialParameter("pointLight2LinearAttenuation", pointLight2LinearAttenuation);
    asr.setMaterialParameter("pointLight2QuadraticAttenuation", pointLight2QuadraticAttenuation);

asr.setMaterialParameter("texturingMode", 0);

    const CAMERA_SPEED = 6.0;
    const CAMERA_ROT_SPEED = 1.5;
    const CAMERA_FOV = 1.3;
    const CAMERA_NEAR_PLANE = 0.1;
    const CAMERA_FAR_PLANE = 200;

    let cameraPosition = vec3.fromValues(0.0, 3.4, 2.1);
    let cameraRotation = vec3.fromValues(-1.05, 0.0, 0.0);
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

    // Plane Parameters

    const planePosition = vec3.fromValues(0.0, 0.0, 0.0);
    const planeRotation = vec3.fromValues(-asr.HALF_PI, 0.0, 0.0);

    // Sphere Parameters

    const spherePosition = vec3.fromValues(0.0, 0.5, 0.0);
    const sphereScale = vec3.fromValues(20.0, 20.0, 20.0);

    function render() {
        asr.prepareForRenderingFrame();

        //Camera

        asr.setMatrixMode(asr.matrixMode().View);
        asr.loadIdentityMatrix();
        asr.translateMatrix(cameraPosition);
        asr.rotateMatrix(cameraRotation);

        // Material - Light 1 position update

        let pointLight1Position = vec3.fromValues(
            pointLight1OrbitRadius * Math.cos(pointLight1OrbitAngle),
            pointLight1Height,
            pointLight1OrbitRadius * Math.sin(pointLight1OrbitAngle)
        );

        let pointLight1ViewPosition = vec4.fromValues(pointLight1Position[0], pointLight1Position[1], pointLight1Position[2], 1.0);
        vec4.transformMat4(pointLight1ViewPosition, pointLight1ViewPosition, asr.getViewMatrixInverted());
        asr.setMaterialParameter("pointLightViewPosition", [pointLight1ViewPosition[0], pointLight1ViewPosition[1], pointLight1ViewPosition[2]]);
        pointLight1OrbitAngle += pointLight1OrbitDeltaAngle;

        // Material - Light 2 position update

        let pointLight2Position = vec3.fromValues(
            pointLight2OrbitRadius * Math.cos(pointLight2OrbitAngle),
            pointLight2Height,
            pointLight2OrbitRadius * Math.sin(pointLight2OrbitAngle)
        );

       let pointLight2ViewPosition = vec4.fromValues(pointLight2Position[0], pointLight2Position[1], pointLight2Position[2], 1.0);
        vec4.transformMat4(pointLight2ViewPosition, pointLight2ViewPosition, asr.getViewMatrixInverted());
        asr.setMaterialParameter("pointLight2ViewPosition", [pointLight2ViewPosition[0], pointLight2ViewPosition[1], pointLight2ViewPosition[2]]);
        pointLight2OrbitAngle += pointLight2OrbitDeltaAngle;

        // Plane

        asr.setMaterialParameter("materialEmissionColor", vec4.fromValues(0.0, 0.0, 0.0, 0.0));
        asr.setMaterialParameter("pointLightEnabled", true);
        asr.setMaterialParameter("pointLight2Enabled", true);
        asr.setMaterialParameter("textureEnabled", false);

        asr.setMatrixMode(asr.matrixMode().Model);
        asr.loadIdentityMatrix();
        asr.translateMatrix(planePosition);
        asr.rotateMatrix(planeRotation);

        asr.setCurrentGeometry(planeGeometry);
        asr.renderCurrentGeometry();

        // Sphere

        asr.loadIdentityMatrix();
        asr.translateMatrix(spherePosition);
        asr.scaleMatrix(sphereScale);

        asr.setCurrentGeometry(sphereGeometry);
        asr.renderCurrentGeometry();

        // Light 1 representation

        asr.setMaterialParameter("pointLightEnabled", false);
        asr.setMaterialParameter("materialEmissionColor", vec4.fromValues(
            pointLight1DiffuseColor[0],
            pointLight1DiffuseColor[1],
            pointLight1DiffuseColor[2],
            1.0
        ));

        asr.loadIdentityMatrix();
        asr.translateMatrix(pointLight1Position);

        asr.setCurrentGeometry(sphereGeometry);
        asr.renderCurrentGeometry();

        // Light 2 representation

        asr.setMaterialParameter("pointLight2Enabled", false);
        asr.setMaterialParameter("materialEmissionColor", vec4.fromValues(
            pointLight2DiffuseColor[0],
            pointLight2DiffuseColor[1],
            pointLight2DiffuseColor[2],
            1.0
        ));

        asr.loadIdentityMatrix();
        asr.translateMatrix(pointLight2Position);

        asr.setCurrentGeometry(sphereGeometry);
        asr.renderCurrentGeometry();

        asr.finishFrameRendering();
        requestAnimationFrame(render);
    }

    render();
}

main();