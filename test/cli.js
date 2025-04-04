'use strict';
import path from 'path';
import assert from 'assert';
import {execFile} from 'node:child_process';
import mockery from 'mockery';
import sinon from 'sinon';
import pkg from '../lib/utils/project-package.js';
import {getDirname} from '../lib/utils/node-shims.js';

const __dirname = getDirname(import.meta.url);

describe('bin', () => {
  describe('mocked', () => {
    beforeEach(async function () {
      this.origArgv = process.argv;
      this.origExit = process.exit;
      // eslint-disable-next-line node/no-unsupported-features/es-syntax
      const {createEnv} = await import('yeoman-environment');
      this.env = createEnv();

      mockery.enable({
        warnOnUnregistered: false
      });

      mockery.registerMock('yeoman-environment', {
        createEnv: () => this.env
      });
    });

    afterEach(function () {
      mockery.disable();
      process.argv = this.origArgv;
      process.exit = this.origExit;
    });

    it('should exit with status 1 if there were errors', function (done) {
      let called = false;
      process.exit = arg => {
        if (called) {
          // Exit can be called more than once
          return;
        }

        called = true;
        assert(arg, 1, 'exit code should be 1');
        done();
      };

      process.argv = ['node', path.resolve(__dirname, '..', pkg.bin.yo), 'non-existent'];

      sinon.stub(this.env, 'lookup');

      (async () => {
        // eslint-disable-next-line node/no-unsupported-features/es-syntax
        await import('../lib/cli.js');
      })();
    });
  });

  it('should return the version', cb => {
    const cp = execFile('node', [
      path.resolve(__dirname, '..', pkg.bin.yo),
      '--version'
    ]);
    const expected = pkg.version;

    cp.stdout.on('data', data => {
      assert.strictEqual(data.toString().replace(/\r\n|\n/g, ''), expected);
      cb();
    });
  });

  it('should output available generators when `--generators` flag is supplied', cb => {
    const cp = execFile('node', [path.resolve(__dirname, '..', pkg.bin.yo), '--generators']);

    cp.stdout.once('data', data => {
      assert(data.length > 0);
      assert(!/\[/.test(data));
      cb();
    });
  });

  it('should support the `--local-only` flag', cb => {
    const cp = execFile('node', [
      path.resolve(__dirname, '..', pkg.bin.yo),
      '--generators',
      '--local-only'
    ]);

    cp.stdout.once('data', data => {
      assert(data.length > 0);
      assert(!/\[/.test(data));
      cb();
    });
  });
});
