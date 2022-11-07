'use strict';
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const inquirer = require('inquirer');
const Router = require('../lib/router');

describe('help route', () => {
  beforeEach(function () {
    this.sandbox = sinon.createSandbox();
    this.homeRoute = sinon.stub().returns(Promise.resolve());
    this.router = new Router(sinon.stub());
    this.router.registerRoute('home', this.homeRoute);
    this.open = sinon.stub();
    const helpRoute = proxyquire('../lib/routes/help', {
      open: this.open
    });
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
