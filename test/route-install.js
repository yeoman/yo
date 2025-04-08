import assert from 'node:assert';
import process from 'node:process';
import {esmocha, expect} from 'esmocha';
import _ from 'lodash';
import nock from 'nock';
import registryUrlFactory from 'registry-url';
import Router from '../lib/router.js';
import * as helpers from './helpers.js';

const spawn = await esmocha.mock('cross-spawn', {
  default: esmocha.fn().mockReturnValue({
    on: esmocha.fn().mockImplementation(function (name, callback) {
      if (name === 'close') {
        callback();
      }

      return this;
    }),
  }),
});

esmocha.spyOn(_, 'memoize').mockImplementation(function_ => function_);
const {default: inquirer} = await esmocha.mock('inquirer');
const {install} = await import('../lib/routes/install.js');
esmocha.reset();
_.memoize.mockRestore();

const registryUrl = registryUrlFactory();

describe('install route', () => {
  beforeEach(async function () {
    this.env = await helpers.fakeEnv();
    this.homeRoute = esmocha.fn().mockResolvedValue();
    this.router = new Router(this.env);
    this.router.registerRoute('home', this.homeRoute);

    this.router.registerRoute('install', install);
    this.env.registerStub(_.noop, 'generator-unicorn');
  });

  afterEach(() => {
    esmocha.clearAllMocks();
    nock.cleanAll();
  });

  describe('npm success with results', () => {
    beforeEach(function () {
      this.packages = [
        {
          name: 'generator-unicorn',
          description: 'some unicorn',
        },
        {
          name: 'generator-unrelated',
          description: 'some description',
        },
        {
          name: 'generator-unicorn-1',
          description: 'foo description',
        },
        {
          name: 'generator-foo',
          description: 'description with unicorn word',
        },
        {
          name: 'generator-blacklist-1',
          description: 'foo description',
        },
        {
          name: 'generator-blacklist-2',
          description: 'foo description',
        },
        {
          name: 'generator-blacklist-3',
          description: 'foo description',
        },
      ];

      this.blacklist = [
        'generator-blacklist-1',
        'generator-blacklist-2',
      ];

      this.pkgData = {
        'dist-tags': {
          latest: '1.0.0',
        },
        versions: {
          '1.0.0': {
            name: 'test',
          },
        },
      };

      nock(registryUrl)
        .get('/-/v1/search')
        .query(true)
        .times(4)
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

    it('filters already installed generators and match search term', function (done) {
      if (process.platform === 'darwin') {
        this.skip();
      }

      let call = 0;
      inquirer.prompt.mockImplementation(argument => {
        call++;
        if (call === 1) {
          return Promise.resolve({searchTerm: 'unicorn'});
        }

        if (call === 2) {
          const {choices} = argument[0];
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
      if (process.platform === 'darwin') {
        this.skip();
      }

      let call = 0;
      inquirer.prompt.mockImplementation(argument => {
        call++;
        if (call === 1) {
          return Promise.resolve({searchTerm: 'blacklist'});
        }

        if (call === 2) {
          const {choices} = argument[0];
          assert.strictEqual(_.filter(choices, {value: 'generator-blacklist-1'}).length, 0);
          assert.strictEqual(_.filter(choices, {value: 'generator-blacklist-2'}).length, 0);
          assert.strictEqual(_.filter(choices, {value: 'generator-blacklist-3'}).length, 1);
          done();
        }

        return Promise.resolve({toInstall: 'home'});
      });

      this.router.navigate('install');
    });

    it('allow redo the search', async function () {
      let call = 0;
      inquirer.prompt.mockImplementation(async argument => {
        call++;
        if (call === 1) {
          return {searchTerm: 'unicorn'};
        }

        if (call === 2) {
          return {toInstall: 'install'};
        }

        if (call === 3) {
          assert.strictEqual(argument[0].name, 'searchTerm');
          return {searchTerm: 'unicorn'};
        }

        return {toInstall: 'home'};
      });

      await this.router.navigate('install');
    });

    it('allow going back home', function () {
      let call = 0;
      inquirer.prompt.mockImplementation(() => {
        call++;
        if (call === 1) {
          return Promise.resolve({searchTerm: 'unicorn'});
        }

        return Promise.resolve({toInstall: 'home'});
      });

      return this.router.navigate('install').then(() => {
        expect(this.homeRoute).toHaveBeenCalledTimes(1);
      });
    });

    it('install a generator', function () {
      let call = 0;
      inquirer.prompt.mockImplementation(() => {
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
        expect(spawn.default).toHaveBeenCalledTimes(1);
        expect(spawn.default).toHaveBeenCalledWith('npm', ['install', '--global', 'generator-unicorn'], {stdio: 'inherit'});
        expect(this.homeRoute).toHaveBeenCalledTimes(1);
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
                description: 'some description',
              },
            },
            {
              package: {
                name: 'generator-unrelevant',
                description: 'some description',
              },
            },
          ],
        });
    });

    it('list options if search have no results', async function () {
      let call = 0;

      inquirer.prompt.mockImplementation(argument => {
        call++;

        if (call === 1) {
          return Promise.resolve({searchTerm: 'foo'});
        }

        if (call === 2) {
          const {choices} = argument[0];
          assert.deepStrictEqual(_.map(choices, 'value'), ['install', 'home']);
        }

        return Promise.resolve({toInstall: 'home'});
      });

      await this.router.navigate('install');
    });
  });
});
