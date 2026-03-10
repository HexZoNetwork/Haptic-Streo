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
  | "While"
  | "TryCatch"
  | "Let"
  | "Return"
  | "Stop"
  | "Break"
  | "Continue"
  | "Db"
  | "Insert"
  | "Select"
  | "Update"
  | "Delete"
  | "RawJS";

export interface BaseNode {
  readonly kind: NodeKind;
  readonly loc?: {
    readonly startOffset: number;
    readonly endOffset: number;
  };
}
