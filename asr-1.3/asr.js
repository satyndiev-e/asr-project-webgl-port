/**
 * A WebGLRenderingContext
 */

let gl = null;

/**
 * Common Constants
 */

const PI = Math.PI;
const TWO_PI = 2.0 * Math.PI;
const HALF_PI = 0.5 * Math.PI;
const QUARTER_PI = 0.25 * Math.PI;

/* 
 * Geometry Types
 */

function vertex(
    x, y, z,
    nx, ny, nz,
    r = 1.0, g = 1.0, b = 1.0, a = 1.0,
    u = 0.0, v = 0.0) {
    return {
        x: x, y: y, z: z,
        nx: nx, ny: ny, nz: nz,
        r: r, g: g, b: b, a: a,
        u: u, v: v
    };
}

function instance(
    transform,
    r, g, b, a) {
    return {
        transform: transform,
        r: r, g: g, b: b, a: a
    };
}

function geometryType() {
    return {
        Points: gl.POINTS,
        Lines: gl.LINES,
        LineLoop: gl.LINE_LOOP,
        LineStrip: gl.LINE_STRIP,
        Triangles: gl.TRIANGLES,
        TriangleFan: gl.TRIANGLE_FAN,
        TriangleStrip: gl.TRIANGLE_STRIP,
    };
}

class Geometry {
    constructor() {
        this.type = geometryType().Triangles;
        this.vertexCount = 0;
        this.instanceCount = 0;
    }
}

/**
 * Texture Types
 */

function texturingMode() {
    return {
        Addition: 0,
        Subtraction: 1,
        ReverseSubtraction: 2,
        Modulation: 3,
        Decaling: 4
    };
};

function texturingWrapMode() {
    return {
        Repeat: gl.REPEAT,
        MirroredRepeat: gl.MIRRORED_REPEAT,
        ClampToEdge: gl.CLAMP_TO_EDGE
    };
};

function textureFilteringType() {
    return {
        Nearest: gl.NEAREST,
        Linear: gl.LINEAR,
        NearestMipmapNearest: gl.NEAREST_MIPMAP_NEAREST,
        NearestMipmapLinear: gl.NEAREST_MIPMAP_LINEAR,
        LinearMipmapNearest: gl.LINEAR_MIPMAP_NEAREST,
        LinearMipmapLinear: gl.LINEAR_MIPMAP_LINEAR
    };
}

class Texture {
    constructor() {
        this.width = 0;
        this.height = 0;
        this.mode = texturingMode().Modulation;
        this.wrapModeU = texturingWrapMode().ClampToEdge;
        this.wrapModeV = texturingWrapMode().ClampToEdge;
        this.minificationFilter = textureFilteringType().Linear;
        this.magnificationFilter = textureFilteringType().Linear;
        this.anisotropy = 0.0;
        this.textureObject = null;
    }
}

/**
 * Material Types
 */

function materialDepthTestFunction() {
    return {
        Never: gl.NEVER,
        Less: gl.LESS,
        Equal: gl.EQUAL,
        LessOrEqual: gl.LEQUAL,
        Greater: gl.GREATER,
        NotEqual: gl.NOTEQUAL,
        GreaterOrEqual: gl.GEQUAL,
        Always: gl.ALWAYS
    };
}

function materialBlendEquation() {
    return {
        Add: gl.FUNC_ADD,
        Subtract: gl.FUNC_SUBTRACT,
        ReverseSubtract: gl.FUNC_REVERSE_SUBTRACT
    };
}

function materialBlendingFunction() {
    return {
        Zero: gl.ZERO,
        One: gl.ONE,
        SourceColor: gl.SRC_COLOR,
        OneMinusSourceColor: gl.ONE_MINUS_SRC_COLOR,
        DestinationColor: gl.DST_COLOR,
        OneMinusDestinationColor: gl.ONE_MINUS_DST_COLOR,
        SourceAlpha: gl.SRC_ALPHA,
        OneMinusSourceAlpha: gl.ONE_MINUS_SRC_ALPHA,
        DestinationAlpha: gl.DST_ALPHA,
        OneMinusDestinationAlpha: gl.ONE_MINUS_DST_ALPHA,
        ConstantColor: gl.CONSTANT_COLOR,
        OneMinusConstantColor: gl.ONE_MINUS_CONSTANT_COLOR,
        ConstantAlpha: gl.CONSTANT_ALPHA,
        OneMinusConstantAlpha: gl.ONE_MINUS_CONSTANT_ALPHA,
        SourceAlphaSaturate: gl.SRC_ALPHA_SATURATE
    };
}

function materialCullFaceMode() {
    return {
        FrontFaces: gl.FRONT,
        BackFaces: gl.BACK,
        FrontAndBackFaces: gl.FRONT_AND_BACK
    };
}

function materialFrontFaceOrder() {
    return {
        Clockwise: gl.CW,
        CounterClockwise: gl.CCW
    };
}

class Material {
    constructor() {
        this.vertexShader = null;
        this.fragmentShader = null;

        this.lineWidth = 1.0;

        this.pointSizeEnabled = true;
        this.pointSize = 1.0;

        this.faceCullingEnabled = true;
        this.cullFaceMode = materialCullFaceMode().BackFaces;
        this.frontFaceOrder = materialFrontFaceOrder().CounterClockwise;

        this.depthMaskEnabled = true;
        this.depthTestEnabled = false;
        this.depthTestFunction = materialDepthTestFunction().Less;

        this.blendingEnabled = false;
        this.colorBlendingEquation = materialBlendEquation().Add;
        this.alphaBlendingEquation = materialBlendEquation().Add;
        this.sourceColorBlendingFunction = materialBlendingFunction().SourceAlpha;
        this.sourceAlphaBlendingFunction = materialBlendingFunction().SourceAlpha;
        this.destinationColorBlendingFunction = materialBlendingFunction().OneMinusSourceAlpha;
        this.destinationAlphaBlendingFunction = materialBlendingFunction().OneMinusSourceAlpha;
        this.blendingConstantColor = vec4.create();

        this.polygonOffsetEnabled = false;
        this.polygonOffsetFactor = 0.0;
        this.polygonOffsetUnits = 0.0;

        this.shaderProgram = null;

        // Common Uniforms are Hard-Coded

        this.positionAttributeLocation = null;
        this.normalAttributeLocation = null;
        this.colorAttributeLocation = null;
        this.textureCoordinatesAttributeLocation = null;

        this.instanceTransformAttributeLocation = null;
        this.instanceColorAttributeLocation = null;

        this.resolutionUniformLocation = null;

        this.timeUniformLocation = null;
        this.dtUniformLocation = null;

        this.textureSamplerUniformLocation = null;
        this.textureEnabledUniformLocation = null;
        this.texturingModeUniformLocation = null;
        this.textureTransformationMatrixUniformLocation = null;

        this.pointSizeUniformLocation = null;

        this.modelMatrixUniformLocation = null;
        this.viewMatrixUniformLocation = null;
        this.modelViewMatrixUniformLocation = null;
        this.projectionMatrixUniformLocation = null;
        this.viewProjectionMatrixUniformLocation = null;
        this.mvpMatrixUniformLocation = null;
        this.normalMatrixUniformLocation = null;

        // All the other uniforms including the common

        this.shaderUniforms = {};

    }
}

/**
 * Transformation Types
 */

function matrixMode() {
    return {
        Model: 0,
        View: 1,
        Projection: 2,
        Texturing: 3
    }
}

/**
 * Extensions
 */

function instansedArrayExtension() {
    const ext = gl.getExtension('ANGLE_instanced_arrays');
    if (!ext) {
        return alert('need ANGLE_instanced_arrays');
    }
    return ext;
}

/**
 * Geometry Data
 */

let currentGeometry = null;

/**
 * Texture Data
 */

let currentTexture = null;

/**
 * Material Data
 */

let currentMaterial = null;

/**
 * Transformation Data
 */

const modelMatrixStack = [mat4.create()];
const viewMatrixStack = [mat4.create()];
const projectionMatrixStack = [mat4.create()];
const textureMatrixStack = [mat4.create()];
let currentMatrixStack = [modelMatrixStack];

/**
 * Utility Data
 */

let renderingStartTime = null;
let frameRenderingStartTime = null;
let frameRenderingDeltaTime = 0.016;
const timeScale = 0.1;


/**
 * Initialize WebGL
 */

function initializeWebGL() {
    const canvas = document.getElementById("webgl-canvas");
    gl = canvas.getContext("webgl");

    if (!gl) {
        console.error("Failed to initialize the WebGL loader.");
        return;
    }
    return true;
}

/**
 * Keyboard Handler
 */

function setKeysEventHandler() {
    const keysPressed = {};

    function handleKeyDown(event) {
        keysPressed[event.key.toLowerCase()] = true;
    }

    function handleKeyUp(event) {
        delete keysPressed[event.key.toLowerCase()];
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return {
        isKeyPressed: function (key) {
            return !!keysPressed[key.toLowerCase()];
        },
        getPressedKeys: function () {
            return Object.keys(keysPressed);
        }
    };
}

/**
 * Material Handling
 */

function createMaterial(vertexShader, fragmentShader) {
    const material = new Material();
    material.vertexShader = vertexShader;
    material.fragmentShader = fragmentShader;

    const vertexShaderSource = vertexShader;
    const fragmentShaderSource = fragmentShader;

    const vertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShaderObject, vertexShaderSource);
    gl.compileShader(vertexShaderObject);
    if (!gl.getShaderParameter(vertexShaderObject, gl.COMPILE_STATUS)) {
        console.error("Failed to compile a vertex shader:", gl.getShaderInfoLog(vertexShaderObject));
        gl.deleteShader(vertexShaderObject);
        return null;
    }

    const fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShaderObject, fragmentShaderSource);
    gl.compileShader(fragmentShaderObject);
    if (!gl.getShaderParameter(fragmentShaderObject, gl.COMPILE_STATUS)) {
        console.error("Failed to compile a fragment shader:", gl.getShaderInfoLog(fragmentShaderObject));
        gl.deleteShader(fragmentShaderObject);
        return null;
    }

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShaderObject);
    gl.attachShader(shaderProgram, fragmentShaderObject);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error("Failed to link a shader program", gl.getProgramInfoLog(shaderProgram));
        gl.deleteProgram(shaderProgram);
        return null;
    }

    const uniformCount = gl.getProgramParameter(shaderProgram, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
        const uniformInfo = gl.getActiveUniform(shaderProgram, i);
        if (uniformInfo) {
            const uniformName = uniformInfo.name;
            if (uniformInfo.size > 1) {
                const baseName = uniformName.replace(/\[.*\]/, '');
                for (let j = 0; j < uniformInfo.size; j++) {
                    const name = `${baseName}[${j}]`;
                    material.shaderUniforms[name] = gl.getUniformLocation(shaderProgram, name);
                }
            } else {
                material.shaderUniforms[uniformName] = gl.getUniformLocation(shaderProgram, uniformName);
            }
        }
    }

    material.positionAttributeLocation = gl.getAttribLocation(shaderProgram, "position");
    material.normalAttributeLocation = gl.getAttribLocation(shaderProgram, "normal");
    material.colorAttributeLocation = gl.getAttribLocation(shaderProgram, "color");
    material.textureCoordinatesAttributeLocation = gl.getAttribLocation(shaderProgram, "textureCoordinates");

    material.instanceTransformAttributeLocation = gl.getAttribLocation(shaderProgram, "instanceTransform");
    material.instanceColorAttributeLocation = gl.getAttribLocation(shaderProgram, "instanceColor");

    material.resolutionUniformLocation = gl.getUniformLocation(shaderProgram, "resolution");

    material.timeUniformLocation = gl.getUniformLocation(shaderProgram, "time");
    material.dtUniformLocation = gl.getUniformLocation(shaderProgram, "getDeltaTime");

    material.textureEnabledUniformLocation = gl.getUniformLocation(shaderProgram, "textureEnabled");
    material.textureTransformationMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "textureTransformationMatrix");
    material.texturingModeUniformLocation = gl.getUniformLocation(shaderProgram, "texturingMode");
    material.textureSamplerUniformLocation = gl.getUniformLocation(shaderProgram, "textureSampler");

    material.pointSizeUniformLocation = gl.getUniformLocation(shaderProgram, "pointSize");

    material.modelMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "modelMatrix");
    material.viewMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "viewMatrix");
    material.modelViewMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "modelViewMatrix");
    material.projectionMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "projectionMatrix");
    material.viewProjectionMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "viewProjectionMatrix");
    material.mvpMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "modelViewProjectionMatrix");
    material.normalMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "normalMatrix");

    material.shaderProgram = shaderProgram;

    return material;
}

function setMaterialLineWidth(lineWidth) {
    assert(currentMaterial);
    currentMaterial.lineWidth = lineWidth;
    gl.lineWidth(lineWidth);
}

function setMaterialPointSize(pointSize) {
    assert(currentMaterial);
    currentMaterial.pointSize = pointSize;
}

function setMaterialFaceCullingEnabled(faceCullingEnabled) {
    assert(currentMaterial);
    currentMaterial.faceCullingEnabled = faceCullingEnabled;

    if (faceCullingEnabled) {
        gl.enable(gl.CULL_FACE);
    } else {
        gl.disable(gl.CULL_FACE);
    }
}

function setMaterialCullFaceMode(cullFaceMode) {
    assert(currentMaterial);
    currentMaterial.cullFaceMode = cullFaceMode;
    gl.cullFace(cullFaceMode);
}

function setMaterialFrontFaceOrder(frontFaceOrder) {
    assert(currentMaterial);
    currentMaterial.frontFaceOrder = frontFaceOrder;
    gl.frontFace(frontFaceOrder);
}

function setMaterialDepthMaskEnabled(depthMaskEnabled) {
    assert(currentMaterial);
    currentMaterial.depthMaskEnabled = depthMaskEnabled;

    gl.depthMask(depthMaskEnabled);
}

function setMaterialDepthTestEnabled(depthTestEnabled) {
    assert(currentMaterial);
    currentMaterial.depthTestEnabled = depthTestEnabled;

    if (depthTestEnabled) {
        gl.enable(gl.DEPTH_TEST);
    } else {
        gl.disable(gl.DEPTH_TEST);
    }
}

function setMaterialDepthTestFunction(depthTestFunction) {
    assert(currentMaterial);
    currentMaterial.depthTestFunction = depthTestFunction;
    gl.depthFunc(depthTestFunction);
}

function setMaterialBlendingEnabled(blendingEnabled) {
    assert(currentMaterial);
    currentMaterial.blendingEnabled = blendingEnabled;

    if (blendingEnabled) {
        gl.enable(gl.BLEND);
    } else {
        gl.disable(gl.BLEND);
    }
}

function setMaterialBlendingEquations(colorBlendingEquation, alphaBlendingEquation) {
    assert(currentMaterial);
    currentMaterial.colorBlendingEquation = colorBlendingEquation;
    currentMaterial.alphaBlendingEquation = alphaBlendingEquation;

    gl.blendEquationSeparate(colorBlendingEquation, alphaBlendingEquation);
}

function setMaterialBlendingFunctions(
    sourceColorBlendingFunction, sourceAlphaBlendingFunction,
    destinationColorBlendingFunction, destinationAlphaBlendingFunction) {
    assert(currentMaterial);
    currentMaterial.sourceColorBlendingFunction = sourceColorBlendingFunction;
    currentMaterial.sourceAlphaBlendingFunction = sourceAlphaBlendingFunction;
    currentMaterial.destinationColorBlendingFunction = destinationColorBlendingFunction;
    currentMaterial.destinationAlphaBlendingFunction = destinationAlphaBlendingFunction;

    gl.blendFuncSeparate(
        sourceColorBlendingFunction, destinationColorBlendingFunction,
        sourceAlphaBlendingFunction, destinationAlphaBlendingFunction
    );
}

function setMaterialBlendingConstantColor(blendingConstantColor) {
    assert(currentMaterial);
    currentMaterial.blendingConstantColor = blendingConstantColor;

    gl.blendColor(
        blendingConstantColor[0],
        blendingConstantColor[1],
        blendingConstantColor[2],
        blendingConstantColor[3]
    );
}

function setMaterialPolygonOffsetEnabled(polygonOffsetEnabled) {
    assert(currentMaterial);
    currentMaterial.polygonOffsetEnabled = polygonOffsetEnabled;

    if (polygonOffsetEnabled) {
        gl.enable(gl.POLYGON_OFFSET_FILL);
    } else {
        gl.disable(gl.POLYGON_OFFSET_FILL);
    }
}

function setMaterialPolygonOffsetFactorAndUnits(polygonOffsetFactor, polygonOffsetUnits) {
    assert(currentMaterial);
    currentMaterial.polygonOffsetFactor = polygonOffsetFactor;
    currentMaterial.polygonOffsetUnits = polygonOffsetUnits;

    gl.polygonOffset(polygonOffsetFactor, polygonOffsetUnits);
}

function setMaterialParameter(parameterName, value) {
    assert(currentMaterial);

    const uniformLocation = currentMaterial.shaderUniforms[parameterName];
    if (uniformLocation === null || uniformLocation === undefined) {
        throw new Error(`Uniform ${parameterName} not found.`);
    }

    const uniformInfo = gl.getActiveUniform(currentMaterial.shaderProgram, uniformLocation.index || 0);
    if (!uniformInfo) {
        console.warn(`Could no get uniform info for ${parameterName}`);
    }

    if (typeof value === 'number') {
        if (
            uniformInfo.type === gl.INT ||
            uniformInfo.type === gl.BOOL ||
            uniformInfo.type === gl.SAMPLER_2D
        ) {
            gl.uniform1i(uniformLocation, value);
        } else {
            gl.uniform1f(uniformLocation, value);
        }
        return;
    }

    if (typeof value === 'boolean') {
        gl.uniform1i(uniformLocation, value ? 1 : 0);
        return;
    }

    if (Array.isArray(value) || value instanceof Float32Array) {
        const flatValues = value instanceof Float32Array ? value : new Float32Array(value);
        switch (flatValues.length) {
            case 1:
                gl.uniform1fv(uniformLocation, flatValues); // 1D float array
                break;
            case 2:
                gl.uniform2fv(uniformLocation, flatValues); // 2D vector
                break;
            case 3:
                gl.uniform3fv(uniformLocation, flatValues); // 3D vector
                break;
            case 4:
                gl.uniform4fv(uniformLocation, flatValues); // 4D vector
                break;
            case 9:
                gl.uniformMatrix3fv(uniformLocation, false, flatValues); // 3x3 matrix
                break;
            case 16:
                gl.uniformMatrix4fv(uniformLocation, false, flatValues); // 4x4 matrix
                break;
            default:
                throw new Error(`Unsupported array length for uniform ${parameterName}.`);
        }
    }
}

function setMaterialCurrent(material) {
    currentMaterial = material;

    if (material !== null) {
        gl.useProgram(material.shaderProgram);

        gl.lineWidth(material.lineWidth);

        if (material.faceCullingEnabled) {
            gl.enable(gl.CULL_FACE);
        } else {
            gl.disable(gl.CULL_FACE);
        }
        gl.cullFace(material.cullFaceMode);
        gl.frontFace(material.frontFaceOrder);

        if (material.depthMaskEnabled) {
            gl.depthMask(true);
        } else {
            gl.depthMask(false);
        }

        if (material.depthTestEnabled) {
            gl.enable(gl.DEPTH_TEST);
        } else {
            gl.disable(gl.DEPTH_TEST);
        }
        gl.depthFunc(material.depthTestFunction);

        if (material.blendingEnabled) {
            gl.enable(gl.BLEND);
        } else {
            gl.disable(gl.BLEND);
        }

        gl.blendEquationSeparate(material.colorBlendingEquation, material.alphaBlendingEquation);

        gl.blendFuncSeparate(
            material.sourceColorBlendingFunction,
            material.destinationColorBlendingFunction,
            material.sourceAlphaBlendingFunction,
            material.destinationAlphaBlendingFunction
        );
        gl.blendColor(
            material.blendingConstantColor[0],
            material.blendingConstantColor[1],
            material.blendingConstantColor[2],
            material.blendingConstantColor[3]
        );

        if (material.polygonOffsetEnabled) {
            gl.enable(gl.POLYGON_OFFSET_FILL);
        } else {
            gl.disable(gl.POLYGON_OFFSET_FILL);
        }
        gl.polygonOffset(material.polygonOffsetFactor, material.polygonOffsetUnits);
    } else {
        gl.useProgram(null);
    }
}

/**
 * Geometry Handling
 */

function createGeometry(type, vertices, indices, instances = null) {

    const vertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    let instanceBufferObject = null;
    if (instances !== null) {
        instanceBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instances), gl.STATIC_DRAW);
    }

    const indexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        type: type,
        vertexCount: indices.length,
        instanceCount: instances === null ? 0 : instances.length / 20,
        instanceBuffer: instanceBufferObject,
        vertexBuffer: vertexBufferObject,
        indexBuffer: indexBufferObject
    };
}

function setCurrentGeometry(geometry) {
    currentGeometry = geometry;

    if (geometry !== null) {
        assert(currentMaterial);

        let dataType = gl.FLOAT;
        let normalize = false;
        let stride = Float32Array.BYTES_PER_ELEMENT * 12;

        gl.bindBuffer(gl.ARRAY_BUFFER, currentGeometry.vertexBuffer);
        gl.enableVertexAttribArray(currentMaterial.positionAttributeLocation);
        gl.vertexAttribPointer(currentMaterial.positionAttributeLocation, 3, dataType, normalize, stride, 0);

        if (currentMaterial.normalAttributeLocation !== -1) {
            gl.enableVertexAttribArray(currentMaterial.normalAttributeLocation);
            gl.vertexAttribPointer(currentMaterial.normalAttributeLocation, 3, dataType, normalize, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
        }

        if (currentMaterial.colorAttributeLocation !== -1) {
            gl.enableVertexAttribArray(currentMaterial.colorAttributeLocation);
            gl.vertexAttribPointer(currentMaterial.colorAttributeLocation, 4, dataType, normalize, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
        }

        if (currentMaterial.textureCoordinatesAttributeLocation !== -1) {
            gl.enableVertexAttribArray(currentMaterial.textureCoordinatesAttributeLocation);
            gl.vertexAttribPointer(currentMaterial.textureCoordinatesAttributeLocation, 2, dataType, normalize, stride, 10 * Float32Array.BYTES_PER_ELEMENT);
        }

        if (currentGeometry.instanceBuffer !== null) {
            stride = Float32Array.BYTES_PER_ELEMENT * 20;
            gl.bindBuffer(gl.ARRAY_BUFFER, currentGeometry.instanceBuffer);

            const ext = instansedArrayExtension();
            if (!ext) {
                console.error('ANGLE_instanced_arrays not supported');
                return;
            }

            for (let i = 0; i < 4; i++) {
                const loc = currentMaterial.instanceTransformAttributeLocation + i;
                gl.enableVertexAttribArray(loc);
                gl.vertexAttribPointer(loc, 4, dataType, normalize, stride, i * 4 * Float32Array.BYTES_PER_ELEMENT);
                ext.vertexAttribDivisorANGLE(loc, 1);
            }

            gl.enableVertexAttribArray(currentMaterial.instanceColorAttributeLocation);
            gl.vertexAttribPointer(currentMaterial.instanceColorAttributeLocation, 4, dataType, normalize, stride, 16 * Float32Array.BYTES_PER_ELEMENT);
            ext.vertexAttribDivisorANGLE(currentMaterial.instanceColorAttributeLocation, 1);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, currentGeometry.indexBuffer);
    }
}

/**
 * Texture Handling
 */

function createTexture(imgID) {
    const texture = new Texture();

    const textureObject = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureObject);

    const image = document.getElementById(imgID);
    if (!image) {
        throw new Error("Failed to load the image.");
    }

    const internalFormat = gl.RGBA;
    const srcFormat = gl.RGBA;

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, srcFormat, gl.UNSIGNED_BYTE, image);

    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, textureFilteringType().LinearMipmapLinear);
    } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, texturingWrapMode().ClampToEdge);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, texturingWrapMode().ClampToEdge);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, textureFilteringType().Linear);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, textureFilteringType().Linear);

        const ext = gl.getExtension("EXT_texture_filter_anisotropic");
        if (ext) {
            gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, texture.anisotropy);
        }
    }

    gl.bindTexture(gl.TEXTURE_2D, null);

    texture.width = image.width;
    texture.height = image.height;
    texture.textureObject = textureObject;

    return texture;
}

function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

function assert(value) {
    if (value === null) {
        throw new Error("No value is set for rendering.");
    }
}

function setTextureMode(mode) {
    assert(currentTexture);
    currentTexture.mode = mode;
}

function setTextureWrapModeU(wrapModeU) {
    assert(currentTexture);
    currentTexture.wrapModeU = wrapModeU;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapModeU);
}

function setTextureWrapModeV(wrapModeV) {
    assert(currentTexture);
    currentTexture.wrapModeV = wrapModeV;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapModeV);
}

function setTextureMagnificationFilter(magnificationFilter) {
    assert(currentTexture);
    currentTexture.magnificationFilter = magnificationFilter;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magnificationFilter);
}

function setTextureMinificationFilter(minificationFilter) {
    assert(currentTexture);
    currentTexture.minificationFilter = minificationFilter;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, minificationFilter);
}

function setTextureAnisotropy(anisotropy) {
    assert(currentTexture);
    currentTexture.anisotropy = anisotropy;
    const ext = gl.getExtension("EXT_texture_filter_anisotropic");
    if (ext) {
        gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISTROPY_EXT, anisotropy);
    }
}

function setTextureCurrent(texture, sampler = 0) {
    currentTexture = texture;
    if (texture !== null) {
        gl.activeTexture(gl.TEXTURE0 + sampler);
        gl.bindTexture(gl.TEXTURE_2D, texture.textureObject);
    } else {
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
}

/**
 * Transformation
 */

function setMatrixMode(mode) {
    switch (mode) {
        case matrixMode().Model:
            currentMatrixStack = modelMatrixStack;
            break;
        case matrixMode().View:
            currentMatrixStack = viewMatrixStack;
            break;
        case matrixMode().Projection:
            currentMatrixStack = projectionMatrixStack;
            break;
        case matrixMode().Texturing:
            currentMatrixStack = textureMatrixStack;
            break;
        default:
            throw new Error("Invalid matrix mode");
    }

    return currentMatrixStack;
}

function translateMatrix(translation) {
    const currentMatrix = currentMatrixStack[currentMatrixStack.length - 1];
    mat4.translate(currentMatrix, currentMatrix, translation);
    currentMatrixStack.pop();
    currentMatrixStack.push(currentMatrix);
}

function rotateMatrix(rotation) {
    const currentMatrix = currentMatrixStack[currentMatrixStack.length - 1];

    mat4.rotate(currentMatrix, currentMatrix, rotation[1], vec3.fromValues(0.0, 1.0, 0.0));
    mat4.rotate(currentMatrix, currentMatrix, rotation[0], vec3.fromValues(1.0, 0.0, 0.0));
    mat4.rotate(currentMatrix, currentMatrix, rotation[2], vec3.fromValues(0.0, 0.0, 1.0));
    currentMatrixStack.pop();
    currentMatrixStack.push(currentMatrix);
}

function scaleMatrix(scale) {
    const currentMatrix = currentMatrixStack[currentMatrixStack.length - 1];

    mat4.scale(currentMatrix, currentMatrix, scale);
    currentMatrixStack.pop();
    currentMatrixStack.push(currentMatrix);
}

function getMatrix() {
    return currentMatrixStack[currentMatrixStack.length - 1];
}

function getModelMatrix() {
    return modelMatrixStack[modelMatrixStack.length - 1];
}

function getViewMatrix() {
    return viewMatrixStack[viewMatrixStack.length - 1];
}

function getViewMatrixInverted() {
    const viewMatrix = viewMatrixStack[viewMatrixStack.length - 1];
    const invertedViewMatrix = mat4.create();
    mat4.invert(invertedViewMatrix, viewMatrix);
    return invertedViewMatrix;
}

function getProjectionMatrix() {
    return projectionMatrixStack[projectionMatrixStack.length - 1];
}

function getTextureMatrix() {
    return textureMatrixStack[textureMatrixStack.length - 1];
}

function setMatrix(matrix) {
    currentMatrixStack.pop();
    currentMatrixStack.push(matrix);
}

function loadIdentityMatrix() {
    setMatrix(mat4.create());
}

function loadLookAtMatrix(position, target) {
    const up = [0.0, 1.0, 0.0];
    const lookAtMatrix = mat4.create();
    mat4.lookAt(lookAtMatrix, position, target, up);
    setMatrix(lookAtMatrix);
}

function loadOrthographicProjectionMatrix(zoom, nearPlane, farPlane) {
    const aspectRatio = gl.canvas.clientWidth / gl.canvas.clientHeight;

    const left = -(zoom * aspectRatio);
    const right = zoom * aspectRatio;
    const bottom = -zoom;
    const top = zoom;

    const orthoMatrix = mat4.create();
    mat4.ortho(orthoMatrix, left, right, bottom, top, nearPlane, farPlane);
    setMatrix(orthoMatrix);
}

function loadPerspectiveProjectionMatrix(fieldOfView, nearPlane, farPlane) {
    const aspectRatio = gl.canvas.clientWidth / gl.canvas.clientHeight;;

    const perspectiveMatrix = mat4.create();
    mat4.perspective(perspectiveMatrix, fieldOfView, aspectRatio, nearPlane, farPlane);
    currentMatrixStack.pop();
    currentMatrixStack.push(perspectiveMatrix);
}

function pushMatrix() {
    if (currentMatrixStack.length === 0) {
        currentMatrixStack.push(mat4.create());
    } else {
        const topMatrix = currentMatrixStack[currentMatrixStack.length - 1];
        const newMatrix = mat4.clone(topMatrix);
        currentMatrixStack.push(newMatrix);
    }
}

function popMatrix() {
    if (currentMatrixStack.length <= 1) {
        throw new Error("Cannot pop the last matrix from the stack.");
    }

    currentMatrixStack.pop();
}

function clearMatrices() {
    while (currentMatrixStack.length > 0) currentMatrixStack.pop();
    const matrix = mat4.create();
    currentMatrixStack.push(matrix);
}

/**
 * Utility functions
 */

function getTimeScale() {
    return timeScale;
}

function setTimeScale(scaleTime) {
    timeScale = scaleTime;
}

function getDeltaTime() {
    return frameRenderingDeltaTime * timeScale;
}

/**
 * Rendering
 */

function prepareForRendering() {
    gl.clearColor(0, 0, 0, 0);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    while (modelMatrixStack.length > 0) modelMatrixStack.pop();
    modelMatrixStack.push(mat4.create());

    while (viewMatrixStack.length > 0) viewMatrixStack.pop();
    viewMatrixStack.push(mat4.create());

    while (projectionMatrixStack.length > 0) projectionMatrixStack.pop();
    projectionMatrixStack.push(mat4.create());

    while (textureMatrixStack.length > 0) textureMatrixStack.pop();
    textureMatrixStack.push(mat4.create());

    renderingStartTime = performance.now();
}

function prepareForRenderingFrame() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    frameRenderingStartTime = performance.now();
}

function renderCurrentGeometry() {
    if (currentGeometry === null) {
        console.error("Error: No Geometry is set for rendering.");
        return;
    }
    if (currentMaterial === null) {
        console.error("Error: No Material is set for rendering.");
        return;
    }

    try {

        if (currentMaterial.resolutionUniformLocation !== null) {
            gl.uniform2f(currentMaterial.resolutionUniformLocation, gl.canvas.clientWidth, gl.canvas.clientHeight);
        }

        if (currentMaterial.timeUniformLocation !== null) {
            const time = (performance.now() - renderingStartTime) / 1000.0;
            gl.uniform1f(currentMaterial.timeUniformLocation, time);
        }

        if (currentMaterial.dtUniformLocation !== null) {
            gl.uniform1f(currentMaterial.dtUniformLocation, frameRenderingDeltaTime);
        }

        let textureEnabled = currentTexture !== null;
        if (currentMaterial.textureEnabledUniformLocation !== null) {
            gl.uniform1i(currentMaterial.textureEnabledUniformLocation, textureEnabled ? 1 : 0);
        }

        if (currentMaterial.textureSamplerUniformLocation !== null) {
            gl.uniform1i(currentMaterial.textureSamplerUniformLocation, 0);
        }

        if (currentMaterial.textureTransformationMatrixUniformLocation !== null) {
            if (textureMatrixStack.length === 0) {
                console.warn("Texture matrix stack is empty. Using identity matrix.")
                const identityMatrix = mat4.create();
                gl.uniformMatrix4fv(currentMaterial.textureTransformationMatrixUniformLocation, false, identityMatrix);
            } else {
                const textureMatrix = textureMatrixStack[textureMatrixStack.length - 1];
                gl.uniformMatrix4fv(currentMaterial.textureTransformationMatrixUniformLocation, false, textureMatrix);
            }
        }

        if (currentMaterial.texturingModeUniformLocation !== null && currentTexture !== null) {
            gl.uniform1i(currentMaterial.texturingModeUniformLocation, currentTexture.mode);
        }

        if (currentMaterial.pointSizeUniformLocation !== null) {
            gl.uniform1f(currentMaterial.pointSizeUniformLocation, currentMaterial.pointSize);
        }

        if (currentMaterial.modelMatrixUniformLocation !== null) {
            if (modelMatrixStack.length === 0) {
                console.warn("Model matrix stack is empty. Using identity matrix.");
                const identityMatrix = mat4.create();
                gl.uniformMatrix4fv(currentMaterial.modelMatrixUniformLocation, false, identityMatrix);
            } else {
                const modelMatrix = modelMatrixStack[modelMatrixStack.length - 1];
                gl.uniformMatrix4fv(currentMaterial.modelMatrixUniformLocation, false, modelMatrix);
            }
        }

        if (currentMaterial.viewMatrixUniformLocation !== null) {
            if (viewMatrixStack.length === 0) {
                console.warn("View matrix stack is empty. Using identity matrix.");
                const identityMatrix = mat4.create();
                gl.uniformMatrix4fv(currentMaterial.viewMatrixUniformLocation, false, identityMatrix);
            } else {
                const viewMatrix = mat4.create();
                mat4.invert(viewMatrix, viewMatrixStack[viewMatrixStack.length - 1]);
                gl.uniformMatrix4fv(currentMaterial.viewMatrixUniformLocation, false, viewMatrix);
            }
        }

        if (currentMaterial.modelViewMatrixUniformLocation !== null) {
            const modelMatrix = modelMatrixStack[modelMatrixStack.length - 1];
            const viewMatrix = mat4.create();
            mat4.invert(viewMatrix, viewMatrixStack[viewMatrixStack.length - 1]);
            const modelViewMatrix = mat4.create();
            mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
            gl.uniformMatrix4fv(currentMaterial.modelViewMatrixUniformLocation, false, modelViewMatrix);
        }

        if (currentMaterial.projectionMatrixUniformLocation !== null) {
            const projectionMatrix = projectionMatrixStack[projectionMatrixStack.length - 1];
            gl.uniformMatrix4fv(currentMaterial.projectionMatrixUniformLocation, false, projectionMatrix);
        }

        if (currentMaterial.viewProjectionMatrixUniformLocation !== null) {
            const viewMatrix = mat4.create();
            mat4.invert(viewMatrix, viewMatrixStack[viewMatrixStack.length - 1]);
            const projectionMatrix = projectionMatrixStack[projectionMatrixStack.length - 1];
            const viewProjectionMatrix = mat4.create();
            mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
            gl.uniformMatrix4fv(currentMaterial.viewProjectionMatrixUniformLocation, false, viewProjectionMatrix);
        }

        if (currentMaterial.mvpMatrixUniformLocation !== null) {
            const modelMatrix = modelMatrixStack[modelMatrixStack.length - 1];
            const viewMatrix = mat4.create();
            mat4.invert(viewMatrix, viewMatrixStack[viewMatrixStack.length - 1]);
            const projectionMatrix = projectionMatrixStack[projectionMatrixStack.length - 1];

            const modelViewProjectionMatrix = mat4.create();
            mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix);
            mat4.multiply(modelViewProjectionMatrix, modelViewProjectionMatrix, modelMatrix);
            gl.uniformMatrix4fv(
                currentMaterial.mvpMatrixUniformLocation,
                false,
                modelViewProjectionMatrix
            );
        }

        if (currentMaterial.normalMatrixUniformLocation !== null) {
            const modelMatrix = modelMatrixStack[modelMatrixStack.length - 1];
            const viewMatrix = mat4.create();
            mat4.invert(viewMatrix, viewMatrixStack[viewMatrixStack.length - 1]);
            const modelViewMatrix = mat4.create();
            mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

            const normalMatrix = mat3.create();
            mat3.normalFromMat4(normalMatrix, modelViewMatrix);
            gl.uniformMatrix3fv(currentMaterial.normalMatrixUniformLocation, false, normalMatrix);
        }

        if (currentGeometry.instanceBuffer !== null) {
            try {
                const ext = instansedArrayExtension();
                if (!ext) {
                    console.error("Instancing extension not available.");
                    return;
                }
                ext.drawElementsInstancedANGLE(
                    currentGeometry.type,
                    currentGeometry.vertexCount,
                    gl.UNSIGNED_SHORT,
                    0,
                    currentGeometry.instanceCount
                );
            } catch (e) {
                console.error("Error during instanced drawing:", e);
            }
        } else {
            try {
                gl.drawElements(
                    currentGeometry.type,
                    currentGeometry.vertexCount,
                    gl.UNSIGNED_SHORT,
                    0
                );
            } catch (e) {
                console.error("Error during standard drawing:", e);
            }
        }

    } catch (e) {
        console.error("Exception in renderCurrentGeometry:", e);
    }
}

function finishFrameRendering() {
    const now = performance.now();
    frameRenderingDeltaTime = (now - frameRenderingStartTime) / 1000.0;

    frameRenderingStartTime = now;

    if (frameRenderingDeltaTime > 1.0) {
        frameRenderingDeltaTime = 0.016;
    }
}

/**
 * Exports
 */

(function (global) {
    const asr = {
        //Functions

        initializeWebGL,
        setKeysEventHandler,
        createMaterial,
        setMaterialLineWidth,
        setMaterialPointSize,
        setMaterialFaceCullingEnabled,
        setMaterialCullFaceMode,
        setMaterialFrontFaceOrder,
        setMaterialDepthMaskEnabled,
        setMaterialDepthTestEnabled,
        setMaterialDepthTestFunction,
        setMaterialBlendingEnabled,
        setMaterialBlendingEquations,
        setMaterialBlendingFunctions,
        setMaterialBlendingConstantColor,
        setMaterialPolygonOffsetEnabled,
        setMaterialPolygonOffsetFactorAndUnits,
        setMaterialParameter,
        setMaterialCurrent,
        createGeometry,
        setCurrentGeometry,
        createTexture,
        setTextureMode,
        setTextureWrapModeU,
        setTextureWrapModeV,
        setTextureMagnificationFilter,
        setTextureMinificationFilter,
        setTextureAnisotropy,
        setTextureCurrent,
        setMatrixMode,
        translateMatrix,
        rotateMatrix,
        scaleMatrix,
        getMatrix,
        getModelMatrix,
        getViewMatrix,
        getViewMatrixInverted,
        getProjectionMatrix,
        getTextureMatrix,
        setMatrix,
        loadIdentityMatrix,
        loadLookAtMatrix,
        loadOrthographicProjectionMatrix,
        loadPerspectiveProjectionMatrix,
        pushMatrix,
        popMatrix,
        clearMatrices,
        getTimeScale,
        setTimeScale,
        getDeltaTime,
        prepareForRendering,
        prepareForRenderingFrame,
        renderCurrentGeometry,
        finishFrameRendering,

        //Objects

        geometryType,
        instance,
        vertex,
        texturingMode,
        texturingWrapMode,
        textureFilteringType,
        materialDepthTestFunction,
        materialBlendEquation,
        materialBlendingFunction,
        materialCullFaceMode,
        materialFrontFaceOrder,
        matrixMode,

        //Variables

        PI,
        TWO_PI,
        HALF_PI,
        QUARTER_PI
    }

    global.asr = asr;
})(window);
