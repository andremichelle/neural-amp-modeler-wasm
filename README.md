# @andremichelle/nam-wasm

Neural Amp Modeler WASM with multi-instance support for Web Audio integration.

Based on [Steven Atkinson's NeuralAmpModelerCore](https://github.com/sdatkinson/NeuralAmpModelerCore) and the [TONE3000 WASM port](https://github.com/tone-3000/neural-amp-modeler-wasm).

## Features

- **Multi-instance support** - Run multiple independent NAM models simultaneously
- **Optimized for AudioWorklets** - Minimal API designed for real-time audio processing
- **TypeScript support** - Full type definitions included
- **Small footprint** - ~200KB WASM binary

## Installation

```bash
npm install @andremichelle/nam-wasm
```

## Usage

### Basic Usage with TypeScript Wrapper

```typescript
import { createNamModule, NamWasmModule } from "@andremichelle/nam-wasm"

// Initialize the module
const emscriptenModule = await createNamModule()
const nam = NamWasmModule.fromModule(emscriptenModule)

// Set the sample rate (must match your AudioContext)
nam.setSampleRate(48000)

// Create an instance and load a model
const instanceId = nam.createInstance()
const modelJson = await fetch("model.nam").then(r => r.text())
const success = nam.loadModel(instanceId, modelJson)

// Process audio (in your AudioWorklet's process method)
nam.process(instanceId, inputBuffer, outputBuffer)

// Clean up when done
nam.destroyInstance(instanceId)
nam.dispose()
```

### AudioWorklet Integration

```typescript
// processor.ts - AudioWorklet processor
import { createNamModule, NamWasmModule } from "@andremichelle/nam-wasm"

class NamProcessor extends AudioWorkletProcessor {
    private nam: NamWasmModule | null = null
    private instanceId: number = -1

    constructor() {
        super()
        this.init()
        this.port.onmessage = (e) => this.handleMessage(e.data)
    }

    private async init() {
        const module = await createNamModule()
        this.nam = NamWasmModule.fromModule(module)
        this.nam.setSampleRate(sampleRate)
        this.instanceId = this.nam.createInstance()
        this.port.postMessage({ type: "ready" })
    }

    private handleMessage(data: any) {
        if (data.type === "loadModel" && this.nam) {
            const success = this.nam.loadModel(this.instanceId, data.modelJson)
            this.port.postMessage({ type: "modelLoaded", success })
        }
    }

    process(inputs: Float32Array[][], outputs: Float32Array[][]) {
        if (!this.nam || !this.nam.hasModel(this.instanceId)) {
            return true
        }

        const input = inputs[0][0]
        const output = outputs[0][0]

        if (input && output) {
            this.nam.process(this.instanceId, input, output)
        }

        return true
    }
}

registerProcessor("nam-processor", NamProcessor)
```

### Multiple Instances

```typescript
// Create multiple independent instances
const instance1 = nam.createInstance()
const instance2 = nam.createInstance()

// Load different models
nam.loadModel(instance1, cleanAmpJson)
nam.loadModel(instance2, distortedAmpJson)

// Process independently
nam.process(instance1, guitar1Input, guitar1Output)
nam.process(instance2, guitar2Input, guitar2Output)

// Check instance count
console.log(nam.getInstanceCount()) // 2
```

## API Reference

### NamWasmModule

#### Static Methods

| Method | Description |
|--------|-------------|
| `fromModule(module, bufferSize?)` | Create from an Emscripten module instance |
| `create(createModule, bufferSize?)` | Create from module factory function |

#### Instance Management

| Method | Description |
|--------|-------------|
| `createInstance()` | Create a new NAM instance, returns instance ID |
| `destroyInstance(id)` | Destroy an instance and free resources |
| `getInstanceCount()` | Get number of active instances |

#### Model Management

| Method | Description |
|--------|-------------|
| `loadModel(id, json)` | Load a .nam model (JSON string), returns success |
| `unloadModel(id)` | Unload model from instance |
| `hasModel(id)` | Check if instance has a model loaded |
| `getModelLoudness(id)` | Get model loudness in dB (if available) |
| `hasModelLoudness(id)` | Check if model has loudness metadata |

#### Audio Processing

| Method | Description |
|--------|-------------|
| `process(id, input, output)` | Process audio through instance |
| `processInPlace(id, buffer)` | Process audio in-place |
| `reset(id)` | Reset instance state (call on transport stop) |

#### Configuration

| Method | Description |
|--------|-------------|
| `setSampleRate(rate)` | Set sample rate for all instances |
| `getSampleRate()` | Get current sample rate |
| `setMaxBufferSize(size)` | Set max buffer size (default: 128) |
| `getMaxBufferSize()` | Get current max buffer size |

#### Cleanup

| Method | Description |
|--------|-------------|
| `dispose()` | Free all allocated memory |

## Building from Source

### Prerequisites

1. **Node.js** (v16+)
2. **Emscripten** (v3.1.41+)

### Install Emscripten

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install 3.1.41
./emsdk activate 3.1.41
source ./emsdk_env.sh
```

### Build

```bash
# Clone with submodules
git clone --recursive https://github.com/andremichelle/nam-wasm.git
cd nam-wasm

# Or init submodules if already cloned
git submodule update --init --recursive

# Install dependencies
npm install

# Build WASM and TypeScript
npm run build

# Or build separately
npm run build:wasm  # Build WASM only
npm run build:ts    # Build TypeScript only
```

Output files are in `dist/`:
- `nam.wasm` - WebAssembly binary (~200KB)
- `nam.js` - Emscripten ES6 module wrapper
- `index.js` / `index.d.ts` - Package exports
- `NamWasmModule.js` / `NamWasmModule.d.ts` - TypeScript API

## Performance

| Model Type | CPU Usage* | Quality |
|------------|-----------|---------|
| Standard | ~8% | Full fidelity |
| Lite | ~5-6% | Nearly indistinguishable |
| Feather | ~4-5% | Great for live/mixing |
| Nano | ~3% | Some loss in detail |

*Per instance on i7 @ 4.2GHz

With Lite/Feather models, 6-8 simultaneous instances run comfortably.

## License

MIT License

### Third-Party Licenses

```
Neural Amp Modeler Core
Copyright 2023-2025 Steven Atkinson
MIT License
https://github.com/sdatkinson/NeuralAmpModelerCore

Neural Amp Modeler WASM (original port)
Copyright 2023 Steven Atkinson
MIT License
https://github.com/tone-3000/neural-amp-modeler-wasm
```

## Resources

- [NAM Model Library (ToneHunt)](https://tonehunt.org/)
- [TONE3000 Models](https://www.tone3000.com/)
- [Understanding NAM Types](https://www.tone3000.com/blog/understanding-nam-types)
