import path from 'node:path';
import assert from 'node:assert';
import process from 'node:process';
import {execFile} from 'node:child_process';
import sinon from 'sinon';
import pkg from '../lib/utils/project-package.js';
import {getDirname} from '../lib/utils/node-shims.js';

const __dirname = getDirname(import.meta.url);

// Disable update-notifier
process.env.NODE_ENV = 'test';

describe('bin', () => {
  describe('mocked', () => {
    beforeEach(async function () {
      this.origArgv = process.argv;
      this.origExit = process.exit;
      const {createEnv} = await import('yeoman-environment');
      this.env = createEnv();
    });

    afterEach(function () {
      process.argv = this.origArgv;
      process.exit = this.origExit;
    });

    it('should exit with status 1 if there were errors', function (done) {
      let called = false;
      process.exit = argument => {
        if (called) {
          // Exit can be called more than once
          return;
        }

        called = true;
        assert.ok(argument, 1, 'exit code should be 1');
        done();
      };

      process.argv = ['node', path.resolve(__dirname, '..', pkg.bin.yo), 'non-existent'];

      sinon.stub(this.env, 'lookup');

      (async () => {
        await import('../lib/cli.js');
      })();
    });
  });

  it('should return the version', callback => {
    const cp = execFile('node', [
      path.resolve(__dirname, '..', pkg.bin.yo),
      '--version',
    ]);
    const expected = pkg.version;

    cp.stdout.on('data', data => {
      assert.strictEqual(data.toString().replaceAll(/\r\n|\n/g, ''), expected);
      callback();
    });
  });

  it('should output available generators when `--generators` flag is supplied', callback => {
    const cp = execFile('node', [path.resolve(__dirname, '..', pkg.bin.yo), '--generators']);

    cp.stdout.once('data', data => {
      assert.ok(data.length > 0);
      assert.ok(!/\[/.test(data));
      callback();
    });
  });

  it('should support the `--local-only` flag', callback => {
    const cp = execFile('node', [
      path.resolve(__dirname, '..', pkg.bin.yo),
      '--generators',
      '--local-only',
    ]);

    cp.stdout.once('data', data => {
      assert.ok(data.length > 0);
      assert.ok(!/\[/.test(data));
      callback();
    });
  });
});
