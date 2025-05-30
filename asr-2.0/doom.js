"use strict";

const constVertexShaderSource = `
    attribute vec4 position;
    attribute vec4 color;
    attribute vec4 textureCoordinates;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform vec4 emissionColor;
    uniform float pointSize;

    uniform bool textureEnabled;
    uniform bool textureTransformationEnabled;
    uniform mat4 textureTransformationMatrix;

    varying vec4 fragmentColor;
    varying vec4 fragmentViewPosition;
    varying vec2 fragmentTextureCoordinates;

    void main() {
        vec4 viewPosition = modelViewMatrix * position;
        fragmentViewPosition = viewPosition;
        fragmentColor = color * emissionColor;

        if(textureEnabled) {
            vec4 transformedTextureCoordinates = textureTransformationMatrix * vec4(textureCoordinates.st, 0.0, 1.0);
            fragmentTextureCoordinates = transformedTextureCoordinates.st;
        } else {
            fragmentTextureCoordinates = textureCoordinates.st;
        }

        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = pointSize;
    }
`;

const constFragmentShaderSource = `
    precision mediump float;

    #define DIRECTIONAL_LIGHT_COUNT  1
    #define POINT_LIGHT_COUNT        1
    #define SPOT_LIGHT_COUNT         1

    #define TEXTURING_MODE_ADDITION              0
    #define TEXTURING_MODE_SUBTRACTION           1
    #define TEXTURING_MODE_REVERSE_SUBTRACTION   2
    #define TEXTURING_MODE_MODULATION            3
    #define TEXTURING_MODE_DECALING              4

    #define FOG_TYPE_LINEAR                 0
    #define FOG_TYPE_EXPONENTIAL            1
    #define FOG_TYPE_EXPONENTIAL_SQUARED    2

    #define FOG_DEPTH_PLANAR            0
    #define FOG_DEPTH_PLANAR_ABSOLUTE   1
    #define FOG_DEPTH_RADIAL            2

    uniform bool textureEnabled;
    uniform sampler2D textureSampler;
    uniform int texturingMode;

    uniform bool fogEnabled;
    uniform int fogType;
    uniform int fogDepth;
    uniform vec3 fogColor;
    uniform float fogFarMinusNearPlane;
    uniform float fogFarPlane;
    uniform float fogDensity;

    varying vec4 fragmentViewPosition;
    varying vec4 fragmentColor;
    varying vec2 fragmentTextureCoordinates;

    void main() {
        gl_FragColor = fragmentColor;

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

        if (fogEnabled) {
            float fragmentDepth;
            if (fogDepth == FOG_DEPTH_PLANAR) {
                fragmentDepth = -(fragmentViewPosition.z / fragmentViewPosition.w);
            } else if (fogDepth == FOG_DEPTH_PLANAR_ABSOLUTE) {
                fragmentDepth = abs(fragmentViewPosition.z / fragmentViewPosition.w);
            } else if (fogDepth == FOG_DEPTH_RADIAL) {
                fragmentDepth = length(fragmentViewPosition.xyz / fragmentViewPosition.w);
            }

            float fragmentFogFactor;
            if (fogType == FOG_TYPE_LINEAR) {
                fragmentFogFactor = (fogFarPlane - fragmentDepth) / fogFarMinusNearPlane;
            } else if (fogType == FOG_TYPE_EXPONENTIAL) {
                fragmentFogFactor = exp(-1.0 * (fragmentDepth * fogDensity));
            } else if (fogType == FOG_TYPE_EXPONENTIAL_SQUARED) {
                fragmentFogFactor = fragmentDepth * fogDensity;
                fragmentFogFactor = exp(-(fragmentFogFactor * fragmentFogFactor));
            }
            fragmentFogFactor = clamp(fragmentFogFactor, 0.0, 1.0);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fragmentFogFactor);
        }        
    }
`;

const ROOM_WIDTH = 2.5;
const ROOM_LENGTH = 2.5;
const ROOM_HEIGHT = 0.5;
const SEGMENTS = 1;

const CAMERA_SPEED = 10.0;
const CAMERA_SENSITIVITY = 0.005;
const CAMERA_ROT_SPEED = 8.0;
const CAMERA_FOV = 1.13;
const CAMERA_NEAR_PLANE = 0.01;
const CAMERA_FAR_PLANE = 100.0;

let score = 0;
let health = 100;
let gameRunning = true;

const FORWARD = vec3.fromValues(0.0, 0.0, -1.0);
const RIGHT = vec3.fromValues(1.0, 0.0, 0.0);

class Enemy {

    static STATE = {
        ALIVE: 0,
        DYING: 1,
        DEAD: 2
    }

    constructor(position, size, speed, enemySpriteData, room) {
        this.position = vec3.clone(position);
        this.speed = speed;
        this.state = Enemy.STATE.ALIVE;
        this.room = room;

        this.material = asr.createMaterial(constVertexShaderSource, constFragmentShaderSource);

        this.texture = enemySpriteData.texture;

        this.textureFrame = 0;
        this.textureFrames = enemySpriteData.frameCount;
        this.firstDyingTextureFrame = enemySpriteData.firstDyingFrame;

        this.updateRequest = 0;
        this.updateRate = 10;

        this.target = null;

        const geomData = generateRectangleGeometryData(
            asr.geometryType().Triangles, size, size, SEGMENTS
        );
        this.geometry = asr.createGeometry(
            asr.geometryType().Triangles, geomData.rectangleVertices, geomData.rectangleIndices
        );

        this.boundingVolume = {
            center: vec3.clone(this.position),
            radius: size * 0.5,
        }
        this.boundingVolume.center[0] += size * 0.2;
    }

    setTarget(camera) { this.target = camera; }

    update(deltaTime) {
        if (this.state === Enemy.STATE.DEAD) return;

        if (++this.updateRequest % this.updateRate !== 0) return;

        if (this.state === Enemy.STATE.ALIVE) {
            this.textureFrame = (this.textureFrame + 1) % this.firstDyingTextureFrame;

            if (this.target) {
                const targetPosition = vec3.clone(this.target.position);
                targetPosition[1] = this.position[1];
                const direction = vec3.create();
                vec3.subtract(direction, targetPosition, this.position);
                vec3.normalize(direction, direction);
                const velocity = vec3.scale(vec3.create(), direction, this.speed);

                const newPosition = vec3.create();
                vec3.scaleAndAdd(newPosition, this.position, velocity, deltaTime);

                const resolvedPosition = this.room.resolveCollision(this.position, newPosition, this.boundingVolume.radius);
                vec3.copy(this.position, resolvedPosition);
                vec3.copy(this.boundingVolume.center, this.position);

                const toPlayer = vec3.create();
                vec3.subtract(toPlayer, this.position, this.target.position);
                const distance = vec3.length(toPlayer);

                if (distance < 0.2) {
                    health -= 10;
                    if (health < 0) health = 0;
                    updateDisplay();
                }
            }
        } else if (this.state === Enemy.STATE.DYING) {
            vec3.copy(this.boundingVolume.center, this.position);
            this.textureFrame++;
            if (this.textureFrame >= this.textureFrames) {
                this.state = Enemy.STATE.DEAD;
            }
        }
    }

    intersectWithRay(ray) {
        const oc = vec3.create();
        vec3.subtract(oc, ray.origin, this.boundingVolume.center);

        const a = vec3.dot(ray.direction, ray.direction);
        const b = 2.0 * vec3.dot(oc, ray.direction);
        const c = vec3.dot(oc, oc) - this.boundingVolume.radius * this.boundingVolume.radius;
        const discriminant = b * b - 4.0 * a * c;

        return discriminant > 0;
    }

    kill() {
        if (this.state === Enemy.STATE.ALIVE) {
            this.state = Enemy.STATE.DYING;
            this.textureFrame = this.firstDyingTextureFrame;
            this.applyTextureTransform();
        }
    }

    applyTextureTransform() {
        const frameWidth = 1.0 / this.textureFrames;

        asr.setMatrixMode(asr.matrixMode().Texturing);
        asr.loadIdentityMatrix();
        asr.pushMatrix();
        asr.translateMatrix([this.textureFrame * frameWidth, 0, 0]);
        asr.scaleMatrix([frameWidth, 1.0, 1.0]);
    }

    getDistanceFromCamera(camera) {
        const distance = vec3.create();
        vec3.subtract(distance, this.position, camera.position);
        return vec3.length(distance);
    }

    render(camera) {
        if (this.state === Enemy.STATE.DEAD) return;

        asr.setMaterialCurrent(this.material);
        asr.setMaterialBlendingEnabled(true);
        asr.setMaterialFaceCullingEnabled(false);
        asr.setMaterialDepthTestEnabled(true);
        asr.setTextureCurrent(this.texture);
        asr.setMaterialParameter("emissionColor", vec4.fromValues(1.0, 1.0, 1.0, 1.0));

        this.applyTextureTransform();

        asr.setMatrixMode(asr.matrixMode().Model);
        asr.loadIdentityMatrix();
        asr.pushMatrix();
        asr.translateMatrix(this.position);

        this.billboardTowardCamera(camera);

        asr.setCurrentGeometry(this.geometry);
        asr.renderCurrentGeometry();
        asr.popMatrix();

        asr.setMatrixMode(asr.matrixMode().Texturing);
        asr.popMatrix();
    }

    billboardTowardCamera(camera) {
        const toCam = vec3.subtract(vec3.create(), camera.position, this.position);
        const angle = Math.atan2(toCam[0], toCam[2]);
        asr.rotateMatrix(vec3.fromValues(0, angle, 0));
    }
}

class Gun {

    static STATE = {
        IDLING: 0,
        SHOOTING: 1
    }

    constructor(postion, size, target, gunSpriteData) {
        this.position = vec3.clone(postion);
        this.size = size;
        this.state = Gun.STATE.IDLING;

        this.material = asr.createMaterial(constVertexShaderSource, constFragmentShaderSource);

        this.texture = gunSpriteData.texture;

        this.textureFrame = 0;
        this.textureFrames = gunSpriteData.frameCount;

        this.updateRequest = 0;
        this.updateRate = 6;

        this.target = vec3.clone(target);

        const geomData = generateRectangleGeometryData(asr.geometryType().Triangles, 6, 2, SEGMENTS);

        this.geometry = asr.createGeometry(asr.geometryType().Triangles,
            geomData.rectangleVertices, geomData.rectangleIndices);

        this.offset = vec3.fromValues(0.0, 0.1, -1.2);
        this.scale = vec3.fromValues(1.0 / this.textureFrames, 1.0, 1.0);

    }
    update() {
        if (this.state === Gun.STATE.SHOOTING) {
            if (++this.updateRequest % this.updateRate !== 0) return;

            this.textureFrame++;
            if (this.textureFrame >= this.textureFrames) {
                this.state = Gun.STATE.IDLING;
                this.textureFrame = 0;
            }
        }
    }

    shoot(enemies, camera, audio) {
        if (this.state === Gun.STATE.SHOOTING) return;

        this.state = Gun.STATE.SHOOTING;
        this.textureFrame = 1;

        const forward = vec3.fromValues(
            Math.sin(camera.rotation[1]),
            0,
            Math.cos(camera.rotation[1])
        );

        const ray = {
            origin: vec3.clone(camera.position),
            direction: vec3.normalize(vec3.create(), forward)
        };

        for (const enemy of enemies) {
            if (!enemy.intersectWithRay(ray)) continue;
            if (enemy.state === Enemy.STATE.ALIVE && enemy.intersectWithRay(ray)) {
                audio.currentTime = 0;
                audio.play();
                enemy.kill();
                score += 100;
                updateDisplay(score);
                break;
            }
        }
    }

    applyTextureTransform() {
        const frameWidth = 1.0 / this.textureFrames;
        asr.setMatrixMode(asr.matrixMode().Texturing);
        asr.pushMatrix();
        asr.loadIdentityMatrix();
        asr.translateMatrix([this.textureFrame * frameWidth, 0, 0]);
        asr.scaleMatrix([frameWidth, 1.0, 1.0]);
    }

    render(camera) {
        asr.setMaterialCurrent(this.material);
        asr.setTextureCurrent(this.texture);
        asr.setMaterialParameter("emissionColor", vec4.fromValues(1.0, 1.0, 1.0, 1.0));
        asr.setMaterialBlendingEnabled(true);

        this.applyTextureTransform();

        asr.setMatrixMode(asr.matrixMode().Model);
        asr.pushMatrix();
        asr.loadIdentityMatrix();

        const yaw = camera.rotation[1];
        const forward = vec3.fromValues(Math.sin(yaw), 0, Math.cos(yaw));
        const right = vec3.fromValues(forward[2], 0, -forward[0]);

        const offset = vec3.create();
        vec3.scaleAndAdd(offset, offset, forward, -1.2);
        vec3.scaleAndAdd(offset, offset, right, 0.3);
        vec3.scaleAndAdd(offset, offset, vec3.fromValues(0, -0.4, 0), 1);

        vec3.add(offset, camera.position, offset);
        asr.translateMatrix(this.offset);
        asr.scaleMatrix(this.scale);

        asr.setCurrentGeometry(this.geometry);
        asr.renderCurrentGeometry();
        asr.popMatrix();

        asr.setMatrixMode(asr.matrixMode().Texturing);
        asr.popMatrix();
    }
}

class Room {
    constructor(width, height, length, segments, texture) {
        this.width = width;
        this.height = height;
        this.length = length;
        this.segments = segments;
        this.texture = texture;

        this.material = asr.createMaterial(constVertexShaderSource, constFragmentShaderSource);

        this.walls = [
            { type: 'vertical', x: -width / 2, z1: -length / 2, z2: length / 2 },    // left wall
            { type: 'vertical', x: width / 2, z1: -length / 2, z2: length / 2 },     // right wall
            { type: 'horizontal', z: -length / 2, x1: -width / 2, x2: width / 2 },   // back wall
            { type: 'horizontal', z: length / 2, x1: -width / 2, x2: width / 2 },    // front wall

            { type: 'vertical', x: width / 6, z1: -width + 1.0, z2: width / 2 - 0.5 },         // internal wall 1
            { type: 'horizontal', z: width / 2 - 0.5, x1: -width / 3, x2: width / 12 + 0.22 }, // internal wall 2
            { type: 'vertical', x: -width / 3, z1: -width + 1.75, z2: width / 2 - 0.45 },       // internal wall 3
        ];

        // Ground (Y-aligned)
        const ground = generateRectangleGeometryData(
            asr.geometryType().Triangles, this.width, this.length, this.segments,
        );
        this.groundGeometry = asr.createGeometry(
            asr.geometryType().Triangles, ground.rectangleVertices, ground.rectangleIndices
        );

        // Wall (X-aligned)
        const wallX = generateRectangleGeometryData(
            asr.geometryType().Triangles, this.length, this.height, this.segments,
        );
        this.wallGeometryX = asr.createGeometry(
            asr.geometryType().Triangles, wallX.rectangleVertices, wallX.rectangleIndices
        );

        // Wall (Z-aligned)
        const wallZ = generateRectangleGeometryData(
            asr.geometryType().Triangles, this.width, this.height, this.segments,
        );
        this.wallGeometryZ = asr.createGeometry(
            asr.geometryType().Triangles, wallZ.rectangleVertices, wallZ.rectangleIndices
        );
    }

    checkCollision(position, radius = 0.1) {
        const x = position[0];
        const z = position[2];

        for (const wall of this.walls) {
            if (wall.type === 'vertical') {
                if (Math.abs(x - wall.x) < radius && z >= wall.z1 && z <= wall.z2) {
                    return true;
                }
            } else if (wall.type === 'horizontal') {
                if (Math.abs(z - wall.z) < radius && x >= wall.x1 && x <= wall.x2) {
                    return true;
                }
            }
        }
        return false;
    }

    resolveCollision(oldPosition, newPosition, radius = 0.1) {
        const resolvedPosition = vec3.clone(newPosition);

        const testX = vec3.fromValues(newPosition[0], newPosition[1], oldPosition[2]);
        if (this.checkCollision(testX, radius)) {
            resolvedPosition[0] = oldPosition[0];
        }

        const testZ = vec3.fromValues(resolvedPosition[0], newPosition[1], newPosition[2]);
        if (this.checkCollision(testZ, radius)) {
            resolvedPosition[2] = oldPosition[2];
        }

        return resolvedPosition;
    }

    helper(rectangle, rotate, translate, texture, scale = null) {
        asr.pushMatrix();
        asr.translateMatrix(translate);
        asr.rotateMatrix(rotate);
        if (scale !== null) {
            asr.scaleMatrix(scale);
        }
        asr.setCurrentGeometry(rectangle);
        asr.setTextureCurrent(texture);
        asr.renderCurrentGeometry();
        asr.popMatrix();
    }

    render() {
        asr.setMaterialCurrent(this.material);
        asr.setMaterialFaceCullingEnabled(false);
        asr.setMaterialDepthTestEnabled(true);
        asr.setMaterialParameter("emissionColor", [1.0, 1.0, 1.0, 1.0]);

        asr.setMatrixMode(asr.matrixMode().Model);

        // floor
        this.helper(this.groundGeometry, vec3.fromValues(asr.HALF_PI, 0.0, 0.0), vec3.fromValues(0.0, 0.0, 0.0), this.texture.asphalt2);

        // ceiling
        this.helper(this.groundGeometry, vec3.fromValues(-asr.HALF_PI, 0.0, 0.0), vec3.fromValues(0.0, ROOM_HEIGHT, 0.0), this.texture.asphalt2);

        // back wall
        this.helper(this.wallGeometryZ, vec3.fromValues(0.0, asr.PI, 0.0), vec3.fromValues(0.0, ROOM_WIDTH / 10, -ROOM_LENGTH / 2), this.texture.bricks);

        // front wall
        this.helper(this.wallGeometryZ, vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues(0.0, ROOM_WIDTH / 10, ROOM_LENGTH / 2), this.texture.bricks);

        // left wall
        this.helper(this.wallGeometryX, vec3.fromValues(0.0, -asr.HALF_PI, 0.0), vec3.fromValues(-ROOM_WIDTH / 2, ROOM_WIDTH / 10, 0.0), this.texture.bricks);

        // right wall
        this.helper(this.wallGeometryX, vec3.fromValues(0.0, asr.HALF_PI, 0.0), vec3.fromValues(ROOM_WIDTH / 2, ROOM_WIDTH / 10, 0.0), this.texture.bricks);


        // internal wall 1
        this.helper(this.wallGeometryZ, vec3.fromValues(0.0, -asr.HALF_PI, 0.0), vec3.fromValues(ROOM_WIDTH / 6, ROOM_WIDTH / 10, -0.25), this.texture.bricks, vec3.fromValues(0.8, 1.0, 1.0))

        // internal wall 2
        this.helper(this.wallGeometryZ, vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues(-ROOM_WIDTH / 12, ROOM_WIDTH / 10, 0.75), this.texture.bricks, vec3.fromValues(0.5, 1.0, 1.0))

        // internal wall 3
        this.helper(this.wallGeometryZ, vec3.fromValues(0.0, -asr.HALF_PI, 0.0), vec3.fromValues(-ROOM_WIDTH / 3, ROOM_WIDTH / 10, 0.0), this.texture.bricks, vec3.fromValues(0.6, 1.0, 1.0))

        // gate
        this.helper(this.wallGeometryZ, vec3.fromValues(0.0, -asr.HALF_PI, 0.0), vec3.fromValues(-ROOM_WIDTH / 3, ROOM_WIDTH / 10, -1.0), this.texture.moss, vec3.fromValues(0.2, 1.0, 1.0))

    }
}

function generateRectangleGeometryData(
    geometryType,
    width, height,
    segmentsCount,
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
    const segmentHeight = height / segmentsCount;

    const halfWidth = width * 0.5;
    const segmentWidth = width / segmentsCount;

    for (let i = 0; i <= segmentsCount; ++i) {
        let y = i * segmentHeight - halfHeight;
        let v = 1.0 - i / segmentsCount;
        for (let j = 0; j <= segmentsCount; ++j) {
            let x = j * segmentWidth - halfWidth;
            let u = j / segmentsCount;
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
        for (let i = 0; i < segmentsCount; ++i) {
            for (let j = 0; j < segmentsCount; ++j) {
                let indexA = i * (segmentsCount + 1) + j;
                let indexB = indexA + 1;
                let indexC = indexA + (segmentsCount + 1);
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

function updateDisplay(score) {
    const scoreElement = document.getElementById('score-value');
    const healthElement = document.getElementById('health-value');
    if (scoreElement) scoreElement.textContent = score;
    if (healthElement) healthElement.textContent = health;
}

function showGameMessage(message) {
    const overlay = document.getElementById("game-message");
    overlay.innerText = message;
    overlay.style.display = "block";
    gameRunning = false;
}

function main() {
    const canvas = asr.initializeWebGL();

    const audio = {
        background: new Audio(`data/audio/E1M1.ogg`),
        shotgun: new Audio(`data/audio/shotgun.wav`)
    }

    canvas.addEventListener("mousemove", () => {
        canvas.requestPointerLock();
    });

    // Textures

    const texture = {
        bricks: asr.createTexture(`data/images/Bricks076C_1K-JPG_Color.jpg`),
        asphalt1: asr.createTexture(`data/images/Asphalt031_1K-JPG_Color.jpg`),
        asphalt2: asr.createTexture(`data/images/Asphalt026B_1K-JPG_Color.jpg`),
        concrete: asr.createTexture(`data/images/Concrete043C_1K-JPG_Color.jpg`),
        ground: asr.createTexture(`data/images/Ground001_1K-JPG_Color.jpg`),
        gravel: asr.createTexture(`data/images/Gravel021_1K-JPG_Color.jpg`),
        moss: asr.createTexture(`data/images/Moss003_1K-JPG_Color.jpg`),
        cacodemon: asr.createTexture(`data/images/cacodemon.png`),
        gun: asr.createTexture(`data/images/gun.png`)
    }

    // Room

    const room = new Room(ROOM_WIDTH, ROOM_HEIGHT, ROOM_LENGTH, SEGMENTS, texture);

    // Enemies

    const enemiesSize = 0.2;
    const enemiesSpeed = 12.0;
    const enemyFrames = 10;
    const enemyDyingFirstFrame = 4;

    const enemySpriteData = {
        texture: texture.cacodemon,
        frameCount: enemyFrames,
        firstDyingFrame: enemyDyingFirstFrame
    }

    let enemies = [];

    const spawnZones = [
        {
            center: vec3.fromValues(1.0, 0.15, -1.0),
            size: vec2.fromValues(1.0, 2.5),
            triggered: false,
            x: 0.8, z: 1.0, y: ROOM_HEIGHT / 4,
            spawn: function (camera) {
                let delay = 2000;
                for (let i = 0; i < 4; ++i) {
                    setTimeout(() => {
                        const enemy = new Enemy(vec3.fromValues(this.x, this.y, this.z), enemiesSize, enemiesSpeed, enemySpriteData, room);
                        enemy.setTarget(camera);
                        enemies.push(enemy);
                        (i + 1) % 2 === 0 ? this.x -= 0.2 : this.x += 0.1;
                        this.z -= 0.3;
                    }, i * delay);
                }
            }
        },
        {
            center: vec3.fromValues(0.8, 0.15, 3.0),
            size: vec2.fromValues(0.5, 0.5),
            triggered: false,
            x: -1.0, z: 1.1, y: ROOM_HEIGHT / 4,
            spawn: function () {
                let delay = 3000;
                for (let i = 0; i < 4; ++i) {
                    setTimeout(() => {
                        const enemy = new Enemy(vec3.fromValues(this.x, this.y, this.z), enemiesSize, enemiesSpeed, enemySpriteData, room);
                        enemy.setTarget(camera);
                        enemies.push(enemy);
                        (i + 1) % 2 === 0 ? this.x -= 0.1 : this.x += 0.1;
                        this.z -= 0.1;
                    }, i * delay);

                }
            }
        },
        {
            center: vec3.fromValues(-1.0, 0.15, 1.0),
            size: vec2.fromValues(0.5, 0.5),
            triggered: false,
            x: -1.1, z: 0.2, y: ROOM_HEIGHT / 4,
            spawn: function () {
                let delay = 2000;
                for (let i = 0; i < 3; ++i) {
                    setTimeout(() => {
                        const enemy = new Enemy(vec3.fromValues(this.x, this.y, this.z), enemiesSize, enemiesSpeed, enemySpriteData, room);
                        enemy.setTarget(camera);
                        enemies.push(enemy);
                        (i + 1) % 2 === 0 ? this.x -= 0.1 : this.x += 0.1;
                        this.z -= 0.4;
                    }, i * delay);
                }
            }
        },
        {
            center: vec3.fromValues(-1.0, 0.15, -2.0),
            size: vec2.fromValues(0.5, 0.5),
            triggered: false,
            x: -0.4, z: 0.4, y: ROOM_HEIGHT / 4,
            spawn: function () {
                let delay = 2000;
                for (let i = 0; i < 6; ++i) {
                    setTimeout(() => {
                        const enemy = new Enemy(vec3.fromValues(this.x, this.y, this.z), enemiesSize, enemiesSpeed, enemySpriteData, room);
                        enemy.setTarget(camera);
                        enemies.push(enemy);
                        (i + 1) % 2 === 0 ? this.x -= 0.1 : this.x += 0.2;
                        this.z -= 0.2;
                    }, i * delay);
                }
                setTimeout(() => {
                    const enemy = new Enemy(vec3.fromValues(0.2, ROOM_HEIGHT / 2.5, 0.3), enemiesSize * 2, enemiesSpeed, enemySpriteData, room);
                    enemy.setTarget(camera);
                    enemies.push(enemy);
                }, delay * 4);
            }
        }
    ];

    function renderEnemies(camera) {
        const sortedEnemies = enemies.slice().sort((a, b) => {
            return b.getDistanceFromCamera(camera) - a.getDistanceFromCamera(camera);
        });

        sortedEnemies.forEach(enemy => {
            enemy.render(camera);
        });
    }

    // Gun

    const gunSize = 1.5;
    const gunFrames = 6;
    const gunSpriteData = {
        texture: texture.gun,
        frameCount: gunFrames
    }

    const target = vec2.fromValues(canvas.clientWidth / 2, canvas.clientHeight / 2);

    const gun = new Gun(vec3.fromValues(0.0, 0.0, 0.0), gunSize, target, gunSpriteData);

    asr.prepareForRendering();

    // Camera

    const camera = {
        position: vec3.fromValues(1.0, 0.15, -1.0),
        rotation: vec3.fromValues(0.0, asr.PI, 0.0)
    }

    function moveCamera(direction, deltaTime, isNegative) {
        let oldPosition = null;
        let newPosition = null;
        if (isNegative) {
            oldPosition = vec3.clone(camera.position);
            newPosition = vec3.create();
            vec3.scaleAndAdd(newPosition, oldPosition, direction, CAMERA_SPEED * deltaTime);
        } else {
            oldPosition = vec3.clone(camera.position);
            newPosition = vec3.create();
            vec3.scaleAndAdd(newPosition, oldPosition, direction, -CAMERA_SPEED * deltaTime);
        }

        const cameraRadius = 0.1;
        const resolvedPosition = room.resolveCollision(oldPosition, newPosition, cameraRadius);
        vec3.copy(camera.position, resolvedPosition);
    }

    function isPlayerInZone(pos, zone) {
        return (
            Math.abs(pos[0] - zone.center[0]) < zone.size[0] / 2 && Math.abs(pos[2] - zone.center[1]) < zone.size[1] / 2
        );
    }

    let dt = asr.getDeltaTime();
    const positive = true;
    const keys = asr.setKeysEventHandler();
    const mouse = asr.setMouseEventHandler(canvas);

    function updateCamera() {
        const yaw = camera.rotation[1];
        const rotateY = mat4.create();
        mat4.fromYRotation(rotateY, yaw);

        if (keys.isKeyPressed("w") || keys.isKeyPressed("ArrowUp")) {
            let move = vec3.create();
            vec3.transformMat4(move, FORWARD, rotateY);
            moveCamera(move, dt, positive);
        }
        if (keys.isKeyPressed("a") || keys.isKeyPressed("ArrowLeft")) {
            let move = vec3.create();
            vec3.transformMat4(move, RIGHT, rotateY);
            moveCamera(move, dt, !positive);
        }
        if (keys.isKeyPressed("s") || keys.isKeyPressed("ArrowDown")) {
            let move = vec3.create();
            vec3.transformMat4(move, FORWARD, rotateY);
            moveCamera(move, dt, !positive);
        }
        if (keys.isKeyPressed("d") || keys.isKeyPressed("ArrowRight")) {
            let move = vec3.create();
            vec3.transformMat4(move, RIGHT, rotateY);
            moveCamera(move, dt, positive);
        }
        if (keys.isKeyPressed("Escape")) {
            audio.background.pause();
            audio.background.currentTime = 0;
        }

        const deltaX = mouse.getMouseDeltaX();
        camera.rotation[1] -= deltaX * CAMERA_SENSITIVITY;

        requestAnimationFrame(updateCamera);
    }

    updateCamera();

    asr.setMatrix(asr.setMatrixMode(asr.matrixMode().Projection));
    asr.loadPerspectiveProjectionMatrix(CAMERA_FOV, CAMERA_NEAR_PLANE, CAMERA_FAR_PLANE);

    function render() {
        if (!gameRunning) return;

        audio.background.loop = true;
        audio.background.volume = 0.5;
        audio.background.play();

        asr.setMatrixMode(asr.matrixMode().View);
        asr.loadIdentityMatrix();
        asr.translateMatrix(camera.position);
        asr.rotateMatrix(camera.rotation);

        room.render();

        for (const zone of spawnZones) {
            if (!zone.triggered && isPlayerInZone(camera.position, zone)) {
                zone.spawn(camera);
                zone.triggered = true;
            }
        }

        enemies.forEach(e => e.update(dt, score));
        gun.update();

        renderEnemies(camera);

        asr.setMatrixMode(asr.matrixMode().View);
        asr.loadIdentityMatrix();
        gun.render(camera);

        const allEnemiesDead = enemies.every(e => e.state === Enemy.STATE.DEAD);
        if (allEnemiesDead && gameRunning && score >= 1000) {
            gameRunning = false;
            showGameMessage("You Win!");
        }

        if (mouse.isMouseDown()) {
            gun.shoot(enemies, camera, audio.shotgun, score)
        }

        if (health <= 0 && gameRunning) {
            gameRunning = false;
            showGameMessage("Game Over!");
            audio.background.pause();
        }

        asr.finishFrameRendering();
        requestAnimationFrame(render);
    }

    render();
}

main();
