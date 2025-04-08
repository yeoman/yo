import {fileURLToPath} from 'node:url';
import path from 'node:path';

/**
 * Returns the __dirname when provided import.meta.url.
 *
 * __dirname is not available in ESM, and import.meta.dirname is only available in Node 20.11.0+.
 *
 * @param fileUrl (typically import.meta.url)
 * @returns __dirname
 */
export const getDirname = fileUrl => path.dirname(fileURLToPath(fileUrl));
