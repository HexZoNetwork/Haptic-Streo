export interface TrainingDataPoint {
    input: string;
    label: string;
}
export declare function trainModel(dataset: TrainingDataPoint[]): Promise<number>;
//# sourceMappingURL=training.d.ts.map