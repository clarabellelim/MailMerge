export type MemSendLogStatus = 'success' | 'failed' | 'skipped';

export interface MemSendLogItem {
  id: string;
  influencerId: string;
  influencerHandle: string;
  templateId: string;
  recipientEmail: string;
  sendStatus: MemSendLogStatus;
  errorReason?: string;
  sendTime: Date;
}

// Simple in-memory store for local MVP when DB is disabled.
const store: MemSendLogItem[] = [];

export function memSendLogAppend(item: Omit<MemSendLogItem, 'id' | 'sendTime'> & { id?: string; sendTime?: Date }) {
  const id =
    item.id ||
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

export function memSendLogList(): MemSendLogItem[] {
  return store.slice();
}

