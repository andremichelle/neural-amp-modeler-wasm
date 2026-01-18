/**
 * @andremichelle/nam-wasm
 *
 * Neural Amp Modeler WASM with multi-instance support.
 * Designed for integration with Web Audio AudioWorklets.
 *
 * @license MIT
 */

export { NamWasmModule } from "./NamWasmModule.js"
export type {
    NamWasmExports,
    EmscriptenModule,
    EmscriptenModuleOptions,
    CreateNamModule
} from "./NamWasmModule.js"

export { NamModel } from "./NamModel.js"

export { default as createNamModule } from "./nam.js"
