'use strict';
import * as td from 'testdouble';
import sinon from 'sinon';
import inquirer from 'inquirer';
import Router from '../lib/router.js';
import * as helpers from './helpers.js';

describe('update route', () => {
  beforeEach(async function () {
    this.sandbox = sinon.createSandbox();

    this.env = await helpers.fakeEnv();

    this.homeRoute = sinon.stub().returns(Promise.resolve());
    this.router = new Router(this.env);
    this.router.registerRoute('home', this.homeRoute);

    this.crossSpawn = helpers.fakeCrossSpawn('close');
    await td.replaceEsm('cross-spawn', undefined, this.crossSpawn);

    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    const {update} = await import('../lib/routes/update.js');

    this.router.registerRoute('update', update);
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  it('allows updating generators and return user to home screen', function () {
    const generators = ['generator-cat', 'generator-unicorn'];
    this.sandbox.stub(inquirer, 'prompt').returns(
      Promise.resolve({generators})
    );
    return this.router.navigate('update').then(() => {
      sinon.assert.calledWith(
        this.crossSpawn,
        'npm',
        ['install', '--global', ...generators]
      );
      sinon.assert.calledOnce(this.homeRoute);
      sinon.assert.calledOnce(this.env.lookup);
    });
  });
});
