/*global describe, it */
'use strict';
var fs = require('fs');
var path = require('path');
var execFile = require('child_process').execFile;
var assert = require('assert');
var pkg = require('../package.json');
var eol = require('os').EOL;

describe('bin', function () {
  it.skip('should exit with status 1 if there were errors', function (cb) {
    var cp = execFile('node', [path.join(__dirname, '../', pkg.bin.yo), 'notexisting']);

    cp.on('exit', function (code) {
      assert.equal(code, 1);
      cb();
    });
  });

  it('should return the version', function (cb) {
    var cp = execFile('node', [path.join(__dirname, '../', pkg.bin.yo), '--version']);
    var expected = pkg.version + eol;

    cp.stdout.on('data', function (data) {
      assert.equal(data, expected);
      cb();
    });
  });
});
