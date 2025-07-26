import assert from 'node:assert';
import fs from 'node:fs';
import sinon from 'sinon';
import globalConfig from '../lib/utils/global-config.js';

describe('global config', () => {
  beforeEach(function () {
    this.sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  describe('.getAll()', () => {
    it('when config file exists', function () {
      this.sandbox.stub(fs, 'existsSync').returns(true);
      this.sandbox.stub(fs, 'readFileSync').returns('{"foo": "bar"}');
      assert.deepStrictEqual(globalConfig.getAll(), {foo: 'bar'});
    });

    it('when config file doesn\'t exists', function () {
      this.sandbox.stub(fs, 'existsSync').returns(false);
      assert.deepStrictEqual(globalConfig.getAll(), {});
    });
  });

  describe('.hasContent()', () => {
    it('when config is present', function () {
      this.sandbox.stub(fs, 'existsSync').returns(true);
      this.sandbox.stub(fs, 'readFileSync').returns('{"foo": "bar"}');
      assert.ok(globalConfig.hasContent());
    });

    it('when config is not present', function () {
      this.sandbox.stub(fs, 'existsSync').returns(true);
      this.sandbox.stub(fs, 'readFileSync').returns('{}');
      assert.ok(!globalConfig.hasContent());
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
