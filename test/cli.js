'use strict';
const path = require('path');
const assert = require('assert');
const {execFile} = require('child_process');
const mockery = require('mockery');
const sinon = require('sinon');
const pkg = require('../package.json');

describe('bin', () => {
  describe('mocked', () => {
    beforeEach(function () {
      this.origArgv = process.argv;
      this.origExit = process.exit;
      this.env = require('yeoman-environment').createEnv();

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

      sinon.stub(this.env, 'lookup').yields();

      require('../lib/cli'); // eslint-disable-line import/no-unassigned-import
    });
  });

  it('should return the version', cb => {
    const cp = execFile('node', [
      path.resolve(__dirname, '..', pkg.bin.yo),
      '--version',
      '--no-insight',
      '--no-update-notifier'
    ]);
    const expected = pkg.version;

    cp.stdout.on('data', data => {
      assert.strictEqual(data.toString().replace(/\r\n|\n/g, ''), expected);
      cb();
    });
  });

  it('should output available generators when `--generators` flag is supplied', cb => {
    const cp = execFile('node', [path.resolve(__dirname, '..', pkg.bin.yo), '--generators', '--no-insight', '--no-update-notifier']);

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
      '--local-only',
      '--no-insight',
      '--no-update-notifier'
    ]);

    cp.stdout.once('data', data => {
      assert(data.length > 0);
      assert(!/\[/.test(data));
      cb();
    });
  });
});
