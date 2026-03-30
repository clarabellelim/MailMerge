/* eslint-disable */
/** auto generated, do not edit */
import { pgTable, index, pgPolicy, uuid, varchar, integer, doublePrecision, text, boolean, uniqueIndex, foreignKey, customType } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

/** Escape single quotes in SQL string literals */
function escapeLiteral(str: string): string {
  return `'${str.replace(/'/g, "''")}'`;
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number};
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number){
    if(value == null) return value as any;
    if (typeof value === 'number') {
      return new Date(value).toISOString();
    }
    if(typeof value === 'string') {
      return value;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if(value instanceof Date) return value;
    return new Date(value);
  },
});

export const influencer = pgTable("influencer", {
  id: uuid().defaultRandom().notNull(),
  handle: varchar({ length: 255 }).notNull(),
  platform: varchar({ length: 255 }).notNull(),
  followers: integer().default(0).notNull(),
  engagementRate: doublePrecision("engagement_rate"),
  bio: text(),
  emailFound: varchar("email_found", { length: 255 }),
  contactLinkFallback: text("contact_link_fallback"),
  verified: boolean().default(false).notNull(),
  manualEmail: varchar("manual_email", { length: 255 }),
  scanStatus: varchar("scan_status", { length: 255 }).default('complete').notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_influencer_platform").using("btree", table.platform.asc().nullsLast().op("text_ops")),
  index("idx_influencer_scan_status").using("btree", table.scanStatus.asc().nullsLast().op("text_ops")),
  index("idx_influencer_verified").using("btree", table.verified.asc().nullsLast().op("bool_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = (_created_by)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadjyz2krv6au", "authenticated_workspace_aadjyz2krv6au"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadjyz2krv6au"] }),
]);

export const emailTemplate = pgTable("email_template", {
  id: uuid().defaultRandom().notNull(),
  name: varchar({ length: 255 }).notNull(),
  subject: varchar({ length: 255 }).notNull(),
  content: text().notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_email_template_default").using("btree", table.isDefault.asc().nullsLast().op("bool_ops")),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = (_created_by)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadjyz2krv6au", "authenticated_workspace_aadjyz2krv6au"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadjyz2krv6au"] }),
]);

export const authConfig = pgTable("auth_config", {
  id: uuid().defaultRandom().notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: customTimestamptz('expires_at').notNull(),
  owner: userProfile("owner").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("uk_auth_config_owner").using("btree", sql`((owner).user_id)`),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = (_created_by)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadjyz2krv6au", "authenticated_workspace_aadjyz2krv6au"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadjyz2krv6au"] }),
]);

export const sendLog = pgTable("send_log", {
  id: uuid().defaultRandom().notNull(),
  influencerId: uuid("influencer_id").notNull(),
  templateId: uuid("template_id"),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  sendStatus: varchar("send_status", { length: 255 }).default('pending').notNull(),
  errorReason: text("error_reason"),
  sendTime: customTimestamptz('send_time').default(sql`CURRENT_TIMESTAMP`),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz('_created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz('_updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  index("idx_send_log_influencer").using("btree", table.influencerId.asc().nullsLast().op("uuid_ops")),
  index("idx_send_log_status").using("btree", table.sendStatus.asc().nullsLast().op("text_ops")),
  index("idx_send_log_time").using("btree", table.sendTime.asc().nullsLast().op("timestamptz_ops")),
  foreignKey({
    columns: [table.influencerId],
    foreignColumns: [influencer.id],
    name: "send_log_influencer_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.templateId],
    foreignColumns: [emailTemplate.id],
    name: "send_log_template_id_fkey"
  }).onDelete("set null"),
  pgPolicy("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"], using: sql`((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = (_created_by)::text))` }),
  pgPolicy("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadjyz2krv6au", "authenticated_workspace_aadjyz2krv6au"] }),
  pgPolicy("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"] }),
  pgPolicy("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadjyz2krv6au"] }),
]);

// table aliases
export const authConfigTable = authConfig;
export const emailTemplateTable = emailTemplate;
export const influencerTable = influencer;
export const sendLogTable = sendLog;
