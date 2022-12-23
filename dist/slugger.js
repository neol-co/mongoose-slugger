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
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrap = exports.plugin = exports.SluggerError = exports.SluggerOptions = void 0;
const utils = __importStar(require("./sluggerUtils"));
class SluggerOptions {
    constructor(init) {
        if (!init) {
            throw new Error('config is missing.');
        }
        if (!init.index) {
            throw new Error('`index` is missing.');
        }
        if (!init.generateFrom) {
            throw new Error('`generateFrom` is missing.');
        }
        if (typeof init.maxAttempts === 'number' && init.maxAttempts < 1) {
            throw new Error('`maxAttempts` must be at least one.');
        }
        this.index = init.index;
        // `slug` defaults to 'slug'
        this.slugPath = init.slugPath || 'slug';
        // build generator function from `generateFrom` property
        if (typeof init.generateFrom === 'function') {
            this.generator = init.generateFrom;
        }
        else if (typeof init.generateFrom === 'string' || Array.isArray(init.generateFrom)) {
            this.generator = utils.createDefaultGenerator(init.generateFrom);
        }
        else {
            throw new Error('`generateFrom` must be a string, array, or function.');
        }
        this.maxAttempts = init.maxAttempts;
    }
}
exports.SluggerOptions = SluggerOptions;
class SluggerError extends Error {
}
exports.SluggerError = SluggerError;
/**
 * The plugin for the Mongoose schema. Use it as follows:
 *
 * ```
 * schema.plugin(slugger.plugin, sluggerOptions);
 * ```
 *
 * **Important:**
 *
 * (1) `sluggerOptions` must be of type `SluggerOptions`,
 *
 * (2) the `slugPath` specified in the SluggerOptions must exist,
 *
 * (3) the `index` specified in the SluggerOptions must exist,
 *
 * (4) after creating the model you **must** wrap the model with
 * the `slugger.wrap` function.
 */
function plugin(schema, options) {
    if (!options) {
        throw new Error('options are missing.');
    }
    // make sure, that only one slugger instance is used per model (for now)
    const plugins = utils.getSluggerPlugins(schema);
    if (plugins.length > 1) {
        throw new Error('slugger was added more than once.');
    }
    // make sure, that the `slugPath` exists
    if (!schema.path(options.slugPath)) {
        throw new Error(`the slug path '${options.slugPath}' does not exist in the schema.`);
    }
    // make sure the specified index exists
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const indices = schema.indexes();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const index = indices.find(entry => entry.length > 1 && entry[1].name === options.index);
    if (!index) {
        throw new Error(`schema contains no index with name '${options.index}'.`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!index[1].unique) {
        throw new Error(`the index '${options.index}' is not unique.`);
    }
    // make sure, that the `slugPath` is contained in the index
    if (!{}.hasOwnProperty.call(index[0], options.slugPath)) {
        throw new Error(`the index '${options.index}' does not contain the slug path '${options.slugPath}'.`);
    }
    schema.pre('validate', function (next) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        let slugAttachment = this[utils.attachmentPropertyName];
        // only generate/retry slugs, when no slug
        // is explicitly given in the document
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        if (!slugAttachment && this.get(options.slugPath) == null) {
            slugAttachment = new utils.SlugDocumentAttachment();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            this[utils.attachmentPropertyName] = slugAttachment;
        }
        if (slugAttachment) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            this.set(options.slugPath, options.generator(this, slugAttachment.slugAttempts.length));
        }
        next();
    });
}
exports.plugin = plugin;
/**
 * Wraps the model, so that the slug-generation logic works.
 *
 * ```
 * let model = mongoose.model('MyData', schema);
 * model = slugger.wrap(model);
 * // model is ready to use now
 * ```
 *
 * @param model The model with the registered slugger plugin.
 */
function wrap(model) {
    const plugins = utils.getSluggerPlugins(model.schema);
    if (plugins.length === 0) {
        throw new Error('slugger was not added to this model’s schema.');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const sluggerOptions = plugins[0].opts;
    if (!(sluggerOptions instanceof SluggerOptions)) {
        throw new Error('attached `opts` are not of type SluggerOptions.');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    model.prototype[utils.delegatedSaveFunction] = model.prototype.save;
    // only check the storage engine *once* on first call
    const hasCheckedStorageEngine = true;
    // @ts-expect-error ignore “TS7030: Not all code paths return a value.”
    // this is fine, as we’re following Mongoose’s API here
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    model.prototype.save = function (saveOptions, fn) {
        if (typeof saveOptions === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            fn = saveOptions;
            saveOptions = undefined;
        }
        let promise = Promise.resolve();
        // if (!hasCheckedStorageEngine) {
        //   promise = promise.then(() => utils.checkStorageEngine(model.db.db));
        //   hasCheckedStorageEngine = true;
        // }
        promise = promise.then(() => utils.saveSlugWithRetries(this, sluggerOptions, saveOptions));
        if (!fn) {
            return promise;
        }
        // nb: don't do then().catch() -- https://stackoverflow.com/a/40642436
        promise.then(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
        result => fn(undefined, result), 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
        reason => fn(reason));
    };
    return model;
}
exports.wrap = wrap;
