import {fileURLToPath} from 'url';
import path from 'path';

/**
 * Returns the __dirname when provided import.meta.url.
 *
 * __dirname is not available in ESM, and import.meta.dirname is only available in Node 20.11.0+.
 *
 * @param fileUrl (typically import.meta.url)
 * @returns __dirname
 */
export const getDirname = fileUrl => {
  return path.dirname(fileURLToPath(fileUrl));
};
