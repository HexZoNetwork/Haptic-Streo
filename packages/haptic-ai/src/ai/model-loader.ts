export type SupportedModelRuntime = "tensorflowjs" | "onnx" | "huggingface";

export interface LoadedModel {
  runtime: SupportedModelRuntime;
  id: string;
}

export async function loadModel(runtime: SupportedModelRuntime, id: string): Promise<LoadedModel> {
  return { runtime, id };
}
