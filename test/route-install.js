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
const {default: inputPrompt} = await esmocha.mock('@inquirer/input');
const {default: inquirer} = await esmocha.mock('inquirer');
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
      if (process.platform === 'darwin') {
        this.skip();
      }

      inputPrompt.mockResolvedValueOnce('unicorn');
      inquirer.prompt.mockResolvedValueOnce({toInstall: 'home'});

      await this.router.navigate('install');

      expect(inquirer.prompt).toHaveBeenLastCalledWith(expect.objectContaining({
        choices: expect.arrayContaining([
          expect.objectContaining({value: 'generator-foo'}),
          expect.objectContaining({value: 'generator-unicorn-1'}),
          expect.not.objectContaining({value: 'generator-unicorn'}),
          expect.not.objectContaining({value: 'generator-unrelated'}),
        ]),
      }));
      expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    });

    it('filters blacklisted generators and match search term', async function () {
      if (process.platform === 'darwin') {
        this.skip();
      }

      inputPrompt.mockReturnValue('blacklist');
      inquirer.prompt.mockResolvedValue({toInstall: 'home'});

      await this.router.navigate('install');

      expect(inquirer.prompt).toHaveBeenLastCalledWith(expect.objectContaining({
        choices: expect.arrayContaining([
          expect.objectContaining({value: 'generator-blacklist-3'}),
          expect.not.objectContaining({value: 'generator-blacklist-1'}),
          expect.not.objectContaining({value: 'generator-blacklist-2'}),
        ]),
      }));
    });

    it('allow redo the search', async function () {
      let call = 0;
      inputPrompt.mockResolvedValueOnce('unicorn').mockResolvedValueOnce('unicorn');
      inquirer.prompt.mockImplementation(async () => {
        call++;
        if (call === 1) {
          return {toInstall: 'install'};
        }

        return {toInstall: 'home'};
      });

      await this.router.navigate('install');
    });

    it('allow going back home', function () {
      inputPrompt.mockResolvedValueOnce('unicorn');
      inquirer.prompt.mockImplementation(() => Promise.resolve({toInstall: 'home'}));

      return this.router.navigate('install').then(() => {
        expect(this.homeRoute).toHaveBeenCalledTimes(1);
      });
    });

    it('install a generator', function () {
      let call = 0;
      inputPrompt.mockResolvedValueOnce('unicorn');
      inquirer.prompt.mockImplementation(() => {
        call++;
        if (call === 1) {
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
      inputPrompt.mockResolvedValueOnce('foo');
      inquirer.prompt.mockResolvedValueOnce({toInstall: 'home'});

      await this.router.navigate('install');

      expect(inquirer.prompt).toHaveBeenCalledTimes(1);
      expect(inquirer.prompt).toHaveBeenLastCalledWith(expect.objectContaining({
        choices: [
          expect.objectContaining({value: 'install'}),
          expect.objectContaining({value: 'home'}),
        ],
      }));
    });
  });
});
