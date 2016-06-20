'use strict';
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var inquirer = require('inquirer');
var Router = require('../lib/router');
var helpers = require('./helpers');

describe('update route', function () {
  beforeEach(function () {
    this.sandbox = sinon.sandbox.create();
    this.insight = helpers.fakeInsight();

    this.env = helpers.fakeEnv();

    this.homeRoute = sinon.spy();
    this.router = new Router(this.env, this.insight);
    this.router.registerRoute('home', this.homeRoute);

    this.crossSpawn = helpers.fakeCrossSpawn('close');
    var updateRoute = proxyquire('../lib/routes/update', {
      'cross-spawn': this.crossSpawn
    });
    this.router.registerRoute('update', updateRoute);
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  it('allows updating generators and return user to home screen', function () {
    var generators = ['generator-cat', 'generator-unicorn'];
    this.sandbox.stub(inquirer, 'prompt', function (arg, cb) {
      cb({generators: generators});
    });

    this.router.navigate('update');

    sinon.assert.calledWith(this.crossSpawn, 'npm', ['install', '-g'].concat(generators));
    sinon.assert.calledWith(this.insight.track, 'yoyo', 'update');
    sinon.assert.calledWith(this.insight.track, 'yoyo', 'updated');
    sinon.assert.calledOnce(this.homeRoute);
    sinon.assert.calledOnce(this.env.lookup);
  });

  it('allows updating generators from a custom source (type + url)', function () {
    var generatorData = {
      'generator-cat': {
        repository: {
          type: 'git',
          url: 'generator-cat'
        }
      }
    };
    this.router.generators = generatorData;
    var generators = Object.keys(generatorData);
    this.sandbox.stub(inquirer, 'prompt', function (arg, cb) {
      cb({generators: generators});
    });

    var uris = generators.map(function (generator) {
      return [generatorData[generator].repository.type, generatorData[generator].repository.url].join('+');
    });

    this.router.navigate('update');

    sinon.assert.calledWith(this.crossSpawn, 'npm', ['install', '-g'].concat(uris));
    sinon.assert.calledWith(this.insight.track, 'yoyo', 'update');
    sinon.assert.calledWith(this.insight.track, 'yoyo', 'updated');
    sinon.assert.calledOnce(this.homeRoute);
    sinon.assert.calledOnce(this.env.lookup);
  });

  it('allows updating generators from a custom source (repository)', function () {
    var generatorData = {
      'generator-cat': {
        repository: 'This-is-the-source'
      }
    };
    this.router.generators = generatorData;
    var generators = Object.keys(generatorData);
    this.sandbox.stub(inquirer, 'prompt', function (arg, cb) {
      cb({generators: generators});
    });

    var uris = generators.map(function (generator) {
      return generatorData[generator].repository;
    });

    this.router.navigate('update');

    sinon.assert.calledWith(this.crossSpawn, 'npm', ['install', '-g'].concat(uris));
    sinon.assert.calledWith(this.insight.track, 'yoyo', 'update');
    sinon.assert.calledWith(this.insight.track, 'yoyo', 'updated');
    sinon.assert.calledOnce(this.homeRoute);
    sinon.assert.calledOnce(this.env.lookup);
  });
});
