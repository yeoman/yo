/*global describe, it, beforeEach, afterEach */
'use strict';
var fs = require('fs');
var path = require('path');
var execFile = require('child_process').execFile;
var spawn = require('child_process').spawn;
var assert = require('assert');
var pkg = require('../package.json');
var eol = require('os').EOL;
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
      var proc = spawn('node', [path.join(__dirname, '../', pkg.bin.yo), 'notexisting']);
      proc.on('exit', function (code) {
        assert(code, 1, 'exit code should be 1');
        cb();
      });
    });
  });

  it('should return the version', function (cb) {
    var cp = execFile('node', [path.join(__dirname, '../', pkg.bin.yo), '--version', '--no-insight', '--no-update-notifier']);
    var expected = pkg.version + eol;

    cp.stdout.on('data', function (data) {
      assert.equal(data, expected);
      cb();
    });
  });
});
