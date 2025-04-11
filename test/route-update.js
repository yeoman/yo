import sinon from 'sinon';
import {esmocha} from 'esmocha';
import Router from '../lib/router.js';
import * as helpers from './helpers.js';

const {default: crossSpawn} = await esmocha.mock('cross-spawn');
const {default: checkbox} = await esmocha.mock('@inquirer/checkbox');
const {update} = await import('../lib/routes/update.js');
esmocha.reset();

describe('update route', () => {
  beforeEach(async function () {
    this.env = await helpers.fakeEnv();

    this.homeRoute = sinon.stub().returns(Promise.resolve());
    this.router = new Router(this.env);
    this.router.registerRoute('home', this.homeRoute);

    this.crossSpawn = helpers.fakeCrossSpawn('close');
    crossSpawn.mockImplementation(this.crossSpawn);

    this.router.registerRoute('update', update);
  });

  afterEach(() => {
    esmocha.clearAllMocks();
  });

  it('allows updating generators and return user to home screen', function () {
    const generators = ['generator-cat', 'generator-unicorn'];
    checkbox.mockResolvedValue(generators);
    return this.router.navigate('update').then(() => {
      sinon.assert.calledWith(
        this.crossSpawn,
        'npm',
        ['install', '--global', ...generators],
      );
      sinon.assert.calledOnce(this.homeRoute);
      sinon.assert.calledOnce(this.env.lookup);
    });
  });
});
