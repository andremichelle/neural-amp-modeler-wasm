/**
 * NAM Model JSON Structure
 *
 * Sources:
 * - https://neural-amp-modeler.readthedocs.io/en/latest/model-file.html
 * - https://github.com/sdatkinson/neural-amp-modeler/blob/main/nam/models/metadata.py
 * - https://github.com/sdatkinson/neural-amp-modeler/blob/main/nam/train/metadata.py
 */

export type GearType =
    | "amp"
    | "pedal"
    | "pedal_amp"
    | "amp_cab"
    | "amp_pedal_cab"
    | "preamp"
    | "studio"

export type ToneType =
    | "clean"
    | "overdrive"
    | "crunch"
    | "hi_gain"
    | "fuzz"

export interface NamModelDate {
    year: number
    month: number
    day: number
    hour?: number
    minute?: number
    second?: number
}

export interface NamModelTrainingData {
    latency?: {
        manual?: number
        calibrated?: number
    }
    checks?: {
        input_clipping?: boolean
        output_clipping?: boolean
        latency?: boolean
    }
}

export interface NamModelTrainingSettings {
    ignore_checks?: boolean
}

export interface NamModelTraining {
    settings?: NamModelTrainingSettings
    data?: NamModelTrainingData
    validation_esr?: number
}

export interface NamModelMetadata {
    /** Display name */
    name?: string
    /** Creator/author */
    modeled_by?: string
    /** Type of gear modeled */
    gear_type?: GearType
    /** Manufacturer (e.g., "Fender") */
    gear_make?: string
    /** Model name (e.g., "Deluxe Reverb") */
    gear_model?: string
    /** Tone character */
    tone_type?: ToneType
    /** Input calibration level in dBu */
    input_level_dbu?: number
    /** Output calibration level in dBu */
    output_level_dbu?: number
    /** Training date */
    date?: NamModelDate
    /** Loudness (legacy/plugin-specific) */
    loudness?: number
    /** Gain (legacy/plugin-specific) */
    gain?: number
}

export interface NamModelLayerConfig {
    input_size: number
    condition_size: number
    head_size: number
    channels: number
    kernel_size: number
    dilations: number[]
    activation: string
    gated: boolean
    head_bias: boolean
}

export interface NamModelConfig {
    /**
     * WaveNet layer stack. Only present for the "WaveNet" architecture; other
     * architectures (LSTM, ConvNet, …) describe their config with different keys
     * and omit `layers` entirely, so this is undefined for them.
     */
    layers?: NamModelLayerConfig[]
}

export interface NamModel {
    /** Semantic version of the file format */
    version: string
    /** Model architecture ("WaveNet", "LSTM", "ConvNet", etc.) */
    architecture: string
    /** Architecture-specific configuration */
    config: NamModelConfig
    /** Model parameters/weights */
    weights: number[]
    /** Optional metadata */
    metadata?: NamModelMetadata
    /** Optional training information */
    training?: NamModelTraining
}

export namespace NamModel {
    export const parse = (json: string): NamModel => JSON.parse(json) as NamModel
}
