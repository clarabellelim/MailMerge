"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memSendLogAppend = memSendLogAppend;
exports.memSendLogList = memSendLogList;
// Simple in-memory store for local MVP when DB is disabled.
const store = [];
function memSendLogAppend(item) {
    const id = item.id ||
        (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`);
    store.push({
        id,
        influencerId: item.influencerId,
        influencerHandle: item.influencerHandle,
        templateId: item.templateId,
        recipientEmail: item.recipientEmail,
        sendStatus: item.sendStatus,
        errorReason: item.errorReason,
        sendTime: item.sendTime || new Date(),
    });
}
function memSendLogList() {
    return store.slice();
}
