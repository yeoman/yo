/*global describe, it */
'use strict';

var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var assert = require('assert');
var pkg = require(path.join(__dirname, '../package.json'));
var eol = require('os').EOL;

describe('bin', function () {
  it('should exit with status 0 if there were no errors', function (cb) {
    var bin = spawn('node', [path.join(__dirname, '../', pkg.bin.yo)]);

    bin.on('exit', function (code) {
      assert.equal(code, 0);
      cb();
    });
  });

  it('should exit with status 1 if there were errors', function (cb) {
    var bin = spawn('node', [path.join(__dirname, '../', pkg.bin.yo), 'notexisting']);

    bin.on('exit', function (code) {
      assert.equal(code, 1);
      cb();
    });
  });

  it('should return the version', function (cb) {
    var bin = spawn('node', [path.join(__dirname, '../', pkg.bin.yo), '--version']);
    var expected = pkg.version + eol;

    bin.stdout.on('data', function (data) {
      assert.equal(data, expected);
      cb();
    });
  });
});
