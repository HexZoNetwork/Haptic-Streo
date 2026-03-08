export class EventDispatcher {
    handlers = new Map();
    on(eventName, handler) {
        const list = this.handlers.get(eventName) ?? [];
        list.push(handler);
        this.handlers.set(eventName, list);
    }
    async emit(eventName, payload) {
        const handlers = this.handlers.get(eventName) ?? [];
        for (const handler of handlers) {
            await handler(payload);
        }
    }
}
//# sourceMappingURL=event-dispatcher.js.map