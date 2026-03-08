export interface RuntimeEngine {
    readonly name: "telegraf" | "gramjs";
    bootstrap(): Promise<void>;
}
export declare class TelegrafEngine implements RuntimeEngine {
    readonly name: "telegraf";
    bootstrap(): Promise<void>;
}
//# sourceMappingURL=telegraf-engine.d.ts.map