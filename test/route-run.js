'use strict';
const assert = require('assert');
const fs = require('fs');
const sinon = require('sinon');
const Configstore = require('configstore');
const Router = require('../lib/router');
const runRoute = require('../lib/routes/run');
const helpers = require('./helpers');

const conf = new Configstore('yoyo-test-purposes', {
  generatorRunCount: {}
});

describe('run route', () => {
  beforeEach(async function () {
    this.env = await helpers.fakeEnv();
    this.router = new Router(this.env, conf);
    this.router.registerRoute('run', runRoute);
  });

  afterEach(() => {
    fs.unlinkSync(conf.path);
  });

  it('run a generator', async function () {
    assert.strictEqual(conf.get('generatorRunCount').foo, undefined);
    await this.router.navigate('run', 'foo:app');

    assert.strictEqual(conf.get('generatorRunCount').foo, 1);
    sinon.assert.calledWith(this.env.run, 'foo:app');

    await this.router.navigate('run', 'foo:app');
    assert.strictEqual(conf.get('generatorRunCount').foo, 2);
  });
});
