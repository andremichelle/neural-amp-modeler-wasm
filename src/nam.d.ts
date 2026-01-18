import type { EmscriptenModule, EmscriptenModuleOptions } from "./NamWasmModule.js"

declare const createNamModule: (options?: EmscriptenModuleOptions) => Promise<EmscriptenModule>
export default createNamModule
