import assert from 'node:assert';
import {esmocha} from 'esmocha';
import sinon from 'sinon';
import _ from 'lodash';
import inquirer from 'inquirer';
import Router from '../lib/router.js';

const globalConfig = {
  remove: sinon.stub(),
  removeAll: sinon.stub(),
  getAll() {
    return {
      'generator-phoenix': {},
      'generator-unicorn': {},
    };
  },
};

await esmocha.mock('../lib/utils/global-config.js', {default: globalConfig});
const {clearConfig} = (await import('../lib/routes/clear-config.js'));
esmocha.reset();

describe('clear config route', () => {
  beforeEach(async function () {
    this.sandbox = sinon.createSandbox();
    this.globalConfig = globalConfig;
    const config_ = {
      get() {
        return {
          unicorn: 20,
          phoenix: 10,
        };
      },
    };
    this.homeRoute = sinon.stub().returns(Promise.resolve());
    this.router = new Router(sinon.stub(), config_);
    this.router.registerRoute('home', this.homeRoute);

    this.router.registerRoute('clearConfig', clearConfig);
    this.router.generators = {
      'generator-unicorn': {
        name: 'generator-unicorn',
        prettyName: 'Unicorn',
        namespace: 'unicorn:app',
      },
      'generator-foo': {
        name: 'generator-foo',
        prettyName: 'Foo',
        namespace: 'foo:app',
      },
    };
  });

  afterEach(function () {
    this.sandbox.restore();
    esmocha.clearAllMocks();
  });

  it('allow returning home', async function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: 'home'}));

    await this.router.navigate('clearConfig');

    sinon.assert.calledOnce(this.homeRoute);
  });

  it('allows clearing a generator and return user to home screen', async function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: 'foo'}));

    await this.router.navigate('clearConfig');

    sinon.assert.calledOnce(this.globalConfig.remove);
    sinon.assert.calledWith(this.globalConfig.remove, 'foo');
    sinon.assert.calledOnce(this.homeRoute);
  });

  it('allows clearing all generators and return user to home screen', async function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: '*'}));

    await this.router.navigate('clearConfig');

    sinon.assert.calledOnce(this.globalConfig.removeAll);
    sinon.assert.calledOnce(this.homeRoute);
  });

  it('shows generator with global config entry', async function () {
    let choices = [];

    this.sandbox.stub(inquirer, 'prompt').callsFake(argument => {
      ({choices} = argument[0]);
      return Promise.resolve({whatNext: 'foo'});
    });

    await this.router.navigate('clearConfig');

    // Clear all generators entry is present
    assert.ok(_.find(choices, {value: '*'}));

    assert.ok(_.find(choices, {value: 'generator-unicorn'}));
    assert.ok(_.find(choices, {value: 'generator-phoenix'}));
    assert.ok(_.find(choices, {name: 'Unicorn'}));
    assert.ok(
      _.find(choices, {name: 'phoenix\u001B[31m (not installed anymore)\u001B[39m'})
      || _.find(choices, {name: 'phoenix (not installed anymore)'}),
    );
  });
});
