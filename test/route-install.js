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
    this.sandbox = sinon.createSandbox();
    this.env = helpers.fakeEnv();
    this.homeRoute = sinon.stub().returns(Promise.resolve());
    this.router = new Router(this.env);
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
      this.packages = [
        {
          name: 'generator-unicorn',
          description: 'some unicorn'
        },
        {
          name: 'generator-unrelated',
          description: 'some description'
        },
        {
          name: 'generator-unicorn-1',
          description: 'foo description'
        },
        {
          name: 'generator-foo',
          description: 'description with unicorn word'
        },
        {
          name: 'generator-blacklist-1',
          description: 'foo description'
        },
        {
          name: 'generator-blacklist-2',
          description: 'foo description'
        },
        {
          name: 'generator-blacklist-3',
          description: 'foo description'
        }
      ];

      this.blacklist = [
        'generator-blacklist-1',
        'generator-blacklist-2'
      ];

      this.pkgData = {
        'dist-tags': {
          latest: '1.0.0'
        },
        versions: {
          '1.0.0': {
            name: 'test'
          }
        }
      };

      nock(registryUrl)
        .get('/-/v1/search')
        .query(true)
        .reply(200, {objects: this.packages.map(data => ({package: data}))})
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
      this.sandbox.stub(inquirer, 'prompt').callsFake(arg => {
        call++;
        if (call === 1) {
          return Promise.resolve({searchTerm: 'unicorn'});
        }

        if (call === 2) {
          const {choices} = arg[0];
          assert.strictEqual(_.filter(choices, {value: 'generator-foo'}).length, 1);
          assert.strictEqual(_.filter(choices, {value: 'generator-unicorn-1'}).length, 1);
          assert.strictEqual(_.filter(choices, {value: 'generator-unicorn'}).length, 0);
          assert.strictEqual(_.filter(choices, {value: 'generator-unrelated'}).length, 0);
          done();
        }

        return Promise.resolve({toInstall: 'home'});
      });

      this.router.navigate('install');
    });

    it('filters blacklisted generators and match search term', function (done) {
      let call = 0;
      this.sandbox.stub(inquirer, 'prompt').callsFake(arg => {
        call++;
        if (call === 1) {
          return Promise.resolve({searchTerm: 'blacklist'});
        }

        if (call === 2) {
          const {choices} = arg[0];
          assert.strictEqual(_.filter(choices, {value: 'generator-blacklist-1'}).length, 0);
          assert.strictEqual(_.filter(choices, {value: 'generator-blacklist-2'}).length, 0);
          assert.strictEqual(_.filter(choices, {value: 'generator-blacklist-3'}).length, 1);
          done();
        }

        return Promise.resolve({toInstall: 'home'});
      });

      this.router.navigate('install');
    });

    it('allow redo the search', function (done) {
      let call = 0;
      this.sandbox.stub(inquirer, 'prompt').callsFake(arg => {
        call++;
        if (call === 1) {
          return Promise.resolve({searchTerm: 'unicorn'});
        }

        if (call === 2) {
          return Promise.resolve({toInstall: 'install'});
        }

        if (call === 3) {
          assert.strictEqual(arg[0].name, 'searchTerm');
          return Promise.resolve({searchTerm: 'unicorn'});
        }

        done();
        return Promise.resolve({toInstall: 'home'});
      });

      this.router.navigate('install');
    });

    it('allow going back home', function () {
      let call = 0;
      this.sandbox.stub(inquirer, 'prompt').callsFake(() => {
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
      this.sandbox.stub(inquirer, 'prompt').callsFake(() => {
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
        .get('/-/v1/search')
        .query(true)
        .reply(200, {
          objects: [
            {
              package: {
                name: 'generator-unrelated',
                description: 'some description'
              }
            },
            {
              package: {
                name: 'generator-unrelevant',
                description: 'some description'
              }
            }
          ]
        });
    });

    it('list options if search have no results', function (done) {
      let call = 0;

      this.sandbox.stub(inquirer, 'prompt').callsFake(arg => {
        call++;

        if (call === 1) {
          return Promise.resolve({searchTerm: 'foo'});
        }

        if (call === 2) {
          const {choices} = arg[0];
          assert.deepStrictEqual(_.map(choices, 'value'), ['install', 'home']);
          done();
        }

        return Promise.resolve({toInstall: 'home'});
      });

      this.router.navigate('install');
    });
  });
});
