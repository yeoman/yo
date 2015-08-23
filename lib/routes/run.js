'use strict';
var chalk = require('chalk');
var namespaceToName = require('yeoman-environment').namespaceToName;

module.exports = function (app, name) {
  var baseName = namespaceToName(name);
  app.insight.track('yoyo', 'run', baseName);

  console.log(
    chalk.yellow('\nMake sure you are in the directory you want to scaffold into.') +
    chalk.dim('\nThis generator can also be run with: ') +
    chalk.blue('yo ' + baseName + '\n')
  );

  // save the generator run count
  var generatorRunCount = app.conf.get('generatorRunCount');
  generatorRunCount[baseName] = generatorRunCount[baseName] + 1 || 1;
  app.conf.set('generatorRunCount', generatorRunCount);
  app.env.run(name);
};
