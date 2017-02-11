'use strict';
const assert = require('assert');
const _ = require('lodash');
const inquirer = require('inquirer');
const nock = require('nock');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const registryUrl = require('registry-url')();
const Router = require('../lib/router');
const helpers = require('./helpers');

describe('install route', () => {
  beforeEach(function () {
    this.sandbox = sinon.sandbox.create();
    this.insight = helpers.fakeInsight();
    this.env = helpers.fakeEnv();
    this.homeRoute = sinon.spy();
    this.router = new Router(this.env, this.insight);
    this.router.registerRoute('home', this.homeRoute);
    this.spawn = helpers.fakeCrossSpawn('close');
    this.router.registerRoute('install', proxyquire('../lib/routes/install', {
      'cross-spawn': this.spawn
    }));
    this.env.registerStub(_.noop, 'generator-unicorn');
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  describe('npm success with results', () => {
    beforeEach(function () {
      this.rows = [
        {key: ['yeoman-generator', 'generator-unicorn', 'some unicorn']},
        {key: ['yeoman-generator', 'generator-unrelated', 'some description']},
        {key: ['yeoman-generator', 'generator-unicorn-1', 'foo description']},
        {key: ['yeoman-generator', 'generator-foo', 'description with unicorn word']},
        {key: ['yeoman-generator', 'generator-blacklist-1', 'foo description']},
        {key: ['yeoman-generator', 'generator-blacklist-2', 'foo description']},
        {key: ['yeoman-generator', 'generator-blacklist-3', 'foo description']}
      ];

      this.blacklist = [
        'generator-blacklist-1',
        'generator-blacklist-2'
      ];

      this.pkgData = {
        author: {
          name: 'Simon'
        }
      };

      nock(registryUrl)
        .get('/-/_view/byKeyword')
          .query(true)
          .reply(200, {rows: this.rows})
        .filteringPath(/\/[^?]+$/g, '/pkg')
          .get('/pkg')
          .times(4)
          .reply(200, this.pkgData);

      nock('http://yeoman.io')
        .get('/blacklist.json')
        .times(2)
        .reply(200, this.blacklist);
    });

    afterEach(() => {
      nock.cleanAll();
    });

    it('filters already installed generators and match search term', function (done) {
      let call = 0;
      this.sandbox.stub(inquirer, 'prompt', arg => {
        call++;
        if (call === 1) {
          return Promise.resolve({searchTerm: 'unicorn'});
        }
        if (call === 2) {
          const choices = arg[0].choices;
          assert.equal(_.filter(choices, {value: 'generator-foo'}).length, 1);
          assert.equal(_.filter(choices, {value: 'generator-unicorn-1'}).length, 1);
          assert.equal(_.filter(choices, {value: 'generator-unicorn'}).length, 0);
          assert.equal(_.filter(choices, {value: 'generator-unrelated'}).length, 0);
          done();
        }

        return Promise.resolve({toInstall: 'home'});
      });

      this.router.navigate('install');
    });

    it('filters blacklisted generators and match search term', function (done) {
      let call = 0;
      this.sandbox.stub(inquirer, 'prompt', arg => {
        call++;
        if (call === 1) {
          return Promise.resolve({searchTerm: 'blacklist'});
        }
        if (call === 2) {
          const choices = arg[0].choices;
          assert.equal(_.filter(choices, {value: 'generator-blacklist-1'}).length, 0);
          assert.equal(_.filter(choices, {value: 'generator-blacklist-2'}).length, 0);
          assert.equal(_.filter(choices, {value: 'generator-blacklist-3'}).length, 1);
          done();
        }

        return Promise.resolve({toInstall: 'home'});
      });

      this.router.navigate('install');
    });

    it('allow redo the search', function (done) {
      let call = 0;
      this.sandbox.stub(inquirer, 'prompt', arg => {
        call++;
        if (call === 1) {
          return Promise.resolve({searchTerm: 'unicorn'});
        }
        if (call === 2) {
          return Promise.resolve({toInstall: 'install'});
        }
        if (call === 3) {
          assert.equal(arg[0].name, 'searchTerm');
          return Promise.resolve({searchTerm: 'unicorn'});
        }

        done();
        return Promise.resolve({toInstall: 'home'});
      });

      this.router.navigate('install');
    });

    it('allow going back home', function () {
      let call = 0;
      this.sandbox.stub(inquirer, 'prompt', () => {
        call++;
        if (call === 1) {
          return Promise.resolve({searchTerm: 'unicorn'});
        }

        return Promise.resolve({toInstall: 'home'});
      });

      return this.router.navigate('install').then(() => {
        sinon.assert.calledOnce(this.homeRoute);
      });
    });

    it('install a generator', function () {
      let call = 0;
      this.sandbox.stub(inquirer, 'prompt', () => {
        call++;
        if (call === 1) {
          return Promise.resolve({searchTerm: 'unicorn'});
        }
        if (call === 2) {
          return Promise.resolve({toInstall: 'generator-unicorn'});
        }

        return Promise.resolve({toInstall: 'home'});
      });

      return this.router.navigate('install').then(() => {
        sinon.assert.calledWith(this.spawn, 'npm', ['install', '--global', 'generator-unicorn'], {stdio: 'inherit'});
        sinon.assert.calledOnce(this.spawn);
        sinon.assert.calledOnce(this.homeRoute);
      });
    });
  });

  describe('npm success without results', () => {
    beforeEach(() => {
      nock(registryUrl)
        .get('/-/_view/byKeyword')
        .query(true)
        .reply(200, {
          rows: [
            {key: ['yeoman-generator', 'generator-unrelated', 'some description']},
            {key: ['yeoman-generator', 'generator-unrelevant', 'some description']}
          ]
        });
    });

    it('list options if search have no results', function (done) {
      let call = 0;

      this.sandbox.stub(inquirer, 'prompt', arg => {
        call++;

        if (call === 1) {
          return Promise.resolve({searchTerm: 'foo'});
        }

        if (call === 2) {
          const choices = arg[0].choices;
          assert.deepEqual(_.map(choices, 'value'), ['install', 'home']);
          done();
        }

        return Promise.resolve({toInstall: 'home'});
      });

      this.router.navigate('install');
    });
  });
});
