/*global describe, it, before, beforeEach, after, afterEach */
'use strict';
var fs = require('fs');
var path = require('path');
var execFile = require('child_process').execFile;
var assert = require('assert');
var pkg = require('../package.json');
var mockery = require('mockery');

describe('bin', function () {
  describe('mocked', function () {
    beforeEach(function () {
      this.origArgv = process.argv;
      this.origExit = process.exit;
      this.env = require('yeoman-generator')();

      mockery.enable({
        warnOnUnregistered: false
      });

      mockery.registerMock('yeoman-generator', function () {
        return this.env;
      }.bind(this));
    });

    afterEach(function () {
      mockery.disable();
      process.argv = this.origArgv;
      process.exit = this.origExit;
    });

    it('should exit with status 1 if there were errors', function (cb) {
      var called = false;
      process.exit = function (arg) {
        if (called) {
          // Exit can be called more than once.
          return;
        }

        called = true;
        assert(arg, 1, 'exit code should be 1');
        cb();
      };
      process.argv = ['node', path.join(__dirname, '../', pkg.bin.yo), 'notexisting'];
      this.env.lookup = function () { /* noop */ };
      require('../cli');
    });
  });

  it('should return the version', function (cb) {
    var cp = execFile('node', [path.join(__dirname, '../', pkg.bin.yo), '--version', '--no-insight', '--no-update-notifier']);
    var expected = pkg.version;

    cp.stdout.on('data', function (data) {
      assert.equal(data.replace(/\r\n|\n/g, ''), expected);
      cb();
    });
  });

  it('should output available generators when `--generators` flag is supplied', function (cb) {
    var cp = execFile('node', [path.join(__dirname, '../', pkg.bin.yo), '--generators', '--no-insight', '--no-update-notifier']);

    cp.stdout.once('data', function (data) {
      assert(data.length > 0);
      assert(!/\[/.test(data));
      cb();
    });
  });
});
