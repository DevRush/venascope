// src/magnify/evm.ts
const VERT = `
attribute vec2 p; varying vec2 uv;
void main(){ uv = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p,0.0,1.0); }`

// Update pass: newFast = mix(prevFast, frame, aFast); newSlow = mix(prevSlow, frame, aSlow)
// We store fast in rgb of one target and slow in rgb of another, updated in two draws.
const EMA = `
precision mediump float; varying vec2 uv;
uniform sampler2D frame; uniform sampler2D prev; uniform float a;
void main(){ vec3 f = texture2D(frame, uv).rgb; vec3 p = texture2D(prev, uv).rgb;
  gl_FragColor = vec4(mix(p, f, a), 1.0); }`

// Display: out = frame + amplify*(fast - slow)
const SHOW = `
precision mediump float; varying vec2 uv;
uniform sampler2D frame; uniform sampler2D fast; uniform sampler2D slow; uniform float amp;
void main(){ vec3 f = texture2D(frame, uv).rgb;
  vec3 band = texture2D(fast, uv).rgb - texture2D(slow, uv).rgb;
  gl_FragColor = vec4(clamp(f + amp*band, 0.0, 1.0), 1.0); }`

function compile(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram {
  const mk = (type: number, src: string) => {
    const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader')
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, mk(gl.VERTEX_SHADER, vs))
  gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link')
  return prog
}

export class Magnifier {
  private emaProg: WebGLProgram
  private showProg: WebGLProgram
  private quad: WebGLBuffer
  private frameTex: WebGLTexture
  private fast!: { tex: WebGLTexture; fbo: WebGLFramebuffer }[]
  private slow!: { tex: WebGLTexture; fbo: WebGLFramebuffer }[]
  private fi = 0
  private si = 0
  private w = 0
  private h = 0
  private gl: WebGLRenderingContext

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl
    this.emaProg = compile(gl, VERT, EMA)
    this.showProg = compile(gl, VERT, SHOW)
    this.quad = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    this.frameTex = this.newTex()
  }

  private newTex(): WebGLTexture {
    const gl = this.gl, t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }

  private target(): { tex: WebGLTexture; fbo: WebGLFramebuffer } {
    const gl = this.gl, tex = this.newTex()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.w, this.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    const fbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    return { tex, fbo }
  }

  private ensureSize(w: number, h: number) {
    if (w === this.w && h === this.h) return
    this.w = w; this.h = h
    this.fast = [this.target(), this.target()]
    this.slow = [this.target(), this.target()]
    this.fi = 0; this.si = 0
  }

  private drawQuad(prog: WebGLProgram) {
    const gl = this.gl
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  render(source: TexImageSource, amplify: number, fastTau: number, slowTau: number): void {
    const gl = this.gl
    const w = (source as any).videoWidth || (source as any).width
    const h = (source as any).videoHeight || (source as any).height
    this.ensureSize(w, h)
    gl.bindTexture(gl.TEXTURE_2D, this.frameTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)

    const step = (bank: { tex: WebGLTexture; fbo: WebGLFramebuffer }[], idx: number, a: number) => {
      const prev = bank[idx], next = bank[idx ^ 1]
      gl.bindFramebuffer(gl.FRAMEBUFFER, next.fbo)
      gl.viewport(0, 0, this.w, this.h)
      gl.useProgram(this.emaProg)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.frameTex)
      gl.uniform1i(gl.getUniformLocation(this.emaProg, 'frame'), 0)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, prev.tex)
      gl.uniform1i(gl.getUniformLocation(this.emaProg, 'prev'), 1)
      gl.uniform1f(gl.getUniformLocation(this.emaProg, 'a'), a)
      this.drawQuad(this.emaProg)
      return idx ^ 1
    }
    this.fi = step(this.fast, this.fi, 1 / Math.max(fastTau, 1))
    this.si = step(this.slow, this.si, 1 / Math.max(slowTau, 1))

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.useProgram(this.showProg)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.frameTex)
    gl.uniform1i(gl.getUniformLocation(this.showProg, 'frame'), 0)
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.fast[this.fi].tex)
    gl.uniform1i(gl.getUniformLocation(this.showProg, 'fast'), 1)
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.slow[this.si].tex)
    gl.uniform1i(gl.getUniformLocation(this.showProg, 'slow'), 2)
    gl.uniform1f(gl.getUniformLocation(this.showProg, 'amp'), amplify)
    this.drawQuad(this.showProg)
  }
}
