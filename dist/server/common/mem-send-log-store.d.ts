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
export declare function memSendLogAppend(item: Omit<MemSendLogItem, 'id' | 'sendTime'> & {
    id?: string;
    sendTime?: Date;
}): void;
export declare function memSendLogList(): MemSendLogItem[];
