/**
 * Neural Amp Modeler WASM Module TypeScript Wrapper
 *
 * Provides a clean TypeScript API for the multi-instance NAM WASM module.
 * Designed for use in Web Audio AudioWorklets.
 */

/**
 * Raw exports from the Emscripten-compiled WASM module
 */
export interface NamWasmExports {
    // Instance management
    _nam_createInstance(): number
    _nam_destroyInstance(id: number): void
    _nam_getInstanceCount(): number

    // Model management
    _nam_loadModel(id: number, jsonPtr: number): boolean
    _nam_unloadModel(id: number): void
    _nam_hasModel(id: number): boolean

    // Audio processing
    _nam_process(id: number, inputPtr: number, outputPtr: number, numFrames: number): void

    // Sample rate
    _nam_setSampleRate(rate: number): void
    _nam_getSampleRate(): number
    _nam_setMaxBufferSize(size: number): void
    _nam_getMaxBufferSize(): number

    // Model info
    _nam_getModelLoudness(id: number): number
    _nam_hasModelLoudness(id: number): boolean

    // State management
    _nam_reset(id: number): void

    // Memory management (from Emscripten)
    _malloc(size: number): number
    _free(ptr: number): void

    // Emscripten runtime methods
    stringToUTF8(str: string, outPtr: number, maxBytesToWrite: number): void
    lengthBytesUTF8(str: string): number
}

/**
 * Emscripten module interface
 */
export interface EmscriptenModule {
    HEAPF32: Float32Array
    HEAPU8: Uint8Array
    _nam_createInstance(): number
    _nam_destroyInstance(id: number): void
    _nam_getInstanceCount(): number
    _nam_loadModel(id: number, jsonPtr: number): boolean
    _nam_unloadModel(id: number): void
    _nam_hasModel(id: number): boolean
    _nam_process(id: number, inputPtr: number, outputPtr: number, numFrames: number): void
    _nam_setSampleRate(rate: number): void
    _nam_getSampleRate(): number
    _nam_setMaxBufferSize(size: number): void
    _nam_getMaxBufferSize(): number
    _nam_getModelLoudness(id: number): number
    _nam_hasModelLoudness(id: number): boolean
    _nam_reset(id: number): void
    _malloc(size: number): number
    _free(ptr: number): void
    stringToUTF8(str: string, outPtr: number, maxBytesToWrite: number): void
    lengthBytesUTF8(str: string): number
}

/**
 * Options for initializing the Emscripten module
 */
export interface EmscriptenModuleOptions {
    /** Pre-fetched WASM binary (avoids additional fetch) */
    wasmBinary?: ArrayBuffer
    /** Custom function to locate files (wasm, etc.) */
    locateFile?: (path: string, scriptDirectory: string) => string
}

/**
 * Factory function type for creating the Emscripten module
 */
export type CreateNamModule = (options?: EmscriptenModuleOptions) => Promise<EmscriptenModule>

/**
 * High-level wrapper around the NAM WASM module.
 * Handles memory management and provides a clean TypeScript API.
 */
export class NamWasmModule {
    readonly #module: EmscriptenModule

    // Pre-allocated buffers for audio processing (128 samples = Web Audio render quantum)
    readonly #inputPtr: number
    readonly #outputPtr: number
    readonly #bufferSize: number

    private constructor(module: EmscriptenModule, bufferSize: number = 128) {
        this.#module = module
        this.#bufferSize = bufferSize

        // Pre-allocate audio buffers (4 bytes per float32)
        this.#inputPtr = module._malloc(bufferSize * 4)
        this.#outputPtr = module._malloc(bufferSize * 4)

        if (this.#inputPtr === 0 || this.#outputPtr === 0) {
            throw new Error("Failed to allocate audio buffers")
        }
    }

    /**
     * Creates a NamWasmModule from an Emscripten module factory function.
     * Use this when loading the module dynamically.
     *
     * @param createModule The factory function exported by the Emscripten JS wrapper
     * @param bufferSize Size of pre-allocated audio buffers (default: 128)
     */
    static async create(createModule: CreateNamModule, bufferSize: number = 128): Promise<NamWasmModule> {
        const module = await createModule()
        return new NamWasmModule(module, bufferSize)
    }

    /**
     * Creates a NamWasmModule from an already-instantiated Emscripten module.
     * Use this when the module has already been created elsewhere.
     *
     * @param module Pre-instantiated Emscripten module
     * @param bufferSize Size of pre-allocated audio buffers (default: 128)
     */
    static fromModule(module: EmscriptenModule, bufferSize: number = 128): NamWasmModule {
        return new NamWasmModule(module, bufferSize)
    }

    /**
     * Disposes of the module and frees allocated memory.
     * Call this when done using the module.
     */
    dispose(): void {
        this.#module._free(this.#inputPtr)
        this.#module._free(this.#outputPtr)
    }

    /**
     * Creates a new NAM instance.
     * @returns Instance ID for use with other methods
     */
    createInstance(): number {
        return this.#module._nam_createInstance()
    }

    /**
     * Destroys a NAM instance and frees its resources.
     * @param id Instance ID
     */
    destroyInstance(id: number): void {
        this.#module._nam_destroyInstance(id)
    }

    /**
     * Returns the number of active instances.
     */
    getInstanceCount(): number {
        return this.#module._nam_getInstanceCount()
    }

    /**
     * Loads a NAM model from JSON string.
     * @param id Instance ID
     * @param modelJson JSON string containing the model
     * @returns true if successful
     */
    loadModel(id: number, modelJson: string): boolean {
        // Calculate required buffer size
        const byteLength = this.#module.lengthBytesUTF8(modelJson) + 1

        // Allocate temporary buffer for the JSON string
        const jsonPtr = this.#module._malloc(byteLength)
        if (jsonPtr === 0) {
            return false
        }

        try {
            // Copy string to WASM memory
            this.#module.stringToUTF8(modelJson, jsonPtr, byteLength)

            // Load the model
            return this.#module._nam_loadModel(id, jsonPtr)
        } finally {
            // Free the temporary buffer
            this.#module._free(jsonPtr)
        }
    }

    /**
     * Unloads the model from an instance.
     * @param id Instance ID
     */
    unloadModel(id: number): void {
        this.#module._nam_unloadModel(id)
    }

    /**
     * Checks if an instance has a model loaded.
     * @param id Instance ID
     */
    hasModel(id: number): boolean {
        return this.#module._nam_hasModel(id)
    }

    /**
     * Processes audio through a NAM instance.
     *
     * IMPORTANT: This method is optimized for real-time audio processing.
     * It uses pre-allocated buffers to avoid allocations during the audio callback.
     *
     * @param id Instance ID
     * @param input Input samples (mono)
     * @param output Output samples (mono) - will be filled with processed audio
     */
    process(id: number, input: Float32Array, output: Float32Array): void {
        const numFrames = Math.min(input.length, output.length, this.#bufferSize)

        // Copy input to WASM memory
        // HEAPF32 is indexed by float32 (4 bytes), so divide pointer by 4
        const inputOffset = this.#inputPtr >> 2
        const outputOffset = this.#outputPtr >> 2

        // Set input data
        this.#module.HEAPF32.set(input.subarray(0, numFrames), inputOffset)

        // Process
        this.#module._nam_process(id, this.#inputPtr, this.#outputPtr, numFrames)

        // Copy output from WASM memory
        output.set(this.#module.HEAPF32.subarray(outputOffset, outputOffset + numFrames))
    }

    /**
     * Processes audio in-place (input and output are the same buffer).
     * Slightly more efficient when you don't need to preserve the input.
     *
     * @param id Instance ID
     * @param buffer Audio buffer to process in-place
     */
    processInPlace(id: number, buffer: Float32Array): void {
        this.process(id, buffer, buffer)
    }

    /**
     * Sets the sample rate for all instances.
     * @param rate Sample rate in Hz
     */
    setSampleRate(rate: number): void {
        this.#module._nam_setSampleRate(rate)
    }

    /**
     * Gets the current sample rate.
     */
    getSampleRate(): number {
        return this.#module._nam_getSampleRate()
    }

    /**
     * Sets the maximum buffer size for processing.
     * Call this if using buffer sizes larger than 128 samples.
     * @param size Maximum buffer size in samples
     */
    setMaxBufferSize(size: number): void {
        this.#module._nam_setMaxBufferSize(size)
    }

    /**
     * Gets the current maximum buffer size.
     */
    getMaxBufferSize(): number {
        return this.#module._nam_getMaxBufferSize()
    }

    /**
     * Gets the loudness value of a loaded model.
     * @param id Instance ID
     * @returns Loudness in dB, or 0 if not available
     */
    getModelLoudness(id: number): number {
        return this.#module._nam_getModelLoudness(id)
    }

    /**
     * Checks if a model has loudness metadata.
     * @param id Instance ID
     */
    hasModelLoudness(id: number): boolean {
        return this.#module._nam_hasModelLoudness(id)
    }

    /**
     * Resets the internal state of a model instance.
     * Call this on transport stop or when starting a new audio region.
     * @param id Instance ID
     */
    reset(id: number): void {
        this.#module._nam_reset(id)
    }

    /**
     * Returns the pre-allocated buffer size.
     */
    get bufferSize(): number {
        return this.#bufferSize
    }
}
