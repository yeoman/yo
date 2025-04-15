import {esmocha, expect} from 'esmocha';
import {TestAdapter} from '@yeoman/adapter/testing';
import sinon from 'sinon';
import Router from '../lib/router.js';

const {default: open} = await esmocha.mock('open');
const {help: helpRoute} = await import('../lib/routes/help.js');
esmocha.reset();

describe('help route', () => {
  /** @type {TestAdapter} */
  let adapter;

  beforeEach(async function () {
    this.homeRoute = sinon.stub().returns(Promise.resolve());
    adapter = new TestAdapter();
    this.router = new Router({adapter, env: sinon.stub()});
    this.router.registerRoute('home', this.homeRoute);
    this.open = sinon.stub();
    this.router.registerRoute('help', helpRoute);
  });

  afterEach(() => {
    esmocha.clearAllMocks();
  });

  it('allow returning home', async function () {
    adapter.addAnswers({whereTo: 'home'});

    await this.router.navigate('help');

    sinon.assert.calledOnce(this.homeRoute);
  });

  it('open urls in browsers', async function () {
    const url = 'http://yeoman.io';
    adapter.addAnswers({whereTo: url});

    await this.router.navigate('help');

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(url);
  });
});
