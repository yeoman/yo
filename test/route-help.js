import {esmocha, expect} from 'esmocha';
import sinon from 'sinon';
import inquirer from 'inquirer';
import Router from '../lib/router.js';

const {default: open} = await esmocha.mock('open');
const {help: helpRoute} = await import('../lib/routes/help.js');

describe('help route', () => {
  beforeEach(async function () {
    this.sandbox = sinon.createSandbox();
    this.homeRoute = sinon.stub().returns(Promise.resolve());
    this.router = new Router(sinon.stub());
    this.router.registerRoute('home', this.homeRoute);
    this.open = sinon.stub();
    this.router.registerRoute('help', helpRoute);
  });

  afterEach(function () {
    this.sandbox.restore();
    esmocha.clearAllMocks();
  });

  it('allow returning home', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whereTo: 'home'}));
    return this.router.navigate('help').then(() => {
      sinon.assert.calledOnce(this.homeRoute);
    });
  });

  it('open urls in browsers', function () {
    const url = 'http://yeoman.io';
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whereTo: url}));
    return this.router.navigate('help').then(() => {
      expect(open).toHaveBeenCalledTimes(1);
      expect(open).toHaveBeenCalledWith(url);
    });
  });
});
