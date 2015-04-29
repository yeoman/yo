'use strict';
var assert = require('assert');
var fs = require('fs');
var sinon = require('sinon');
var Configstore = require('configstore');
var conf = new Configstore('yoyo-test-purposes', {
  generatorRunCount: {}
});
var Router = require('../lib/router');
var runRoute = require('../lib/routes/run');
var helpers = require('./helpers');

describe('run route', function () {
  beforeEach(function () {
    this.insight = helpers.fakeInsight();
    this.env = helpers.fakeEnv();
    this.router = new Router(this.env, this.insight, conf);
    this.router.registerRoute('run', runRoute);
  });

  afterEach(function () {
    fs.unlinkSync(conf.path);
  });

  it('run a generator', function () {
    assert.equal(conf.get('generatorRunCount').foo, undefined);
    this.router.navigate('run', 'foo:app');

    assert.equal(conf.get('generatorRunCount').foo, 1);
    sinon.assert.calledWith(this.insight.track, 'yoyo', 'run', 'foo');
    sinon.assert.calledWith(this.env.run, 'foo:app');

    this.router.navigate('run', 'foo:app');
    assert.equal(conf.get('generatorRunCount').foo, 2);
  });
});
