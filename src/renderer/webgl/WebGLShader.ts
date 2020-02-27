import WebGLShaderProgram from "./WebGLShaderProgram";
import Shader from "../../tree/Shader";
import CoreContext from "../../tree/core/CoreContext";
import WebGLCoreQuadOperation from "./WebGLCoreQuadOperation";

export default class WebGLShader extends Shader {
    vertexShaderSource: string;
    fragmentShaderSource: string;

    private _initialized: boolean;

    private readonly _program: WebGLShaderProgram;
    gl: WebGLRenderingContext;

    constructor(ctx: CoreContext) {
        super(ctx);

        this._initialized = false;

        const stage = ctx.stage;

        this._program = stage.renderer.shaderPrograms.get(this.constructor);
        if (!this._program) {
            this._program = new WebGLShaderProgram(
                this.constructor.prototype.vertexShaderSource,
                this.constructor.prototype.fragmentShaderSource
            );

            // Let the vbo context perform garbage collection.
            stage.renderer.shaderPrograms.set(this.constructor, this._program);
        }

        this.gl = stage.gl;
    }

    get glProgram() {
        return this._program.glProgram;
    }

    protected _init() {
        if (!this._initialized) {
            this.initialize();
            this._initialized = true;
        }
    }

    initialize() {
        this._program.compile(this.gl);
    }

    get initialized() {
        return this._initialized;
    }

    protected _uniform(name: string) {
        return this._program.getUniformLocation(name);
    }

    protected _attrib(name: string) {
        return this._program.getAttribLocation(name);
    }

    protected _setUniform(name: string, value: any, glFunction: Function) {
        this._program.setUniformValue(name, value, glFunction);
    }

    useProgram() {
        this._init();
        this.gl.useProgram(this.glProgram);
        this.beforeUsage();
        this.enableAttribs();
    }

    stopProgram() {
        this.afterUsage();
        this.disableAttribs();
    }

    hasSameProgram(other: WebGLShader) {
        // For performance reasons, we first check for identical references.
        return other && (other === this || other._program === this._program);
    }

    beforeUsage() {
        // Override to set settings other than the default settings (blend mode etc).
    }

    afterUsage() {
        // All settings changed in beforeUsage should be reset here.
    }

    enableAttribs() {}

    disableAttribs() {}

    getExtraAttribBytesPerVertex() {
        return 0;
    }

    getVertexAttribPointerOffset(operation: WebGLCoreQuadOperation) {
        return operation.extraAttribsDataByteOffset - (operation.index + 1) * 4 * this.getExtraAttribBytesPerVertex();
    }

    setExtraAttribsInBuffer(operation: WebGLCoreQuadOperation) {
        // Set extra attrib data in in operation.quads.data/floats/uints, starting from
        // operation.extraAttribsBufferByteOffset.
    }

    setupUniforms(operation: WebGLCoreQuadOperation) {
        // Set all shader-specific uniforms.
        // Notice that all uniforms should be set, even if they have not been changed within this shader instance.
        // The uniforms are shared by all shaders that have the same type (and shader program).
    }

    protected _getProjection(operation: WebGLCoreQuadOperation) {
        return operation.getProjection();
    }

    getFlipY(operation: WebGLCoreQuadOperation) {
        return this._getProjection(operation)[1] < 0;
    }

    beforeDraw(operation: WebGLCoreQuadOperation) {}

    draw(operation: WebGLCoreQuadOperation) {}

    afterDraw(operation: WebGLCoreQuadOperation) {}

    cleanup() {
        this._initialized = false;
        // Program takes little resources, so it is only destroyed when the full stage is destroyed.
    }
}
