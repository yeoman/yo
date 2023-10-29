'use strict';
const chalk = require('chalk');
const {namespaceToName} = require('../utils/namespace');

module.exports = async (app, name) => {
  const baseName = namespaceToName(name);

  console.log(
    chalk.yellow('\nMake sure you are in the directory you want to scaffold into.') +
    chalk.dim('\nThis generator can also be run with: ') +
    chalk.blue(`yo ${baseName}\n`)
  );

  // Save the generator run count
  const generatorRunCount = app.conf.get('generatorRunCount');
  generatorRunCount[baseName] = generatorRunCount[baseName] + 1 || 1;
  app.conf.set('generatorRunCount', generatorRunCount);
  return app.env.run(name);
};
