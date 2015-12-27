'use strict';
var _ = require('lodash');
var chalk = require('chalk');
var fullname = require('fullname');
var inquirer = require('inquirer');
var namespaceToName = require('yeoman-environment').namespaceToName;
var globalConfigHasContent = require('../utils/global-config').hasContent;

module.exports = function (app) {
  var defaultChoices = [{
    name: 'Install a generator',
    value: 'install'
  }, {
    name: 'Find some help',
    value: 'help'
  }, {
    name: 'Get me out of here!',
    value: 'exit'
  }];

  if (globalConfigHasContent()) {
    defaultChoices.splice(defaultChoices.length - 1, 0, {
      name: 'Clear global config',
      value: 'clearConfig'
    });
  }

  var generatorList = _.chain(app.generators).map(function (generator) {
    if (!generator.appGenerator) {
      return null;
    }

    var updateInfo = generator.updateAvailable ? chalk.dim.yellow(' ♥ Update Available!') : '';

    return {
      name: generator.prettyName + updateInfo,
      value: {
        method: 'run',
        generator: generator.namespace
      }
    };
  }).compact().sortBy(function (el) {
    var generatorName = namespaceToName(el.value.generator);
    return -app.conf.get('generatorRunCount')[generatorName] || 0;
  }).value();

  if (generatorList.length) {
    defaultChoices.unshift({
      name: 'Update your generators',
      value: 'update'
    });
  }

  app.insight.track('yoyo', 'home');

  fullname().then(function (name) {
    var allo = name ? '\'Allo ' + name.split(' ')[0] + '! ' : '\'Allo! ';

    inquirer.prompt([{
      name: 'whatNext',
      type: 'list',
      message: allo + 'What would you like to do?',
      choices: _.flatten([
        new inquirer.Separator('Run a generator'),
        generatorList,
        new inquirer.Separator(),
        defaultChoices,
        new inquirer.Separator()
      ])
    }], function (answer) {
      if (answer.whatNext.method === 'run') {
        app.navigate('run', answer.whatNext.generator);
        return;
      }

      if (answer.whatNext === 'exit') {
        return;
      }

      app.navigate(answer.whatNext);
    });
  });
};
