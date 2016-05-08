'use strict';
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var inquirer = require('inquirer');
var Promise = require('pinkie-promise');
var Router = require('../lib/router');
var helpers = require('./helpers');

describe('help route', function () {
  beforeEach(function () {
    this.sandbox = sinon.sandbox.create();
    this.insight = helpers.fakeInsight();
    this.homeRoute = sinon.spy();
    this.router = new Router(sinon.stub(), this.insight);
    this.router.registerRoute('home', this.homeRoute);

    this.opn = sinon.stub();
    var helpRoute = proxyquire('../lib/routes/help', {
      opn: this.opn
    });
    this.router.registerRoute('help', helpRoute);
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  it('allow returning home', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whereTo: 'home'}));
    return this.router.navigate('help').then(function () {
      sinon.assert.calledOnce(this.homeRoute);
    }.bind(this));
  });

  it('track page and answer', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whereTo: 'home'}));
    return this.router.navigate('help').then(function () {
      sinon.assert.calledWith(this.insight.track, 'yoyo', 'help');
      sinon.assert.calledWith(this.insight.track, 'yoyo', 'help', {whereTo: 'home'});
    }.bind(this));
  });

  it('open urls in browsers', function () {
    var url = 'http://yeoman.io';
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whereTo: url}));
    return this.router.navigate('help').then(function () {
      sinon.assert.calledWith(this.opn, url);
      sinon.assert.calledOnce(this.opn);
    }.bind(this));
  });
});
