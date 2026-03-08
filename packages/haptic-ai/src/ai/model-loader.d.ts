export type SupportedModelRuntime = "tensorflowjs" | "onnx" | "huggingface";
export interface LoadedModel {
    runtime: SupportedModelRuntime;
    id: string;
}
export declare function loadModel(runtime: SupportedModelRuntime, id: string): Promise<LoadedModel>;
//# sourceMappingURL=model-loader.d.ts.map