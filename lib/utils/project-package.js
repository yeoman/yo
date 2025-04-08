// Directly requiring package.json is not supported in ESM
// and JSON imports are still experimental in Node.
// This is the workaround.
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
export default require('../../package.json');
