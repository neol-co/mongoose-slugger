import { Document, Schema, SaveOptions } from 'mongoose';
import * as slugger from './slugger';
import * as mongodb from 'mongodb';
export declare const delegatedSaveFunction = "_sluggerSaveDelegate";
export declare const attachmentPropertyName = "_sluggerAttachment";
export declare class SlugDocumentAttachment {
    slugAttempts: string[];
}
export declare function saveSlugWithRetries<D extends Document>(document: D, sluggerOptions: slugger.SluggerOptions<D>, saveOptions?: SaveOptions): Promise<D>;
export declare function createDefaultGenerator(paths: string | string[]): slugger.GeneratorFunction<Document>;
export declare function extractIndexNameFromError(msg: string): string | undefined;
/** Gets all Slugger plugins which are assigned to the given schema. */
export declare function getSluggerPlugins(schema: Schema): any[];
export declare function checkStorageEngine(db: mongodb.Db): Promise<void>;
export declare function checkStorageEngineStatus(status: any): void;
