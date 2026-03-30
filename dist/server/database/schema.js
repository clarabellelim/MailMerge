"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendLogTable = exports.influencerTable = exports.emailTemplateTable = exports.authConfigTable = exports.sendLog = exports.authConfig = exports.emailTemplate = exports.influencer = exports.customTimestamptz = exports.fileAttachmentArray = exports.userProfileArray = exports.fileAttachment = exports.userProfile = void 0;
/* eslint-disable */
/** auto generated, do not edit */
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.userProfile = (0, pg_core_1.customType)({
    dataType() {
        return 'user_profile';
    },
    toDriver(value) {
        return (0, drizzle_orm_1.sql) `ROW(${value})::user_profile`;
    },
    fromDriver(value) {
        const [userId] = value.slice(1, -1).split(',');
        return userId.trim();
    },
});
exports.fileAttachment = (0, pg_core_1.customType)({
    dataType() {
        return 'file_attachment';
    },
    toDriver(value) {
        return (0, drizzle_orm_1.sql) `ROW(${value.bucket_id},${value.file_path})::file_attachment`;
    },
    fromDriver(value) {
        const [bucketId, filePath] = value.slice(1, -1).split(',');
        return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    },
});
/** Escape single quotes in SQL string literals */
function escapeLiteral(str) {
    return `'${str.replace(/'/g, "''")}'`;
}
exports.userProfileArray = (0, pg_core_1.customType)({
    dataType() {
        return 'user_profile[]';
    },
    toDriver(value) {
        if (!value || value.length === 0) {
            return (0, drizzle_orm_1.sql) `'{}'::user_profile[]`;
        }
        const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
        return drizzle_orm_1.sql.raw(`ARRAY[${elements}]::user_profile[]`);
    },
    fromDriver(value) {
        if (!value || value === '{}')
            return [];
        const inner = value.slice(1, -1);
        const matches = inner.match(/\([^)]*\)/g) || [];
        return matches.map(m => m.slice(1, -1).split(',')[0].trim());
    },
});
exports.fileAttachmentArray = (0, pg_core_1.customType)({
    dataType() {
        return 'file_attachment[]';
    },
    toDriver(value) {
        if (!value || value.length === 0) {
            return (0, drizzle_orm_1.sql) `'{}'::file_attachment[]`;
        }
        const elements = value.map(f => `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`).join(',');
        return drizzle_orm_1.sql.raw(`ARRAY[${elements}]::file_attachment[]`);
    },
    fromDriver(value) {
        if (!value || value === '{}')
            return [];
        const inner = value.slice(1, -1);
        const matches = inner.match(/\([^)]*\)/g) || [];
        return matches.map(m => {
            const [bucketId, filePath] = m.slice(1, -1).split(',');
            return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
        });
    },
});
exports.customTimestamptz = (0, pg_core_1.customType)({
    dataType(config) {
        const precision = typeof config?.precision !== 'undefined'
            ? ` (${config.precision})`
            : '';
        return `timestamptz${precision}`;
    },
    toDriver(value) {
        if (value == null)
            return value;
        if (typeof value === 'number') {
            return new Date(value).toISOString();
        }
        if (typeof value === 'string') {
            return value;
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        throw new Error('Invalid timestamp value');
    },
    fromDriver(value) {
        if (value instanceof Date)
            return value;
        return new Date(value);
    },
});
exports.influencer = (0, pg_core_1.pgTable)("influencer", {
    id: (0, pg_core_1.uuid)().defaultRandom().notNull(),
    handle: (0, pg_core_1.varchar)({ length: 255 }).notNull(),
    platform: (0, pg_core_1.varchar)({ length: 255 }).notNull(),
    followers: (0, pg_core_1.integer)().default(0).notNull(),
    engagementRate: (0, pg_core_1.doublePrecision)("engagement_rate"),
    bio: (0, pg_core_1.text)(),
    emailFound: (0, pg_core_1.varchar)("email_found", { length: 255 }),
    contactLinkFallback: (0, pg_core_1.text)("contact_link_fallback"),
    verified: (0, pg_core_1.boolean)().default(false).notNull(),
    manualEmail: (0, pg_core_1.varchar)("manual_email", { length: 255 }),
    scanStatus: (0, pg_core_1.varchar)("scan_status", { length: 255 }).default('complete').notNull(),
    // System field: Creation time (auto-filled, do not modify)
    createdAt: (0, exports.customTimestamptz)('_created_at').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`).notNull(),
    // System field: Creator (auto-filled, do not modify)
    createdBy: (0, exports.userProfile)("_created_by"),
    // System field: Update time (auto-filled, do not modify)
    updatedAt: (0, exports.customTimestamptz)('_updated_at').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`).notNull(),
    // System field: Updater (auto-filled, do not modify)
    updatedBy: (0, exports.userProfile)("_updated_by"),
}, (table) => [
    (0, pg_core_1.index)("idx_influencer_platform").using("btree", table.platform.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_influencer_scan_status").using("btree", table.scanStatus.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_influencer_verified").using("btree", table.verified.asc().nullsLast().op("bool_ops")),
    (0, pg_core_1.pgPolicy)("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"], using: (0, drizzle_orm_1.sql) `((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = (_created_by)::text))` }),
    (0, pg_core_1.pgPolicy)("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadjyz2krv6au", "authenticated_workspace_aadjyz2krv6au"] }),
    (0, pg_core_1.pgPolicy)("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"] }),
    (0, pg_core_1.pgPolicy)("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadjyz2krv6au"] }),
]);
exports.emailTemplate = (0, pg_core_1.pgTable)("email_template", {
    id: (0, pg_core_1.uuid)().defaultRandom().notNull(),
    name: (0, pg_core_1.varchar)({ length: 255 }).notNull(),
    subject: (0, pg_core_1.varchar)({ length: 255 }).notNull(),
    content: (0, pg_core_1.text)().notNull(),
    isDefault: (0, pg_core_1.boolean)("is_default").default(false).notNull(),
    // System field: Creation time (auto-filled, do not modify)
    createdAt: (0, exports.customTimestamptz)('_created_at').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`).notNull(),
    // System field: Creator (auto-filled, do not modify)
    createdBy: (0, exports.userProfile)("_created_by"),
    // System field: Update time (auto-filled, do not modify)
    updatedAt: (0, exports.customTimestamptz)('_updated_at').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`).notNull(),
    // System field: Updater (auto-filled, do not modify)
    updatedBy: (0, exports.userProfile)("_updated_by"),
}, (table) => [
    (0, pg_core_1.index)("idx_email_template_default").using("btree", table.isDefault.asc().nullsLast().op("bool_ops")),
    (0, pg_core_1.pgPolicy)("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"], using: (0, drizzle_orm_1.sql) `((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = (_created_by)::text))` }),
    (0, pg_core_1.pgPolicy)("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadjyz2krv6au", "authenticated_workspace_aadjyz2krv6au"] }),
    (0, pg_core_1.pgPolicy)("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"] }),
    (0, pg_core_1.pgPolicy)("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadjyz2krv6au"] }),
]);
exports.authConfig = (0, pg_core_1.pgTable)("auth_config", {
    id: (0, pg_core_1.uuid)().defaultRandom().notNull(),
    accessToken: (0, pg_core_1.text)("access_token").notNull(),
    refreshToken: (0, pg_core_1.text)("refresh_token").notNull(),
    expiresAt: (0, exports.customTimestamptz)('expires_at').notNull(),
    owner: (0, exports.userProfile)("owner").notNull(),
    // System field: Creation time (auto-filled, do not modify)
    createdAt: (0, exports.customTimestamptz)('_created_at').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`).notNull(),
    // System field: Creator (auto-filled, do not modify)
    createdBy: (0, exports.userProfile)("_created_by"),
    // System field: Update time (auto-filled, do not modify)
    updatedAt: (0, exports.customTimestamptz)('_updated_at').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`).notNull(),
    // System field: Updater (auto-filled, do not modify)
    updatedBy: (0, exports.userProfile)("_updated_by"),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("uk_auth_config_owner").using("btree", (0, drizzle_orm_1.sql) `((owner).user_id)`),
    (0, pg_core_1.pgPolicy)("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"], using: (0, drizzle_orm_1.sql) `((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = (_created_by)::text))` }),
    (0, pg_core_1.pgPolicy)("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadjyz2krv6au", "authenticated_workspace_aadjyz2krv6au"] }),
    (0, pg_core_1.pgPolicy)("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"] }),
    (0, pg_core_1.pgPolicy)("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadjyz2krv6au"] }),
]);
exports.sendLog = (0, pg_core_1.pgTable)("send_log", {
    id: (0, pg_core_1.uuid)().defaultRandom().notNull(),
    influencerId: (0, pg_core_1.uuid)("influencer_id").notNull(),
    templateId: (0, pg_core_1.uuid)("template_id"),
    recipientEmail: (0, pg_core_1.varchar)("recipient_email", { length: 255 }).notNull(),
    sendStatus: (0, pg_core_1.varchar)("send_status", { length: 255 }).default('pending').notNull(),
    errorReason: (0, pg_core_1.text)("error_reason"),
    sendTime: (0, exports.customTimestamptz)('send_time').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    // System field: Creation time (auto-filled, do not modify)
    createdAt: (0, exports.customTimestamptz)('_created_at').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`).notNull(),
    // System field: Creator (auto-filled, do not modify)
    createdBy: (0, exports.userProfile)("_created_by"),
    // System field: Update time (auto-filled, do not modify)
    updatedAt: (0, exports.customTimestamptz)('_updated_at').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`).notNull(),
    // System field: Updater (auto-filled, do not modify)
    updatedBy: (0, exports.userProfile)("_updated_by"),
}, (table) => [
    (0, pg_core_1.index)("idx_send_log_influencer").using("btree", table.influencerId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.index)("idx_send_log_status").using("btree", table.sendStatus.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_send_log_time").using("btree", table.sendTime.asc().nullsLast().op("timestamptz_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.influencerId],
        foreignColumns: [exports.influencer.id],
        name: "send_log_influencer_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.foreignKey)({
        columns: [table.templateId],
        foreignColumns: [exports.emailTemplate.id],
        name: "send_log_template_id_fkey"
    }).onDelete("set null"),
    (0, pg_core_1.pgPolicy)("修改本人数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"], using: (0, drizzle_orm_1.sql) `((current_setting('app.user_id'::text) = ANY (ARRAY[]::text[])) AND (current_setting('app.user_id'::text) = (_created_by)::text))` }),
    (0, pg_core_1.pgPolicy)("查看全部数据", { as: "permissive", for: "select", to: ["anon_workspace_aadjyz2krv6au", "authenticated_workspace_aadjyz2krv6au"] }),
    (0, pg_core_1.pgPolicy)("修改全部数据", { as: "permissive", for: "all", to: ["authenticated_workspace_aadjyz2krv6au"] }),
    (0, pg_core_1.pgPolicy)("service_role_bypass_policy", { as: "permissive", for: "all", to: ["service_role_workspace_aadjyz2krv6au"] }),
]);
// table aliases
exports.authConfigTable = exports.authConfig;
exports.emailTemplateTable = exports.emailTemplate;
exports.influencerTable = exports.influencer;
exports.sendLogTable = exports.sendLog;
