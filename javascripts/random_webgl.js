/*
    Copyright (C) 2015  Joulesmith Energy Technologies, LLC

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

define(['utilities'], function (util){
    "use strict";

    var exports = {};


    exports.makeRandom = function(spec) {
        util.validate_object(spec, {
            height : 'number',
            width : 'number'
        });

        var out = {};

        var i, j, k;

        // create canvas element for webgl to work on
        var canvas = document.createElement("CANVAS");
        canvas.id = "webgl_canvas_CylindricalParticlePusher";
        canvas.width = spec.width;
        canvas.height = spec.height;
        canvas.style.display = "none";

        document.body.appendChild(canvas);
        out.canvas = canvas;

        var webgl = util.webGL(canvas);

        webgl.enableFloatTexture();

        var n_numbers = spec.width * spec.height;

        var vertex_positions = webgl.addVertexData([
            [-1, 1],
            [1, 1],
            [-1, -1],
            [-1, -1],
            [1, 1],
            [1, -1]
        ]);

        var render_vertex_positions = webgl.addVertexData([
            [-1, -1],
            [1, -1],
            [-1, 1],
            [-1, 1],
            [1, -1],
            [1, 1]
        ]);

        // texture coordinets for vertices
        var texture_coordinates = webgl.addVertexData([
            [0.0,  1.0],
            [1.0,  1.0],
            [0.0,  0.0],
            [0.0,  0.0],
            [1.0,  1.0],
            [1.0,  0.0]
        ]);

        var render_texture_coordinates = webgl.addVertexData([
            [0.0,  0.0],
            [1.0,  0.0],
            [0.0,  1.0],
            [0.0,  1.0],
            [1.0,  0.0],
            [1.0,  1.0]
        ]);

        // source of entropy for pseudo-random numbers
        var n_entropy = 1024;
        var entropy_arr = new Float32Array(4 * n_entropy * n_entropy);

        var random_bytes = new Uint32Array(4);

        // initialize entropy values
        for(i = 0; i < n_entropy * n_entropy; i++) {

            window.crypto.getRandomValues(random_bytes);
            entropy_arr[4 * i] = random_bytes[0] / 0xFFFFFFFF;
            entropy_arr[4 * i + 1] = random_bytes[1] / 0xFFFFFFFF;
            entropy_arr[4 * i + 2] = random_bytes[2] / 0xFFFFFFFF;
            entropy_arr[4 * i + 3] = random_bytes[3] / 0xFFFFFFFF;
        }

        var entropy_tex = webgl.addTextureArray({
            width : n_entropy,
            height : n_entropy,
            array : entropy_arr,
            useFloat : true
        });

        // time dependant random numbers per particle
        var rand_arr = new Float32Array(4 * n_numbers);

        // initialize random values
        for(i = 0; i < n_numbers; i++) {
            rand_arr[4 * i] = Math.random();
            rand_arr[4 * i + 1] = Math.random();
            rand_arr[4 * i + 2] = Math.random();
            rand_arr[4 * i + 3] = Math.random();
        }

        var rand_tex = webgl.addTextureArray({
            width : spec.width,
            height : spec.height,
            array : rand_arr,
            useFloat : true
        });

        var rand_A = webgl.addFrameBuffer({
            width :spec.width,
            height: spec.height,
            useFloat: true
        });

        var rand_B = webgl.addFrameBuffer({
            width :spec.width,
            height: spec.height,
            useFloat: true
        });

        //
        // General shader to compute a texture frame buffer.
        //
        var precompute_vert = function() {
            var src_arr = [
                "attribute vec2 a_position;",
                "attribute vec2 a_texCoord;",
                "varying vec2 v_texCoord;",

                "void main() {",
                "    gl_Position = vec4(a_position, 0, 1);",

                "    v_texCoord = a_texCoord;",
                "}",
            ];

            return src_arr.join('\n');
        }; // precompute_vert()


        // ---------------------------------------------------------------------
        // computes value of rand_B
        var programStepRandB = webgl.linkProgram({
            vertexShaderSource : precompute_vert(),
            fragmentShaderSource : (function() {
                var src_arr = [
                    "precision highp float;",

                    // source of entropy
                    "uniform sampler2D u_entropy;",

                    // current random
                    "uniform sampler2D u_rand;",

                    // the texCoords passed in from the vertex shader.
                    "varying vec2 v_texCoord;",

                    "void main() {",

                        "vec4 rand = texture2D(u_rand, v_texCoord);",
                        "vec2 x = rand.zw;",
                        "vec4 s = texture2D(u_entropy, x);",

                        "x = 0.999 * x + 0.001 * s.zw;",
                        //
                        "gl_FragColor = vec4(s.y, s.x, 4.0 * x * (1.0 - x));",


                    "}"
                ];

                return src_arr.join('\n');
            })()
        });

        programStepRandB.set({
            "a_position" : vertex_positions,
            "a_texCoord" : texture_coordinates,
            "u_entropy" : entropy_tex,
            "u_rand" : rand_A
        });



        // ---------------------------------------------------------------------
        // computes value of rand_A
        var programStepRandA = webgl.linkProgram({
            vertexShaderSource : precompute_vert(),
            fragmentShaderSource : (function() {
                var src_arr = [
                    "precision highp float;",

                    // source of entropy
                    "uniform sampler2D u_entropy;",

                    // current random
                    "uniform sampler2D u_rand;",

                    // the texCoords passed in from the vertex shader.
                    "varying vec2 v_texCoord;",

                    "void main() {",

                        "vec4 rand = texture2D(u_rand, v_texCoord);",
                        "vec2 x = rand.zw;",
                        "vec4 s = texture2D(u_entropy, x);",

                        "x = 0.999 * x + 0.001 * s.zw;",
                        "gl_FragColor = vec4(s.x, s.y, 4.0 * x * (1.0 - x));",


                    "}"
                ];

                return src_arr.join('\n');
            })()
        });

        programStepRandA.set({
            "a_position" : vertex_positions,
            "a_texCoord" : texture_coordinates,
            "u_entropy" : entropy_tex,
            "u_rand" : rand_B
        });

        // ---------------------------------------------------------------------
        // program for setting value of particles
        //
        var programSet = webgl.linkProgram({
            vertexShaderSource : precompute_vert(),
            fragmentShaderSource : (function() {
                var src_arr = [
                    "precision mediump float;",

                    "uniform sampler2D u_value;",
                    // the texCoords passed in from the vertex shader.
                    "varying vec2 v_texCoord;",

                    "void main() {",
                        "gl_FragColor = texture2D(u_value, v_texCoord);",
                    "}"
                ];

                return src_arr.join('\n');
            })()
        });

        programSet.set({
            "a_position" : vertex_positions,
            "a_texCoord" : texture_coordinates
        });

        // ---------------------------------------------------------------------
        // initialize random values

        programSet.set({"u_value" : rand_tex});

        programSet.draw({
            triangles : 6,
            target : rand_A
        });

        out.step = function () {

            programStepRandB.draw({
                triangles : 6,
                target : rand_B
            });


            programStepRandA.draw({
                triangles : 6,
                target : rand_A
            });

        };

        out.render = function() {

            programSet.set({"u_value" : rand_A});
            programSet.draw({
                triangles : 6
            });

        };

        return out;
    };

    return exports;
});
