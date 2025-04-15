import assert from 'node:assert';
import {esmocha} from 'esmocha';
import {TestAdapter} from '@yeoman/adapter/testing';
import sinon from 'sinon';
import _ from 'lodash';
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
  /** @type {TestAdapter} */
  let adapter;

  beforeEach(async function () {
    this.sandbox = sinon.createSandbox();
    this.globalConfig = globalConfig;
    const config = {
      get() {
        return {
          unicorn: 20,
          phoenix: 10,
        };
      },
    };
    this.homeRoute = sinon.stub().returns(Promise.resolve());
    adapter = new TestAdapter();
    this.router = new Router({adapter, env: sinon.stub(), config});
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
    this.sandbox.stub(adapter, 'prompt').returns(Promise.resolve({whatNext: 'home'}));

    await this.router.navigate('clearConfig');

    sinon.assert.calledOnce(this.homeRoute);
  });

  it('allows clearing a generator and return user to home screen', async function () {
    this.sandbox.stub(adapter, 'prompt').returns(Promise.resolve({whatNext: 'foo'}));

    await this.router.navigate('clearConfig');

    sinon.assert.calledOnce(this.globalConfig.remove);
    sinon.assert.calledWith(this.globalConfig.remove, 'foo');
    sinon.assert.calledOnce(this.homeRoute);
  });

  it('allows clearing all generators and return user to home screen', async function () {
    this.sandbox.stub(adapter, 'prompt').returns(Promise.resolve({whatNext: '*'}));

    await this.router.navigate('clearConfig');

    sinon.assert.calledOnce(this.globalConfig.removeAll);
    sinon.assert.calledOnce(this.homeRoute);
  });

  it('shows generator with global config entry', async function () {
    adapter.addAnswers({whatNext: 'foo'});

    await this.router.navigate('clearConfig');

    const {choices} = adapter.calls[0].question;
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
