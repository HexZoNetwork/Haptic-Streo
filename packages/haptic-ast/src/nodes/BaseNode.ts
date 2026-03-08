export type NodeKind =
  | "Program"
  | "Bot"
  | "Command"
  | "Event"
  | "Reply"
  | "Log"
  | "Send"
  | "Function"
  | "Condition"
  | "Loop"
  | "TryCatch"
  | "Let"
  | "Return"
  | "Stop"
  | "Db"
  | "Insert"
  | "Select"
  | "RawJS";

export interface BaseNode {
  readonly kind: NodeKind;
  readonly loc?: {
    readonly startOffset: number;
    readonly endOffset: number;
  };
}
