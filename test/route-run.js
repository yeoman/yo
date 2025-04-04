'use strict';
import assert from 'assert';
import fs from 'fs';
import sinon from 'sinon';
import Configstore from 'configstore';
import Router from '../lib/router.js';
import {run as runRoute} from '../lib/routes/run.js';
import {fakeEnv} from './helpers.js';

const conf = new Configstore('yoyo-test-purposes', {
  generatorRunCount: {}
});

describe('run route', () => {
  beforeEach(async function () {
    this.env = await fakeEnv();
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
