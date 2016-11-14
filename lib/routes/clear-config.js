'use strict';
var _ = require('lodash');
var chalk = require('chalk');
var inquirer = require('inquirer');
var namespaceToName = require('yeoman-environment').namespaceToName;
var globalConfig = require('../utils/global-config');

module.exports = function (app) {
  app.insight.track('yoyo', 'clearGlobalConfig');

  var defaultChoices = [
    {
      name: 'Take me back home, Yo!',
      value: 'home'
    }
  ];

  var generatorList = _.chain(globalConfig.getAll()).map(function (val, key) {
    var prettyName = '';
    var sort = 0;

    // Remove version from generator name
    var name = key.split(':')[0];
    var generator = app.generators[name];

    if (generator) {
      prettyName = generator.prettyName;
      sort = -app.conf.get('generatorRunCount')[namespaceToName(generator.namespace)] || 0;
    } else {
      prettyName = name.replace(/^generator-/, '') + chalk.red(' (not installed anymore)');
      sort = 0;
    }

    return {
      name: prettyName,
      sort: sort,
      value: key
    };
  }).compact().sortBy(function (generatorName) {
    return generatorName.sort;
  }).value();

  if (generatorList.length > 0) {
    generatorList.push(new inquirer.Separator());
    defaultChoices.unshift({
      name: 'Clear all',
      value: '*'
    });
  }

  return inquirer.prompt([{
    name: 'whatNext',
    type: 'list',
    message: 'Which store would you like to clear?',
    choices: _.flatten([
      generatorList,
      defaultChoices
    ])
  }]).then(function (answer) {
    app.insight.track('yoyo', 'clearGlobalConfig', answer);

    if (answer.whatNext === 'home') {
      app.navigate('home');
      return;
    }

    _clearGeneratorConfig(app, answer.whatNext);
  });
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
