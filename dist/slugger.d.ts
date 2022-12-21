import { Document, Schema, Model } from 'mongoose';
/**
 * Strategy for generating new slugs.
 */
export interface GeneratorFunction<D extends Document> {
    /**
     * Generates a new slug for the given document. This function
     * is invoked until a unique slug has been found and the document
     * has been saved successfully.
     *
     * @param doc The document.
     * @param attempt Number of attempt, starting with zero.
     * @returns A new slug, such as 'john-doe'.
     */
    (doc: D, attempt: number): string;
}
/**
 * Initialization parameters for the SluggerOptions.
 */
export interface SluggerInitOptions<D extends Document> {
    /**
     * The path in the schema where to save the generated slugs.
     * The property given by the path **must** already exist in
     * the schema. In case this is not explicitly given,
     * it defaults to 'slug'.
     */
    slugPath?: string;
    /**
     * The input for generating the slug. This can be either of:
     *
     * (1) a single string or a string array of schema paths -- in
     * this case the slug is generated from the corresponding values,
     * e.g. `[ 'firstname', 'lastname' ]` will result in slugs like
     * 'john-doe'
     *
     * (2) a generator function which gives you full flexibility on
     * how the slug is to be generated.
     */
    generateFrom: string | string[] | GeneratorFunction<D>;
    /**
     * Name of an **existing** index with the `unique` property
     * enabled to ensures slug uniqueness. This means, the index
     * **must** at least contain the `slugPath`.
     *
     * In case you want scoped slugs (unique with regard to another
     * field), this would be a compound index which contains further
     * fields beside the `slugPath`.
     */
    index: string;
    /**
     * The number of attempts to generate a slug before failing.
     * In this case, a `SluggerError` will be thrown.
     *
     * In case the value is not specified, there is **not** limit of
     * attempts, i.e. the slug generating logic will potentially run
     * forever.
     */
    maxAttempts?: number;
}
export declare class SluggerOptions<D extends Document> {
    readonly slugPath: string;
    readonly generator: GeneratorFunction<D>;
    readonly index: string;
    readonly maxAttempts?: number;
    constructor(init: SluggerInitOptions<D>);
}
export declare class SluggerError extends Error {
}
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
export declare function plugin(schema: Schema, options?: SluggerOptions<any>): void;
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
export declare function wrap<M extends Model<any>>(model: M): M;
