"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStorageEngineStatus = exports.checkStorageEngine = exports.getSluggerPlugins = exports.extractIndexNameFromError = exports.createDefaultGenerator = exports.saveSlugWithRetries = exports.SlugDocumentAttachment = exports.attachmentPropertyName = exports.delegatedSaveFunction = void 0;
const slugger = __importStar(require("./slugger"));
const limax_1 = __importDefault(require("limax"));
// internal utilities which are not meant to belong to the API
exports.delegatedSaveFunction = '_sluggerSaveDelegate';
exports.attachmentPropertyName = '_sluggerAttachment';
class SlugDocumentAttachment {
    constructor() {
        this.slugAttempts = [];
    }
}
exports.SlugDocumentAttachment = SlugDocumentAttachment;
async function saveSlugWithRetries(document, sluggerOptions, saveOptions) {
    for (;;) {
        try {
            // eslint-disable-next-line @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const saveFunction = document[exports.delegatedSaveFunction] || document.save;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
            return await saveFunction.call(document, saveOptions);
        }
        catch (e) {
            if (isMongoError(e)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                const slugAttachment = document[exports.attachmentPropertyName];
                if (slugAttachment &&
                    e.code === 11000 &&
                    e.message &&
                    extractIndexNameFromError(e.message) === sluggerOptions.index) {
                    const attemptedSlug = document.get(sluggerOptions.slugPath);
                    if (slugAttachment.slugAttempts.includes(attemptedSlug)) {
                        throw new slugger.SluggerError(`Already attempted slug '${attemptedSlug}' before. Giving up.`);
                    }
                    slugAttachment.slugAttempts.push(attemptedSlug);
                    if (sluggerOptions.maxAttempts && slugAttachment.slugAttempts.length >= sluggerOptions.maxAttempts) {
                        throw new slugger.SluggerError(`Reached ${slugAttachment.slugAttempts.length} attempts without being able to insert. Giving up.`);
                    }
                    continue;
                }
            }
            throw e;
        }
    }
}
exports.saveSlugWithRetries = saveSlugWithRetries;
function createDefaultGenerator(paths) {
    return (doc, attempt) => {
        const values = [].concat(paths).map(path => doc.get(path));
        if (attempt > 0) {
            values.push(`${attempt + 1}`);
        }
        // replace underscore with hyphen
        return (0, limax_1.default)(values.join('-'), { custom: { _: '-' } });
    };
}
exports.createDefaultGenerator = createDefaultGenerator;
function extractIndexNameFromError(msg) {
    // https://github.com/matteodelabre/mongoose-beautiful-unique-validation/blob/master/index.js#L5
    const matches = /index: (.+) dup key:/.exec(msg);
    return matches ? matches[1] : undefined;
}
exports.extractIndexNameFromError = extractIndexNameFromError;
/** Gets all Slugger plugins which are assigned to the given schema. */
function getSluggerPlugins(schema) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return schema.plugins.filter((p) => p.fn === slugger.plugin);
}
exports.getSluggerPlugins = getSluggerPlugins;
function isMongoError(e) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return typeof e.name === 'string' && ['MongoError', 'MongoServerError', 'BulkWriteError'].includes(e.name);
}
async function checkStorageEngine(db) {
    checkStorageEngineStatus(await db.admin().serverStatus());
}
exports.checkStorageEngine = checkStorageEngine;
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function checkStorageEngineStatus(status) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!status.storageEngine || !status.storageEngine.name) {
        throw new Error('status.storageEngine is missing');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const name = status.storageEngine.name;
    if (name !== 'wiredTiger') {
        throw new Error(`Storage Engine is set to '${name}', but only 'wiredTiger' is supported at the moment.`);
    }
}
exports.checkStorageEngineStatus = checkStorageEngineStatus;
