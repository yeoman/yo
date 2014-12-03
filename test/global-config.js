'use strict';
var assert = require('assert');
var fs = require('fs');
var sinon = require('sinon');
var globalConfig = require('../lib/utils/global-config');

describe('global config', function () {
  beforeEach(function () {
    this.sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  describe('.getAll()', function () {
    it('when config file exists', function () {
      this.sandbox.stub(fs, 'existsSync').returns(true);
      this.sandbox.stub(fs, 'readFileSync').returns('{"foo": "bar"}');
      assert.deepEqual(globalConfig.getAll(), { foo: 'bar' });
    });

    it('when config file doesn\'t exists', function () {
      this.sandbox.stub(fs, 'existsSync').returns(false);
      assert.deepEqual(globalConfig.getAll(), {});
    });
  });

  describe('.hasContent()', function () {
    it('when config is present', function () {
      this.sandbox.stub(fs, 'existsSync').returns(true);
      this.sandbox.stub(fs, 'readFileSync').returns('{"foo": "bar"}');
      assert(globalConfig.hasContent());
    });

    it('when config is not present', function () {
      this.sandbox.stub(fs, 'existsSync').returns(true);
      this.sandbox.stub(fs, 'readFileSync').returns('{}');
      assert(!globalConfig.hasContent());
    });
  });

  it('.remove()', function () {
    this.sandbox.stub(fs, 'existsSync').returns(true);
    this.sandbox.stub(fs, 'writeFileSync');
    this.sandbox.stub(fs, 'readFileSync').returns('{"foo": "bar", "baz": "qux"}');

    globalConfig.remove('foo');
    sinon.assert.calledWith(fs.writeFileSync, globalConfig.path, '{\n  "baz": "qux"\n}');
  });

  it('.removeAll()', function () {
    this.sandbox.stub(fs, 'writeFileSync');
    globalConfig.removeAll();
    sinon.assert.calledWith(fs.writeFileSync, globalConfig.path, '{}');
  });
});
