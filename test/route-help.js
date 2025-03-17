'use strict';
import * as td from 'testdouble';
import sinon from 'sinon';
import inquirer from 'inquirer';
import Router from '../lib/router.js';

describe('help route', () => {
  beforeEach(async function () {
    this.sandbox = sinon.createSandbox();
    this.homeRoute = sinon.stub().returns(Promise.resolve());
    this.router = new Router(sinon.stub());
    this.router.registerRoute('home', this.homeRoute);
    this.open = sinon.stub();
    await td.replaceEsm('open', undefined, this.open);

    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    const {help: helpRoute} = await import('../lib/routes/help.js');

    this.router.registerRoute('help', helpRoute);
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  it('allow returning home', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whereTo: 'home'}));
    return this.router.navigate('help').then(() => {
      sinon.assert.calledOnce(this.homeRoute);
    });
  });

  it('open urls in browsers', function () {
    const url = 'http://yeoman.io';
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whereTo: url}));
    return this.router.navigate('help').then(() => {
      sinon.assert.calledWith(this.open, url);
      sinon.assert.calledOnce(this.open);
    });
  });
});
