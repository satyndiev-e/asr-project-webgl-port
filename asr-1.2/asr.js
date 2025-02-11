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

function vertex(
    x, y, z,
    r = 1.0, g = 1.0, b = 1.0, a = 1.0,
    u = 0.0, v = 0.0) {
    return {
        x: x, y: y, z: z,
        r: r, g: g, b: b, a: a,
        u: u, v: v
    };
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
    }
};

class Texture {
    constructor() {
        this.width = 0;
        this.height = 0;
        this.mode = texturingMode().Decaling;
        this.wrapModeU = texturingWrapMode().ClampToEdge;
        this.wrapModeV = texturingWrapMode().ClampToEdge;
        this.minificationFilter = textureFilteringType().Linear;
        this.magnificationFilter = textureFilteringType().Linear;
        this.anisotropy = 0.0;
        this.textureObject = null;
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
 * Shader Data
 */

let shaderProgram = null;

let positionAttributeLocation = null;
let colorAttributeLocation = null;
let textureCoordinatesAttributeLocation = null;

let resolutionUniformLocation = null;

let timeUniformLocation = null;
let dtUniformLocation = null;

let textureSamplerUniformLocation = null;
let textureEnabledUniformLocation = null;
let texturingModeUniformLocation = null;
let textureTransformationMatrixUniformLocation = null;

let modelMatrixUniformLocation = null;
let viewMatrixUniformLocation = null;
let modelViewMatrixUniformLocation = null;
let projectionMatrixUniformLocation = null;
let viewProjectionMatrixUniformLocation = null;
let mvpMatrixUniformLocation = null;

/**
 * Geometry Data
 */

let currentGeometry = null;

/**
 * Texture Data
 */

let currentTexture = null;

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
 * Shader Program Handling
 */

function createShader(vertexShader, fragmentShader) {
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

    positionAttributeLocation = gl.getAttribLocation(shaderProgram, "position");
    colorAttributeLocation = gl.getAttribLocation(shaderProgram, "color");
    textureCoordinatesAttributeLocation = gl.getAttribLocation(shaderProgram, "textureCoordinates");

    resolutionUniformLocation = gl.getUniformLocation(shaderProgram, "resolution");

    timeUniformLocation = gl.getUniformLocation(shaderProgram, "time");
    dtUniformLocation = gl.getUniformLocation(shaderProgram, "getDeltaTime");

    textureEnabledUniformLocation = gl.getUniformLocation(shaderProgram, "textureEnabled");
    textureTransformationMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "textureTransformationMatrix");
    texturingModeUniformLocation = gl.getUniformLocation(shaderProgram, "textureMode");
    textureSamplerUniformLocation = gl.getUniformLocation(shaderProgram, "textureSampler");

    modelMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "modelMatrix");
    viewMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "viewMatrix");
    modelViewMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "modelViewMatrix");
    projectionMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "projectionMatrix");
    viewProjectionMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "viewProjectionMatrix");
    mvpMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "modelViewProjectionMatrix");
}

/**
 * Geometry Handling
 */

function createGeometry(type, vertices, indices) {

    const vertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    const indexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        type: type,
        vertexCount: indices.length,
        vertexBuffer: vertexBufferObject,
        indexBuffer: indexBufferObject
    };
}

function setCurrentGeometry(geometry) {
    currentGeometry = geometry;
}

/**
 * Texture Handling
 */

function createTexture(imgID) {
    const texture = new Texture();

    const textureObject = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureObject);

    const image = document.getElementById(imgID);

    const internalFormat = gl.RGBA;
    const srcFormat = gl.RGBA;

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, srcFormat, gl.UNSIGNED_BYTE, image);

    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

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

function assert(texture) {
    if (texture === null) {
        throw new Error("No texture is set.");
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
    const topMatrix = currentMatrixStack[currentMatrixStack.length - 1];
    currentMatrixStack.push(topMatrix);
}

function popMatrix() {
    if (currentMatrixStack.length === 0) {
        throw new Error("Cannot pop from an empty matrix stack.");
    }
    if (currentMatrixStack.length > 1) {
        currentMatrixStack.pop();
    } else {
        currentGeometry.push(mat4.create());
    }
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

function setLineWidth(lineWidth) {
    gl.lineWidth(lineWidth);
}

function enableFaceCulling() {
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);
}

function disableFaceCulling() {
    gl.disable(gl.CULL_FACE);
}

function enableDepthTest() {
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
}

function disableDepthTest() {
    gl.disable(gl.DEPTH_TEST);
}

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
        throw new Error("Geometry is not set.");
    }

    gl.useProgram(shaderProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, currentGeometry.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, currentGeometry.indexBuffer);

    let dataType = gl.FLOAT;
    let normalize = false;
    let stride = Float32Array.BYTES_PER_ELEMENT * 9;

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 3, dataType, normalize, stride, 0);

    gl.enableVertexAttribArray(colorAttributeLocation);
    gl.vertexAttribPointer(colorAttributeLocation, 4, dataType, normalize, stride, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(textureCoordinatesAttributeLocation);
    gl.vertexAttribPointer(textureCoordinatesAttributeLocation, 2, dataType, normalize, stride, 7 * Float32Array.BYTES_PER_ELEMENT);

    if (resolutionUniformLocation !== null) {
        gl.Uniform2f(resolutionUniformLocation, gl.canvas.clientWidth, gl.canvas.clientHeight);
    }

    if (timeUniformLocation !== null) {
        const time = (performance.now() - renderingStartTime) / 1000.0;
        gl.uniform1f(timeUniformLocation, time);
    }

    if (dtUniformLocation !== null) {
        gl.Uniform1f(dtUniformLocation, frameRenderingDeltaTime);
    }

    let textureEnabled = currentTexture !== null;
    if (textureEnabledUniformLocation !== null) {
        gl.uniform1i(textureEnabledUniformLocation, textureEnabled);
    }

    if (textureSamplerUniformLocation !== null) {
        gl.uniform1i(textureSamplerUniformLocation, 0);
    }

    if (textureTransformationMatrixUniformLocation !== null) {
        const textureMatrix = textureMatrixStack[textureMatrixStack.length - 1];
        gl.uniformMatrix4fv(textureTransformationMatrixUniformLocation, false, textureMatrix);
    }

    if (texturingModeUniformLocation !== null && currentTexture !== null) {
        gl.uniform1i(texturingModeUniformLocation, currentTexture.mode);//
    }

    if (modelMatrixUniformLocation !== null) {
        const modelMatrix = modelMatrixStack[modelMatrixStack.length - 1];
        gl.uniformMatrix4fv(modelMatrixUniformLocation, false, modelMatrix);
    }

    if (viewMatrixUniformLocation !== null) {
        const viewMatrix = mat4.create();
        mat4.invert(viewMatrix, viewMatrixStack[viewMatrixStack.length - 1]);
        gl.uniformMatrix4fv(viewMatrixUniformLocation, false, viewMatrix);
    }

    if (modelViewMatrixUniformLocation !== null) {
        const modelMatrix = modelMatrixStack[modelMatrixStack.length - 1];
        const viewMatrix = mat4.create();
        mat4.invert(viewMatrix, viewMatrixStack[viewMatrixStack.length - 1]);
        const modelViewMatrix = mat4.create();
        mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
    }

    if (projectionMatrixUniformLocation !== null) {
        const projectionMatrix = projectionMatrixStack[projectionMatrixStack.length - 1];
        gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);
    }

    if (viewProjectionMatrixUniformLocation !== null) {
        const viewMatrix = mat4.create();
        mat4.invert(viewMatrix, viewMatrixStack[viewMatrixStack.length - 1]);
        const projectionMatrix = projectionMatrixStack[projectionMatrixStack.length - 1];
        const viewProjectionMatrix = mat4.create();
        mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
        gl.uniformMatrix4fv(viewProjectionMatrixUniformLocation, false, viewProjectionMatrix);
    }

    if (mvpMatrixUniformLocation !== null) {
        const modelMatrix = modelMatrixStack[modelMatrixStack.length - 1];
        const viewMatrix = mat4.create();
        mat4.invert(viewMatrix, viewMatrixStack[viewMatrixStack.length - 1]);
        const projectionMatrix = projectionMatrixStack[projectionMatrixStack.length - 1];

        const modelViewProjectionMatrix = mat4.create();
        mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix);
        mat4.multiply(modelViewProjectionMatrix, modelViewProjectionMatrix, modelMatrix);
        gl.uniformMatrix4fv(
            mvpMatrixUniformLocation,
            false,
            modelViewProjectionMatrix
        );
    }
    gl.drawElements(currentGeometry.type, currentGeometry.vertexCount, gl.UNSIGNED_SHORT, 0);
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
        createShader,
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
        setLineWidth,
        enableDepthTest,
        enableFaceCulling,
        disableDepthTest,
        disableFaceCulling,
        prepareForRendering,
        prepareForRenderingFrame,
        renderCurrentGeometry,
        finishFrameRendering,

        //Objects

        geometryType,
        vertex,
        texturingMode,
        texturingWrapMode,
        textureFilteringType,
        matrixMode,

        //Variables

        PI,
        TWO_PI,
        HALF_PI,
        QUARTER_PI
    }

    global.asr = asr;
})(window);
