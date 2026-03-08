export interface TrainingDataPoint {
  input: string;
  label: string;
}

export async function trainModel(dataset: TrainingDataPoint[]): Promise<number> {
  return dataset.length;
}
