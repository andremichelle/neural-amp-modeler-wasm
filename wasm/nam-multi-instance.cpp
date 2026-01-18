/**
 * Neural Amp Modeler (NAM) Multi-Instance WebAssembly Module
 *
 * This module provides a minimal C API for running multiple independent
 * NAM model instances in WebAssembly. Designed for integration with
 * Web Audio AudioWorklets.
 *
 * Based on NeuralAmpModelerCore by Steven Atkinson
 * Multi-instance adaptation for openDAW integration
 *
 * @author: Andre Michelle
 * @license: MIT
 */

#include <emscripten.h>
#include <map>
#include <memory>
#include <cstring>

#include <NAM/activations.h>
#include <NAM/dsp.h>
#include <NAM/get_dsp.h>

namespace {
    // Instance storage - maps instance ID to DSP model
    std::map<int, std::unique_ptr<nam::DSP>> instances;

    // Next available instance ID
    int nextInstanceId = 0;

    // Global sample rate (shared across instances)
    float sampleRate = 48000.0f;

    // Maximum buffer size for processing (Web Audio render quantum is 128)
    int maxBufferSize = 128;

    // Flag to track if fast tanh has been enabled
    bool fastTanhEnabled = false;
}

extern "C" {

/**
 * Creates a new NAM instance.
 * @return Instance ID (>= 0) for use with other functions
 */
EMSCRIPTEN_KEEPALIVE
int nam_createInstance() {
    int id = nextInstanceId++;
    instances[id] = nullptr;
    return id;
}

/**
 * Destroys a NAM instance and frees its resources.
 * @param id Instance ID returned from nam_createInstance()
 */
EMSCRIPTEN_KEEPALIVE
void nam_destroyInstance(int id) {
    auto it = instances.find(id);
    if (it != instances.end()) {
        instances.erase(it);
    }
}

/**
 * Returns the number of active instances.
 * @return Number of instances currently allocated
 */
EMSCRIPTEN_KEEPALIVE
int nam_getInstanceCount() {
    return static_cast<int>(instances.size());
}

/**
 * Loads a NAM model into an instance from JSON string.
 * @param id Instance ID
 * @param jsonStr JSON string containing the model configuration
 * @return true if model loaded successfully, false otherwise
 */
EMSCRIPTEN_KEEPALIVE
bool nam_loadModel(int id, const char* jsonStr) {
    auto it = instances.find(id);
    if (it == instances.end()) {
        return false;
    }

    try {
        // Enable fast tanh on first model load
        if (!fastTanhEnabled) {
            nam::activations::Activation::enable_fast_tanh();
            fastTanhEnabled = true;
        }

        auto dsp = nam::get_dsp(jsonStr);
        if (dsp) {
            dsp->Reset(sampleRate, maxBufferSize);
            dsp->prewarm();
            it->second = std::move(dsp);
            return true;
        }
    } catch (...) {
        // Model loading failed
    }

    return false;
}

/**
 * Unloads the model from an instance (keeps instance alive).
 * @param id Instance ID
 */
EMSCRIPTEN_KEEPALIVE
void nam_unloadModel(int id) {
    auto it = instances.find(id);
    if (it != instances.end()) {
        it->second.reset();
    }
}

/**
 * Checks if an instance has a model loaded.
 * @param id Instance ID
 * @return true if a model is loaded, false otherwise
 */
EMSCRIPTEN_KEEPALIVE
bool nam_hasModel(int id) {
    auto it = instances.find(id);
    return it != instances.end() && it->second != nullptr;
}

/**
 * Processes audio through a NAM instance.
 * If no model is loaded, copies input to output (bypass).
 *
 * @param id Instance ID
 * @param input Pointer to input samples (mono)
 * @param output Pointer to output samples (mono)
 * @param numFrames Number of samples to process
 */
EMSCRIPTEN_KEEPALIVE
void nam_process(int id, float* input, float* output, int numFrames) {
    auto it = instances.find(id);
    if (it != instances.end() && it->second) {
        it->second->process(input, output, numFrames);
    } else {
        // Bypass: copy input to output
        std::memcpy(output, input, numFrames * sizeof(float));
    }
}

/**
 * Sets the sample rate for all instances.
 * Call this when the audio context sample rate is known.
 *
 * @param rate Sample rate in Hz (e.g., 44100, 48000)
 */
EMSCRIPTEN_KEEPALIVE
void nam_setSampleRate(float rate) {
    sampleRate = rate;
    for (auto& [id, dsp] : instances) {
        if (dsp) {
            dsp->Reset(rate, maxBufferSize);
        }
    }
}

/**
 * Gets the current sample rate.
 * @return Current sample rate in Hz
 */
EMSCRIPTEN_KEEPALIVE
float nam_getSampleRate() {
    return sampleRate;
}

/**
 * Sets the maximum buffer size for processing.
 * Call this if using buffer sizes larger than 128 samples.
 *
 * @param size Maximum buffer size in samples
 */
EMSCRIPTEN_KEEPALIVE
void nam_setMaxBufferSize(int size) {
    maxBufferSize = size;
    // Re-initialize all instances with new buffer size
    for (auto& [id, dsp] : instances) {
        if (dsp) {
            dsp->Reset(sampleRate, maxBufferSize);
        }
    }
}

/**
 * Gets the current maximum buffer size.
 * @return Maximum buffer size in samples
 */
EMSCRIPTEN_KEEPALIVE
int nam_getMaxBufferSize() {
    return maxBufferSize;
}

/**
 * Gets the loudness value of a loaded model (if available).
 * @param id Instance ID
 * @return Loudness in dB, or 0 if not available
 */
EMSCRIPTEN_KEEPALIVE
float nam_getModelLoudness(int id) {
    auto it = instances.find(id);
    if (it != instances.end() && it->second && it->second->HasLoudness()) {
        return static_cast<float>(it->second->GetLoudness());
    }
    return 0.0f;
}

/**
 * Checks if a model has loudness metadata.
 * @param id Instance ID
 * @return true if model has loudness info, false otherwise
 */
EMSCRIPTEN_KEEPALIVE
bool nam_hasModelLoudness(int id) {
    auto it = instances.find(id);
    return it != instances.end() && it->second && it->second->HasLoudness();
}

/**
 * Resets the internal state of a model instance.
 * Call this to clear any internal buffers (e.g., on transport stop).
 * @param id Instance ID
 */
EMSCRIPTEN_KEEPALIVE
void nam_reset(int id) {
    auto it = instances.find(id);
    if (it != instances.end() && it->second) {
        it->second->Reset(sampleRate, maxBufferSize);
    }
}

} // extern "C"
