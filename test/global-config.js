'use strict';
var assert = require('assert');
var proxyquire = require('proxyquire');
var sinon = require('sinon');

describe.only('global config', function () {
  beforeEach(function () {
    this.sandbox = sinon.sandbox.create();

    this.fs = {
      existsSync: sinon.stub(),
      readFileSync: sinon.stub(),
      writeFileSync: sinon.stub()
    };
    this.globalConfig = proxyquire('../lib/utils/global-config', {
      fs: this.fs
    });
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  describe('.getAll()', function () {
    it('when config file exists', function () {
      this.fs.existsSync.returns(true);
      this.fs.readFileSync.returns('{"foo": "bar"}');

      assert.deepEqual(this.globalConfig.getAll(), {foo:'bar'});
      sinon.assert.calledOnce(this.fs.existsSync);
      sinon.assert.calledOnce(this.fs.readFileSync);
    });

    it('when config file doesn\'t exists', function () {
      this.fs.existsSync.returns(false);

      assert.deepEqual(this.globalConfig.getAll(), {});
      sinon.assert.calledOnce(this.fs.existsSync);
      sinon.assert.notCalled(this.fs.readFileSync);
    });
  });

  describe('.hasContent()', function () {
    it('when config is present', function () {
      this.fs.existsSync.returns(true);
      this.fs.readFileSync.returns('{"foo": "bar"}');

      assert.ok(this.globalConfig.hasContent());
    });

    it('when config is not present', function () {
      this.fs.existsSync.returns(true);
      this.fs.readFileSync.returns('{}');

      assert.ok(!this.globalConfig.hasContent());
    });
  });

  it('.remove()', function () {
    this.fs.existsSync.returns(true);
    this.fs.readFileSync.returns('{"foo": "bar", "baz": "qux"}');

    this.globalConfig.remove('foo');
    sinon.assert.calledOnce(this.fs.readFileSync);
    assert.deepEqual(JSON.parse(this.fs.writeFileSync.getCall(0).args[1]), {baz:'qux'});
  });

  it('.removeAll()', function () {
    this.globalConfig.removeAll();
    sinon.assert.calledOnce(this.fs.writeFileSync);
    assert.equal(this.fs.writeFileSync.getCall(0).args[1], '{}');
  });
});
