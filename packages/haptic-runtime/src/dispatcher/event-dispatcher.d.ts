export type EventHandler<TPayload = unknown> = (payload: TPayload) => Promise<void> | void;
export declare class EventDispatcher {
    private readonly handlers;
    on(eventName: string, handler: EventHandler): void;
    emit<TPayload>(eventName: string, payload: TPayload): Promise<void>;
}
//# sourceMappingURL=event-dispatcher.d.ts.map