
/**
 * A WebGLRenderingContext
 */

let gl = null;


/**
 * Shader Data
 */
let shaderProgram = null;
let positionAttributeLocation = null;
let colorAttributeLocation = null;
let timeUniformLocation = null;


/**
 * Geometry Data
 */

let vertexShaderObject = null;
let fragmentShaderObject = null;
let geometryType = null;
let vertexCount = null;


/**
 * Utility Data
 */

let renderingStartTime = null;

export function initializeWebGL() {
    const canvas = document.getElementById("webgl-canvas");
    gl = canvas.getContext("webgl");

    if (!gl) {
        console.error("Failed to initialize the WebGL loader.");
        return;
    }
}

/* 
 * Geometry Types
 */

export function getGeometryType() {
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


/**
 * Shader Program Handling
 */

export function createShader(vertexShader, fragmentShader) {
    const vertexShaderSource = vertexShader;
    const fragmentShaderSource = fragmentShader;

    vertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShaderObject, vertexShaderSource);
    gl.compileShader(vertexShaderObject);
    if (!gl.getShaderParameter(vertexShaderObject, gl.COMPILE_STATUS)) {
        console.error("Failed to compile a vertex shader:", gl.getShaderInfoLog(vertexShaderObject));
        gl.deleteShader(vertexShaderObject);
        return null;
    }

    fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
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
}


/**
 * Geometry Handling 
 */

export function createGeometry(geometry, data, numberOfVertices) {
    vertexCount = numberOfVertices;
    geometryType = geometry;

    const bufferData = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferData);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    let type = gl.FLOAT;
    let normalize = false;
    let stride = Float32Array.BYTES_PER_ELEMENT * 7;

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 3, type, normalize, stride, 0);
    gl.enableVertexAttribArray(colorAttributeLocation);
    gl.vertexAttribPointer(colorAttributeLocation, 4, type, normalize, stride, Float32Array.BYTES_PER_ELEMENT * 3);
}


/**
 * Rendering
 */

export function prepareForRendering() {
    gl.clearColor(0, 0, 0, 0);
    renderingStartTime = performance.now();
}

export function renderNextFrame() {
    const time = (performance.now() - renderingStartTime) / 1000.0;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(shaderProgram);
    gl.uniform1f(timeUniformLocation, time);
    gl.drawArrays(geometryType, 0, vertexCount);
    requestAnimationFrame(renderNextFrame);
}
