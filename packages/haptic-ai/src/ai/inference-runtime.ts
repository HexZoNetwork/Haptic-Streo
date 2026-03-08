import type { LoadedModel } from "./model-loader.js";

export async function runInference(model: LoadedModel, text: string): Promise<string> {
  void model;
  return text;
}
