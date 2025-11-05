import _ from 'lodash';
import chalk from 'chalk';
import fullname from 'fullname';
import {namespaceToName} from '../utils/namespace.js';
import globalConfig from '../utils/global-config.js';

/**
 * @param {import('../router.js').default} app
 * @returns
 */
export const home = async app => {
  const defaultChoices = [{
    name: 'Install a generator',
    value: 'install',
  }, {
    name: 'Find some help',
    value: 'help',
  }, {
    name: 'Get me out of here!',
    value: 'exit',
  }];

  if (globalConfig.hasContent()) {
    defaultChoices.splice(-1, 0, {
      name: 'Clear global config',
      value: 'clearConfig',
    });
  }

  const generatorList = _.chain(app.generators).map(generator => {
    if (!generator.appGenerator) {
      return null;
    }

    const updateInfo = generator.updateAvailable ? chalk.dim.yellow(' ♥ Update Available!') : '';

    return {
      name: generator.prettyName + updateInfo,
      value: {
        method: 'run',
        generator: generator.namespace,
      },
    };
  }).compact().sortBy(element => {
    const generatorName = namespaceToName(element.value.generator);
    return -app.conf.get('generatorRunCount')[generatorName] || 0;
  }).value();

  if (generatorList.length > 0) {
    defaultChoices.unshift({
      name: 'Update your generators',
      value: 'update',
    });
  }

  const name = await fullname();
  const allo = (name && _.isString(name)) ? `'Allo ${name.split(' ')[0]}! ` : '\'Allo! ';

  const answer = await app.adapter.prompt([{
    name: 'whatNext',
    type: 'list',
    message: `${allo}What would you like to do?`,
    choices: [
      app.adapter.separator?.('Run a generator'),
      generatorList,
      app.adapter.separator?.(),
      defaultChoices,
      app.adapter.separator?.(),
    ].flat(),
  }]);

  if (answer.whatNext.method === 'run') {
    return app.navigate('run', answer.whatNext.generator);
  }

  if (answer.whatNext === 'exit') {
    return;
  }

  return app.navigate(answer.whatNext);
};
