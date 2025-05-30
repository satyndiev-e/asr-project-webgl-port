/**
 * A WebGLRenderingContext
 */

let gl = null;
let canvasToDisplaySizeMap = null;

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

function vertex(x, y, z, r, g, b, a) {
    return {
        x: x, y: y, z: z,
        r: r, g: g, b: b, a: a
    };
}

/**
 * Transformation Types
 */

function matrixMode() {
    return {
        Model: 0,
        View: 1,
        Projection: 2
    }
}

/**
 * Shader Data
 */

let shaderProgram = null;
let positionAttributeLocation = null;
let colorAttributeLocation = null;
let mvpMatrixUniformLocation = null;
let timeUniformLocation = null;

/**
 * Geometry Data
 */
let currentGeometry = null;

/**
 * Transformation Data
 */

const modelMatrixStack = [mat4.create()];
const viewMatrixStack = [mat4.create()];
const projectionMatrixStack = [mat4.create()];
let currentMatrixStack = [modelMatrixStack];

/**
 * Utility Data
 */

let renderingStartTime = null;

/**
 * Initialize WebGL
 */

function initializeWebGL(canvasWidth = null, canvasHeight = null) {
    const canvas = document.getElementById("webgl-canvas");
    gl = canvas.getContext("webgl");

    if (!gl) {
        console.error("Failed to initialize the WebGL loader.");
        return;
    }

    let screenWidth = canvasWidth !== null ? canvasWidth : window.innerWidth;
    let screenHeight = canvasHeight !== null ? canvasHeight : window.innerHeight;

    canvasToDisplaySizeMap = new Map([[canvas, [screenWidth, screenHeight]]]);
    
    function onResize(entries) {
        for (const entry of entries) {
            let width;
            let height;
            let dpr = window.devicePixelRatio;
            if (entry.devicePixelContentBoxSize) {
                width = entry.devicePixelContentBoxSize[0].inlineSize;
                height = entry.devicePixelContentBoxSize[0].blockSize;
                dpr = 1;
            } else if (entry.contentBoxSize) {
                if (entry.contentBoxSize[0]) {
                    width = entry.contentBoxSize[0].inlineSize;
                    height = entry.contentBoxSize[0].blockSize;
                } else {
                    width = entry.contentBoxSize.inlineSize;
                    height = entry.contentBoxSize.blockSize;
                }
            } else {
                width = entry.contentRect.width;
                height = entry.contentRect.height;
            }
            const displayWidth = Math.round(width * dpr);
            const displayHeight = Math.round(height * dpr);
            canvasToDisplaySizeMap.set(entry.target, [displayWidth, displayHeight]);
        }
    }

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(canvas, { box: 'content-box' });

    return true;
}


/**
 * Resize Canvas' size
 */

function resizeCanvasToDisplaySize(canvas) {
    const [displayWidth, displayHeight] = canvasToDisplaySizeMap.get(canvas);

    const needResize = canvas.width !== displayWidth ||
        canvas.height !== displayHeight;

    if (needResize) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }

    return needResize;
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
    timeUniformLocation = gl.getUniformLocation(shaderProgram, "time");
    mvpMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "modelViewProjectionMatrix");
}

/**
 * Geometry Handling
 */

function createGeometry(type, vertices, indices) {
    const vertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const indexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

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
    const aspectRatio = gl.canvas.clientWidth / gl.canvas.clientHeight;

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
        mat4.identity(currentMatrixStack[0]);
    }
}

function clearMatrices() {
    while (currentMatrixStack.length > 0) currentMatrixStack.pop();
    const matrix = mat4.create();
    currentMatrixStack.push(matrix);
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
    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    while (modelMatrixStack.length > 0) modelMatrixStack.pop();
    modelMatrixStack.push(mat4.create());

    while (viewMatrixStack.length > 0) viewMatrixStack.pop();
    viewMatrixStack.push(mat4.create());

    while (projectionMatrixStack.length > 0) projectionMatrixStack.pop();
    projectionMatrixStack.push(mat4.create());
    renderingStartTime = performance.now();
}

function prepareForRenderingFrame() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function renderCurrentGeometry() {
    if(currentGeometry === null) {
        throw new Error("Geometry is not set.");
    }
    
    gl.useProgram(shaderProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, currentGeometry.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, currentGeometry.indexBuffer);

    let dataType = gl.FLOAT;
    let normalize = false;
    let stride = Float32Array.BYTES_PER_ELEMENT * 7;

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 3, dataType, normalize, stride, 0);
    gl.enableVertexAttribArray(colorAttributeLocation);
    gl.vertexAttribPointer(colorAttributeLocation, 4, dataType, normalize, stride, 3 * Float32Array.BYTES_PER_ELEMENT);

    if (timeUniformLocation !== null) {
        const time = (performance.now() - renderingStartTime) / 1000.0;
        gl.uniform1f(timeUniformLocation, time);
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
        setMatrixMode,
        translateMatrix,
        rotateMatrix,
        scaleMatrix,
        getMatrix,
        getModelMatrix,
        getViewMatrix,
        getProjectionMatrix,
        setMatrix,
        loadIdentityMatrix,
        loadLookAtMatrix,
        loadOrthographicProjectionMatrix,
        loadPerspectiveProjectionMatrix,
        pushMatrix,
        popMatrix,
        clearMatrices,
        setLineWidth,
        enableDepthTest,
        enableFaceCulling,
        disableDepthTest,
        disableFaceCulling,
        prepareForRendering,
        prepareForRenderingFrame,
        renderCurrentGeometry,

        //Objects

        geometryType,
        vertex,
        matrixMode,

        //Variables

        PI,
        TWO_PI,
        HALF_PI,
        QUARTER_PI
    }

    global.asr = asr;
})(window);