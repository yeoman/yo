'use strict';
var _ = require('lodash');
var assert = require('assert');
var env = require('yeoman-environment');
var fs = require('fs');
var sinon = require('sinon');
var Configstore = require('configstore');
var conf = new Configstore('yoyo-test-purposes', {
  generatorRunCount: {}
});
var Router = require('../lib/router');
var runRoute = require('../lib/routes/run');

describe('run route', function () {
  beforeEach(function () {
    this.sandbox = sinon.sandbox.create();
    this.insight = {
      track: sinon.stub()
    };

    this.sandbox.stub(env.prototype, 'run');
    this.env = env.createEnv();

    this.router = new Router(this.env, this.insight, conf);
    this.router.registerRoute('run', runRoute);
  });

  afterEach(function () {
    fs.unlinkSync(conf.path);
    this.sandbox.restore();
  });

  it('run a generator', function () {
    assert.equal(conf.get('generatorRunCount')['foo:app'], undefined);
    this.router.navigate('run', 'foo:app');

    assert.equal(conf.get('generatorRunCount')['foo:app'], 1);
    sinon.assert.calledWith(this.insight.track, 'yoyo', 'run', 'foo');
    sinon.assert.calledWith(env.prototype.run, 'foo:app');

    this.router.navigate('run', 'foo:app');
    assert.equal(conf.get('generatorRunCount')['foo:app'], 2);
  });
});
