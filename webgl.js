function createProgramFromScripts(gl, shaderScriptIds, opt_attribs, opt_locations, opt_errorCallback) {
  const shaders = [];
  for (let ii = 0; ii < shaderScriptIds.length; ++ii) {
    shaders.push(createShaderFromScript(
        gl, shaderScriptIds[ii], gl[defaultShaderType[ii]], opt_errorCallback));
  }
  return createProgram(gl, shaders, opt_attribs, opt_locations, opt_errorCallback);
}
function error(msg) {
    if (topWindow.console) {
      if (topWindow.console.error) {
        topWindow.console.error(msg);
      } else if (topWindow.console.log) {
        topWindow.console.log(msg);
      }
    }
}

function loadShader(gl, shaderSource, shaderType, opt_errorCallback) {
    const errFn = opt_errorCallback || error;
    const shader = gl.createShader(shaderType);

    gl.shaderSource(shader, shaderSource);

    gl.compileShader(shader);

    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
        const lastError = gl.getShaderInfoLog(shader);
        errFn('*** Error compiling shader \'' + shader + '\':' + lastError + `\n` + shaderSource.split('\n').map((l,i) => `${i + 1}: ${l}`).join('\n'));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

const defaultShaderType = [
    'VERTEX_SHADER',
    'FRAGMENT_SHADER',
];

function createShaderFromScript(gl, scriptId, opt_shaderType, opt_errorCallback) {
    let shaderSource = '';
    let shaderType;
    const shaderScript = document.getElementById(scriptId);
    if (!shaderScript) {
        throw ('*** Error: unknown script element' + scriptId);
    }
    shaderSource = shaderScript.text;

    if (!opt_shaderType) {
        if (shaderScript.type === 'x-shader/x-vertex') {
        shaderType = gl.VERTEX_SHADER;
        } else if (shaderScript.type === 'x-shader/x-fragment') {
        shaderType = gl.FRAGMENT_SHADER;
        } else if (shaderType !== gl.VERTEX_SHADER && shaderType !== gl.FRAGMENT_SHADER) {
        throw ('*** Error: unknown shader type');
        }
    }

    return loadShader(gl, shaderSource, opt_shaderType ? opt_shaderType : shaderType, opt_errorCallback);
}

function createProgram(gl, shaders, opt_attribs, opt_locations, opt_errorCallback) {
  const errFn = opt_errorCallback || error;
  const program = gl.createProgram();
  shaders.forEach(function(shader) {
    gl.attachShader(program, shader);
  });
  if (opt_attribs) {
    opt_attribs.forEach(function(attrib, ndx) {
      gl.bindAttribLocation(
          program,
          opt_locations ? opt_locations[ndx] : ndx,
          attrib);
    });
  }
  gl.linkProgram(program);
  gl.validateProgram(program);

  // Check the link status
  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
      // something went wrong with the link
      const lastError = gl.getProgramInfoLog(program);
      errFn('Error in program linking:' + lastError);

      gl.deleteProgram(program);
      return null;
  }
  return program;
}

function init_program(gl, shaders) {
    if (!shaders || shaders.length <= 0) {
        return null;
    }

    const program = gl.createProgram();

    for (const shader in shaders) {
        gl.attachShader(program, shader);
    }

    gl.linkProgram(program);
    gl.validateProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        throw `could not compile WebGL program.\n\n${info}`;

        gl.deleteProgram(program);
        return null;
    }

    gl.useProgram(program);
}

var start_time;

var geometry = [];
var colors = [];
var offsets = [];

var tetrahedra_locations = [
                                             [-4, 0],
                                   [-3, -1], [-3, 0], [-3, 1],
                         [-2, -2], [-2, -1], [-2, 0], [-2, 1], [-2, 2],
               [-1, -3], [-1, -2], [-1, -1], [-1, 0], [-1, 1], [-1, 2], [-1, 3],
      [0, -4], [ 0, -3], [ 0, -2], [ 0, -1], [ 0, 0], [ 0, 1], [ 0, 2], [ 0, 3], [0, 4],
               [ 1, -3], [ 1, -2], [ 1, -1], [ 1, 0], [ 1, 1], [ 1, 2], [ 1, 3],
                         [ 2, -2], [ 2, -1], [ 2, 0], [ 2, 1], [ 2, 2],
                                   [ 3, -1], [ 3, 0], [ 3, 1],
                                             [ 4, 0]
];

function build_tetrahedron(tri_x, tri_y, size) {
    const sqrt2 = Math.SQRT2;
    const [x, y] = [tri_x, tri_y];
    const [center_x, center_y] = [2*x*size, 2*y*size];

    const vert0 = [center_x + size, center_y,        -size/sqrt2];
    const vert1 = [center_x - size, center_y,        -size/sqrt2];
    const vert2 = [center_x,        center_y + size,  size/sqrt2];
    const vert3 = [center_x,        center_y - size,  size/sqrt2];

    const vertices = [
        ...vert0, ...vert1, ...vert2,
        ...vert0, ...vert3, ...vert1,
        ...vert0, ...vert2, ...vert3,
        ...vert1, ...vert3, ...vert2,
    ];

    const colour0 = [200,  70, 120];
    const colour1 = [70,  200, 120];
    const colour2 = [200, 120,  70];
    const colour3 = [120,  70, 200];

    const colours = [
        ...colour0, ...colour0, ...colour0,
        ...colour1, ...colour1, ...colour1,
        ...colour2, ...colour2, ...colour2,
        ...colour3, ...colour3, ...colour3,
    ];
    
    return { vertices, colours };
}

function construct_triangle_matrices(side_length) {
    const len = side_length;
    const sqrt2 = Math.SQRT2;

    var geometry_local = [];
    var colors_local = [];
    var offsets_local = [];

    for (var i = 0; i < tetrahedra_locations.length; ++i) {
        const [xcoord, ycoord] = tetrahedra_locations[i];
        const tetrahedron = build_tetrahedron(xcoord, ycoord, len);

        geometry_local.push(...tetrahedron.vertices);
        colors_local.push(...tetrahedron.colours);
        
        const vert_per_tetrahedron = 12;
        offsets_local.push(xcoord, ycoord, 0);
        offsets_local.push(xcoord, ycoord, 0);
        offsets_local.push(xcoord, ycoord, 0);
        offsets_local.push(xcoord, ycoord, 0);
        offsets_local.push(xcoord, ycoord, 0);
        offsets_local.push(xcoord, ycoord, 0);
        offsets_local.push(xcoord, ycoord, 0);
        offsets_local.push(xcoord, ycoord, 0);
        offsets_local.push(xcoord, ycoord, 0);
        offsets_local.push(xcoord, ycoord, 0);
        offsets_local.push(xcoord, ycoord, 0);
        offsets_local.push(xcoord, ycoord, 0);
    }

    geometry = new Float32Array(geometry_local);
    colors = new Uint8Array(colors_local);
    offsets = new Float32Array(offsets_local);
}

function start() {
    start_time = new Date();
}

function get_time_since_start() {
    end_time = new Date();
    var time_diff = (end_time - start_time) / 1000.0;

    return time_diff;
}

const m4 = {
    projection: function(width, height, depth) {
        // Note: This matrix flips the Y axis so 0 is at the top.
        return [
            2 / width, 0, 0, 0,
            0, -2 / height, 0, 0,
            0, 0, 2 / depth, 0,
            -1, 1, 0, 1,
        ];
    },

    multiply: function(a, b) {
        var a00 = a[0 * 4 + 0];
        var a01 = a[0 * 4 + 1];
        var a02 = a[0 * 4 + 2];
        var a03 = a[0 * 4 + 3];
        var a10 = a[1 * 4 + 0];
        var a11 = a[1 * 4 + 1];
        var a12 = a[1 * 4 + 2];
        var a13 = a[1 * 4 + 3];
        var a20 = a[2 * 4 + 0];
        var a21 = a[2 * 4 + 1];
        var a22 = a[2 * 4 + 2];
        var a23 = a[2 * 4 + 3];
        var a30 = a[3 * 4 + 0];
        var a31 = a[3 * 4 + 1];
        var a32 = a[3 * 4 + 2];
        var a33 = a[3 * 4 + 3];
        var b00 = b[0 * 4 + 0];
        var b01 = b[0 * 4 + 1];
        var b02 = b[0 * 4 + 2];
        var b03 = b[0 * 4 + 3];
        var b10 = b[1 * 4 + 0];
        var b11 = b[1 * 4 + 1];
        var b12 = b[1 * 4 + 2];
        var b13 = b[1 * 4 + 3];
        var b20 = b[2 * 4 + 0];
        var b21 = b[2 * 4 + 1];
        var b22 = b[2 * 4 + 2];
        var b23 = b[2 * 4 + 3];
        var b30 = b[3 * 4 + 0];
        var b31 = b[3 * 4 + 1];
        var b32 = b[3 * 4 + 2];
        var b33 = b[3 * 4 + 3];

        return [
            b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
            b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
            b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
            b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
            b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
            b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
            b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
            b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
            b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
            b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
            b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
            b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
            b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
            b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
            b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
            b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
        ];
    },

    translation: function(tx, ty, tz) {
        return [
            1,  0,  0,  0,
            0,  1,  0,  0,
            0,  0,  1,  0,
            tx, ty, tz, 1,
        ];
    },

    xRotation: function(angleInRadians) {
        var c = Math.cos(angleInRadians);
        var s = Math.sin(angleInRadians);

        return [
            1, 0, 0, 0,
            0, c, s, 0,
            0, -s, c, 0,
            0, 0, 0, 1,
        ];
    },

    yRotation: function(angleInRadians) {
        var c = Math.cos(angleInRadians);
        var s = Math.sin(angleInRadians);

        return [
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1,
        ];
    },

    zRotation: function(angleInRadians) {
        var c = Math.cos(angleInRadians);
        var s = Math.sin(angleInRadians);

        return [
            c, s, 0, 0,
            -s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ];
    },

    scaling: function(sx, sy, sz) {
        return [
            sx, 0,  0,  0,
            0, sy,  0,  0,
            0,  0, sz,  0,
            0,  0,  0,  1,
        ];
    },

    translate: function(m, tx, ty, tz) {
        return m4.multiply(m, m4.translation(tx, ty, tz));
    },

    xRotate: function(m, angleInRadians) {
        return m4.multiply(m, m4.xRotation(angleInRadians));
    },

    yRotate: function(m, angleInRadians) {
        return m4.multiply(m, m4.yRotation(angleInRadians));
    },

    zRotate: function(m, angleInRadians) {
        return m4.multiply(m, m4.zRotation(angleInRadians));
    },

    scale: function(m, sx, sy, sz) {
        return m4.multiply(m, m4.scaling(sx, sy, sz));
    },
};

function update_canvas_size(canvas) {
    if (!canvas) {
        return;
    }
    const dpr = window.devicePixelRatio || 1.0;
    const newWidth = Math.round(canvas.clientWidth * dpr);
    const newHeight = Math.round(canvas.clientHeight * dpr);

    canvas.width = newWidth;
    canvas.height = newHeight;
}

var should_refresh_data = false;

function main() {
    var canvas = document.querySelector("#glcanvas");
    var gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    update_canvas_size(gl.canvas);

    const side_length = Math.min(canvas.clientWidth, canvas.clientHeight) / 15.0;
    construct_triangle_matrices(side_length);

    var program = createProgramFromScripts(gl, ["vertex", "fragment"]);

    var positionLocation = gl.getAttribLocation(program, "a_position");
    var colorLocation = gl.getAttribLocation(program, "a_color");
    var matrixLocation = gl.getUniformLocation(program, "u_matrix");
    var timeLocation = gl.getUniformLocation(program, "u_time");
    var sideLengthLocation = gl.getUniformLocation(program, "u_side_length");
    var offsetLocation = gl.getAttribLocation(program, "a_offset");

    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.STATIC_DRAW);

    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    var offsetBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, offsets, gl.STATIC_DRAW);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(program);

    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(positionLocation, size, type, normalize, stride, offset);

    gl.enableVertexAttribArray(colorLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    var size = 3;                 // 3 components per iteration
    var type = gl.UNSIGNED_BYTE;  // the data is 8bit unsigned values
    var normalize = true;         // normalize the data (convert from 0-255 to 0-1)
    var stride = 0;               // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;               // start at the beginning of the buffer
    gl.vertexAttribPointer(colorLocation, size, type, normalize, stride, offset);

    gl.enableVertexAttribArray(offsetLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
    var size = 3;
    var type = gl.FLOAT;
    var normalize = false;
    var stride = 0;
    var offset = 0;
    gl.vertexAttribPointer(offsetLocation, size, type, normalize, stride, offset);


    const translation = [canvas.clientWidth / 2.0, canvas.clientHeight / 2.0, 0];

    var matrix_base = m4.projection(gl.canvas.clientWidth, gl.canvas.clientHeight, 400);
    matrix_base = m4.translate(matrix_base, translation[0], translation[1], translation[2]);

    function render_loop(elapsed_time_ms) {
        if (should_refresh_data) {
            update_canvas_size(gl.canvas);

            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            const side_length = Math.min(canvas.clientWidth, canvas.clientHeight) / 15.0;
            construct_triangle_matrices(side_length);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            should_refresh_data = false;
        }
        const time = elapsed_time_ms / 1000.0;
        const rotation = [time, 0, 0];

        gl.uniformMatrix4fv(matrixLocation, false, matrix_base);
    
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = geometry.length / 3;
    
        gl.drawArrays(primitiveType, offset, count);

        gl.uniform1f(timeLocation, time);
        gl.uniform1f(sideLengthLocation, side_length);
        gl.drawArrays(primitiveType, offset, count);

        window.requestAnimationFrame(render_loop);
    }

    window.addEventListener("resize", handle_resize);

    window.requestAnimationFrame(render_loop);
}

// if the window is resized, signal to the next render loop that it should regenerate vertex data
function handle_resize() {
    should_refresh_data = true;
}

main();
