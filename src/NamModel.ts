export interface NamModel {
    version: string
    architecture: string
    metadata?: {
        name?: string
        loudness?: number
        gain?: number
    }
    config: {
        layers: Array<{
            input_size: number
            condition_size: number
            head_size: number
            channels: number
            kernel_size: number
            dilations: number[]
            activation: string
            gated: boolean
            head_bias: boolean
        }>
    }
    weights: number[]
}

export namespace NamModel {
    export const parse = (json: string): NamModel => JSON.parse(json) as NamModel
}
