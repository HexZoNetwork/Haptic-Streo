export type EventHandler<TPayload = unknown> = (payload: TPayload) => Promise<void> | void;

export class EventDispatcher {
  private readonly handlers = new Map<string, EventHandler[]>();

  on(eventName: string, handler: EventHandler): void {
    const list = this.handlers.get(eventName) ?? [];
    list.push(handler);
    this.handlers.set(eventName, list);
  }

  async emit<TPayload>(eventName: string, payload: TPayload): Promise<void> {
    const handlers = this.handlers.get(eventName) ?? [];
    for (const handler of handlers) {
      await handler(payload);
    }
  }
}
