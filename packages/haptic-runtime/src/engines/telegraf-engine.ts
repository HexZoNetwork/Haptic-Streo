export interface RuntimeEngine {
  readonly name: "telegraf" | "gramjs";
  bootstrap(): Promise<void>;
}

export class TelegrafEngine implements RuntimeEngine {
  readonly name = "telegraf" as const;

  async bootstrap(): Promise<void> {
    // Runtime bootstrap is generated during transpilation in MVP.
  }
}
