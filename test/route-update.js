'use strict';
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const inquirer = require('inquirer');
const Router = require('../lib/router');
const helpers = require('./helpers');

describe('update route', () => {
  beforeEach(function () {
    this.sandbox = sinon.createSandbox();

    this.env = helpers.fakeEnv();

    this.homeRoute = sinon.stub().returns(Promise.resolve());
    this.router = new Router(this.env);
    this.router.registerRoute('home', this.homeRoute);

    this.crossSpawn = helpers.fakeCrossSpawn('close');
    const updateRoute = proxyquire('../lib/routes/update', {
      'cross-spawn': this.crossSpawn
    });
    this.router.registerRoute('update', updateRoute);
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
