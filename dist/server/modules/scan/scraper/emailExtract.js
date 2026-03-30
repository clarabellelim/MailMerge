"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFirstValidEmail = extractFirstValidEmail;
exports.extractEmailsFromMailtoHrefs = extractEmailsFromMailtoHrefs;
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
function extractFirstValidEmail(text) {
    if (!text)
        return null;
    const match = text.match(EMAIL_REGEX);
    if (!match)
        return null;
    return match[0].trim();
}
function extractEmailsFromMailtoHrefs(hrefs) {
    const out = new Set();
    for (const href of hrefs) {
        const clean = href.replace(/^mailto:/i, '').split('?')[0].trim();
        if (!clean)
            continue;
        if (EMAIL_REGEX.test(clean))
            out.add(clean);
    }
    return [...out];
}
