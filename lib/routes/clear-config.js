import _ from 'lodash';
import chalk from 'chalk';
import globalConfig from '../utils/global-config.js';
import {namespaceToName} from '../utils/namespace.js';

/**
 * @param {import('../router.js').default} app
 * @returns
 */
export const clearConfig = async app => {
  const defaultChoices = [
    {
      name: 'Take me back home, Yo!',
      value: 'home',
    },
  ];

  const generatorList = _.chain(globalConfig.getAll()).map((value, key) => {
    let prettyName = '';
    let sort = 0;

    // Remove version from generator name
    const name = key.split(':')[0];
    const generator = app.generators[name];

    if (generator) {
      ({prettyName} = generator);
      sort = -app.conf.get('generatorRunCount')[namespaceToName(generator.namespace)] || 0;
    } else {
      prettyName = name.replace(/^generator-/, '') + chalk.red(' (not installed anymore)');
      sort = 0;
    }

    return {
      name: prettyName,
      sort,
      value: key,
    };
  }).compact().sortBy(generatorName => generatorName.sort).value();

  if (generatorList.length > 0) {
    generatorList.push(app.adapter.separator?.());
    defaultChoices.unshift({
      name: 'Clear all',
      value: '*',
    });
  }

  const answer = await app.adapter.prompt([{
    name: 'whatNext',
    type: 'list',
    message: 'Which store would you like to clear?',
    choices: [
      generatorList,
      defaultChoices,
    ].flat(),
  }]);

  if (answer.whatNext === 'home') {
    return app.navigate('home');
  }

  _clearGeneratorConfig(app, answer.whatNext);
};

/**
 * Clear the given generator from the global config file
 * @param  {Object} app
 * @param  {String} generator Name of the generator to be clear. Use '*' to clear all generators.
 */
function _clearGeneratorConfig(app, generator) {
  if (generator === '*') {
    globalConfig.removeAll();
  } else {
    globalConfig.remove(generator);
  }

  console.log('Global config has been successfully cleared');
  app.navigate('home');
}
