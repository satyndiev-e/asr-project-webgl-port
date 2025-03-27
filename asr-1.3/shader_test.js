"use strict";

const vertexShaderSource = `
    attribute vec4 position;

    void main() {
        gl_Position = position;
    }
`;

// You can get any other shaders from http://glslsandbox.com/ to try here.
const fragmentShaderSource = `
    precision mediump float;

    uniform float time;
    uniform vec2 resolution;
    
    /**
    * Original shader from: https://www.shadertoy.com/view/3tyfWG
    */

    // --------[ Original ShaderToy begins here ]---------- //
    ////////////////////////////////////////////////////////////////////////////////
    //
    // yonatan's 3D fractal - A twitter user named yonatan/@zozuar posted a really
    // compelling animation and GLSL-snippet of a 3D-fractal the other day. I had to
    // get that into a fully working shader to see how much for a working shader was
    // still missing. The character-limit on twitter is hard :)
    //
    // Furthermore some people in the comments on the original post were missing
    // code-context and this my attempt to provide that. I provide a bit of
    // commentary in case people a bit unfamiliar with raymarching give it a read.
    //
    // See the function yonatansFractal() for all the details and references.
    //
    // Author(s):
    //   Mirco "MacSlow" Müller <macslow@gmail.com>
    //
    // This program is free software: you can redistribute it and/or modify it
    // under the terms of the GNU General Public License version 3, as published
    // by the Free Software Foundation.
    //
    // This program is distributed in the hope that it will be useful, but
    // WITHOUT ANY WARRANTY; without even the implied warranties of
    // MERCHANTABILITY, SATISFACTORY QUALITY, or FITNESS FOR A PARTICULAR
    // PURPOSE.  See the GNU General Public License for more details.
    //
    // You should have received a copy of the GNU General Public License along
    // with this program.  If not, see <http://www.gnu.org/licenses/>.
    //
    ////////////////////////////////////////////////////////////////////////////////

    // basic 2D-rotation matrix
    mat2 rotate2D (float rad)
    {
        float c = cos (rad);
        float s = sin (rad);
        return mat2 (c, s, -s, c);
    }

    // convert hue/saturation/value to RGB-color
    vec3 hsv(float h, float s, float v)
    {
        vec3 c = vec3 (h, s, v);
        vec4 k = vec4(1., 2./3., 1./3., 3.);
        vec3 p = abs(fract(c.xxx + k.xyz) * 6. - k.www);

        return c.z * mix(k.xxx, clamp(p - k.xxx, .0, 1.), c.y);
    }

    void yonatansFractal (float t, vec2 FC, vec2 r, inout vec3 o)
    {
        // yonatan/@zozuar's GLSL-snippet as posted on twitter...
        // just formatted a bit nicer, but otherwise untouched, see
        // https://twitter.com/zozuar/status/1367243732764876800
        // for reference
       float g=0., e, s, k = t*.1;
        for(float i=0.; i < 99.;++i) {
            vec3 p = vec3(g*(FC.xy - .5*r)/r.y + .5,g - 1.);
            p.xz *= rotate2D(k);
            s = 3.;
            for(int i=0; i < 9; ++i ) {
                s *= e = max(1.,(8.-8.*cos(k))/dot(p,p));
                p = vec3(2,4,2) - abs(abs(p)*e - vec3(4,4,2) );
            }
            g += min(length(p.xz), p.y)/s;
            s = log(s);
            o.rgb += hsv(s/15. + .5, .3, s/1e3);
        }
    }

    void mainImage( out vec4 fragColor, in vec2 fragCoord )
    {
        float t = time + 20.;   // offset the time thus the thumbnail looks not empty
        vec2 FC = fragCoord;     // pixel-coordinates
        vec3 o = vec3 (.0);      // rgb-output color
        vec2 r = resolution.xy; // resolution for point/ray-generation

        yonatansFractal(t, FC, r, o);

        // finally show it on screen
        fragColor = vec4(o, 1.);
    }
    // --------[ Original ShaderToy ends here ]---------- //


    void main() {
        mainImage(gl_FragColor, gl_FragCoord.xy);
    }
`;

const vertices = [
    //         Position         Normal         Color (RGBA)        Texture Coordinates (UV)
    asr.vertex(-1.0, -1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0),
    asr.vertex(1.0, -1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0),
    asr.vertex(-1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0),
    asr.vertex(1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0)
];

const quadGeometryVertices = new Float32Array(
    vertices.flatMap(v => [v.x, v.y, v.z, v.nx, v.ny, v.nz, v.r, v.g, v.b, v.a, v.u, v.v])
);

const quadGeometryIndices = new Uint16Array([0, 1, 2, 1, 3, 2]);

function main() {
    asr.initializeWebGL();

    const material = asr.createMaterial(vertexShaderSource, fragmentShaderSource);
    const geometry = asr.createGeometry(asr.geometryType().Triangles, quadGeometryVertices, quadGeometryIndices);

    asr.prepareForRendering();
    asr.setMaterialCurrent(material);

    function render() {
        asr.prepareForRenderingFrame();
        asr.setCurrentGeometry(geometry);
        asr.renderCurrentGeometry();

        asr.finishFrameRendering();
        requestAnimationFrame(render);
    }
    render();
}

main();
