/**
 * A WebGLRenderingContext
 */

let gl = null;

/**
 * Common Constants
 */

export const PI = Math.PI;
export const TWO_PI = 2.0 * Math.PI;
export const HALF_PI = 0.5 * Math.PI;
export const QUARTER_PI = 0.25 * Math.PI;

/* 
 * Geometry Types
 */

export function geometryType() {
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

export function vertex (x, y, z, r, g, b, a) {
    return {
        x:x, y:y, z:z,
        r:r, g:g, b:b, a:a
    };
}

/**
 * Transformation Types
 */
export function matrixMode() {
    return {
        Model: 'Model',
        View: 'View',
        Projection: 'Projection'
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

export function initializeWebGL() {
    const canvas = document.getElementById("webgl-canvas");
    gl = canvas.getContext("webgl");

    if (!gl) {
        console.error("Failed to initialize the WebGL loader.");
        return;
    }
    return true;
}

/**
 * Shader Program Handling
 */

export function createShader(vertexShader, fragmentShader) {
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

export function createGeometry(type, vertices, indices) {

    const vertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const indexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    let dataType = gl.FLOAT;
    let normalize = false;
    let stride = Float32Array.BYTES_PER_ELEMENT * 7;

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 3, dataType, normalize, stride, 0);
    gl.enableVertexAttribArray(colorAttributeLocation);
    gl.vertexAttribPointer(colorAttributeLocation, 4, dataType, normalize, stride, 3 * Float32Array.BYTES_PER_ELEMENT);

    return {
        type: type,
        vertexCount: indices.length,
    };
}

export function setCurrentGeometry(geometry) {
    currentGeometry = geometry;
}

/**
 * Transformation
 */

export function setMatrixMode(mode) {
    switch(mode) {
        case 'Model':
            currentMatrixStack = modelMatrixStack;
            break;
        case 'View':
            currentMatrixStack = viewMatrixStack;
            break;
        case 'Projection':
            currentMatrixStack = projectionMatrixStack;
            break;
        default:
            throw new Error("Invalid matrix mode");
    }

    return currentMatrixStack;
}

export function translateMatrix(translation) {
    const currentMatrix = currentMatrixStack[currentMatrixStack.length - 1];
    mat4.translate(currentMatrix, currentMatrix, translation);
    currentMatrixStack.pop();
    currentMatrixStack.push(currentMatrix);
}

export function rotateMatrix(rotation) {
    const currentMatrix = currentMatrixStack[currentMatrixStack.length - 1];

    mat4.rotate(currentMatrix, currentMatrix, rotation[1], vec3.fromValues(0.0, 1.0, 0.0));
    mat4.rotate(currentMatrix, currentMatrix, rotation[0], vec3.fromValues(1.0, 0.0, 0.0));
    mat4.rotate(currentMatrix, currentMatrix, rotation[2], vec3.fromValues(0.0, 0.0, 1.0));
    currentMatrixStack.pop();
    currentMatrixStack.push(currentMatrix);
}

export function scaleMatrix(scale) {
    const currentMatrix = currentMatrixStack[currentMatrixStack.length - 1];

    mat4.scale(currentMatrix, currentMatrix, scale);
    currentMatrixStack.pop();
    currentMatrixStack.push(currentMatrix);
}

export function getMatrix() {
    return currentMatrixStack[currentMatrixStack.length - 1];
}

export function getModelMatrix() {
    return modelMatrixStack[modelMatrixStack.length - 1];
}

export function getViewMatrix() {
    return viewMatrixStack[viewMatrixStack.length - 1];
}

export function getProjectionMatrix() {
    return projectionMatrixStack[projectionMatrixStack.length - 1];
}

export function setMatrix(matrix) {
    currentMatrixStack.pop();
    currentMatrixStack.push(matrix);
}

export function loadIdentityMatrix() {
    setMatrix(mat4.create());
}

export function  loadLookAtMatrix(position, target) {
    const up = [0.0, 1.0, 0.0];
    const lookAtMatrix = mat4.create();
    mat4.lookAt(lookAtMatrix, position, target, up);
    setMatrix(lookAtMatrix);
}

export function loadOrthographicProjectionMatrix(zoom, nearPlane, farPlane) {
    const aspectRatio = gl.canvas.clientWidth / gl.canvas.clientHeight;

    const left = -(zoom * aspectRatio);
    const right = zoom * aspectRatio;
    const bottom = -zoom;
    const top = zoom;

    const orthoMatrix = mat4.create();
    mat4.ortho(orthoMatrix, left, right, bottom, top, nearPlane, farPlane);
    setMatrix(orthoMatrix);
}

export function loadPerspectiveProjectionMatrix(fieldOfView, nearPlane, farPlane) {
    const aspectRatio = gl.canvas.clientWidth / gl.canvas.clientHeight;;

    const perspectiveMatrix = mat4.create();
    mat4.perspective(perspectiveMatrix, fieldOfView, aspectRatio, nearPlane, farPlane);
    currentMatrixStack.pop();
    currentMatrixStack.push(perspectiveMatrix);
}

export function pushMatrix() {
    const topMatrix = currentMatrixStack[currentMatrixStack.length - 1];
    currentMatrixStack.push(topMatrix);
}

export function popMatrix() {
    if(currentMatrixStack.length === 0) {
        throw new Error("Cannot pop from an empty matrix stack.");
    }
    if(currentMatrixStack.length > 1) {
        currentMatrixStack.pop();
    } else {
        mat4.identity(currentMatrixStack[0]);
    }
}

export function clearMatrices() {
    while(currentMatrixStack.length > 0) currentMatrixStack.pop();
    const matrix = mat4.create();
    currentMatrixStack.push(matrix);
}

/**
 * Rendering
 */

export function setLineWidth(lineWidth) {
    gl.lineWidth(lineWidth);
}

export function enableFaceCulling() {
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);
}

export function disableFaceCulling() {
    gl.disable(gl.CULL_FACE);
}

export function enableDepthTest() {
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
}

export function disableDepthTest() {
    gl.disable(gl.DEPTH_TEST);
}

export function prepareForRendering() {
    gl.clearColor(0, 0, 0, 0);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    while(modelMatrixStack.length > 0) modelMatrixStack.pop();
    modelMatrixStack.push(mat4.create());

    while(viewMatrixStack.length > 0) viewMatrixStack.pop();
    viewMatrixStack.push(mat4.create());

    while(projectionMatrixStack.length > 0) projectionMatrixStack.pop();
    projectionMatrixStack.push(mat4.create());
    renderingStartTime = performance.now();
}

export function prepareForRenderingFrame() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

export function renderCurrentGeometry() {
    gl.useProgram(shaderProgram);

    if(timeUniformLocation !== null) {
        const time = (performance.now() - renderingStartTime) / 1000.0;
        gl.uniform1f(timeUniformLocation, time);
        requestAnimationFrame(renderCurrentGeometry);
    }

    if(mvpMatrixUniformLocation !== null) {
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
