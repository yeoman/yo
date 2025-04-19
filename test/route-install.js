import assert from 'node:assert';
import {esmocha, expect} from 'esmocha';
import {TestAdapter} from '@yeoman/adapter/testing';
import _ from 'lodash';
import nock from 'nock';
import registryUrlFactory from 'registry-url';
import Router from '../lib/router.js';
import * as helpers from './helpers.js';

const orderedAnswers = ({toInstall, searchTerm}) => ({
  _searchTerm: searchTerm,
  get searchTerm() {
    return this._searchTerm.shift();
  },
  _toInstall: toInstall,
  get toInstall() {
    return this._toInstall.shift();
  },
});

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
await esmocha.mock('../lib/deny-list.js', {
  default: [
    'generator-blacklist-1',
    'generator-blacklist-2',
  ],
});
const {install} = await import('../lib/routes/install.js');
esmocha.reset();
_.memoize.mockRestore();

const registryUrl = registryUrlFactory();

describe('install route', () => {
  /** @type {TestAdapter} */
  let adapter;

  beforeEach(async function () {
    this.env = await helpers.fakeEnv();
    this.homeRoute = esmocha.fn().mockResolvedValue();
    adapter = new TestAdapter();
    this.router = new Router({adapter, env: this.env});
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
    });

    it('filters already installed generators and match search term', async function () {
      adapter.addAnswers(orderedAnswers({searchTerm: ['unicorn'], toInstall: ['home']}));

      await this.router.navigate('install');

      expect(adapter.calls).toHaveLength(2);
      const {choices} = adapter.calls[1].question;
      expect(choices).toMatchObject(expect.arrayContaining([
        expect.objectContaining({value: 'generator-foo'}),
        expect.objectContaining({value: 'generator-unicorn-1'}),
      ]));
      expect(choices).toMatchObject(expect.not.arrayContaining([expect.objectContaining({value: 'generator-unicorn'})]));
      expect(choices).toMatchObject(expect.not.arrayContaining([expect.objectContaining({value: 'generator-unrelated'})]));
    });

    it('filters blacklisted generators and match search term', async function () {
      adapter.addAnswers(orderedAnswers({searchTerm: ['blacklist'], toInstall: ['home']}));

      await this.router.navigate('install');

      const {choices} = adapter.calls[1].question;
      assert.strictEqual(_.filter(choices, {value: 'generator-blacklist-1'}).length, 0);
      assert.strictEqual(_.filter(choices, {value: 'generator-blacklist-2'}).length, 0);
      assert.strictEqual(_.filter(choices, {value: 'generator-blacklist-3'}).length, 1);
    });

    it('allow redo the search', async function () {
      adapter.addAnswers(orderedAnswers({searchTerm: ['unicorn', 'unicorn'], toInstall: ['install', 'home']}));

      await this.router.navigate('install');

      expect(adapter.calls[2].question.name).toBe('searchTerm');
    });

    it('allow going back home', async function () {
      adapter.addAnswers(orderedAnswers({searchTerm: ['unicorn'], toInstall: ['home']}));

      await this.router.navigate('install');

      expect(this.homeRoute).toHaveBeenCalledTimes(1);
    });

    it('install a generator', async function () {
      adapter.addAnswers(orderedAnswers({searchTerm: ['unicorn'], toInstall: ['generator-unicorn', 'home']}));

      await this.router.navigate('install');

      expect(spawn.default).toHaveBeenCalledTimes(1);
      expect(spawn.default).toHaveBeenCalledWith('npm', ['install', '--global', 'generator-unicorn'], {stdio: 'inherit'});
      expect(this.homeRoute).toHaveBeenCalledTimes(1);
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
      adapter.addAnswers(orderedAnswers({searchTerm: ['foo'], toInstall: ['home']}));

      await this.router.navigate('install');

      const {choices} = adapter.calls[1].question;
      assert.deepStrictEqual(_.map(choices, 'value'), ['install', 'home']);
    });
  });
});
