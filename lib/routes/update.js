'use strict';
var _ = require('lodash');
var chalk = require('chalk');
var inquirer = require('inquirer');
var spawn = require('cross-spawn');

var successMsg = 'I\'ve just updated your generators. Remember, you can update' +
  '\na specific generator with npm by running:\n' +
  chalk.magenta('\n    npm install -g generator-_______');

function updateSuccess(app) {
  app.insight.track('yoyo', 'updated');
  console.log('\n' + chalk.cyan(successMsg) + '\n');
  app.env.lookup(function () {
    app.updateAvailableGenerators();
    app.navigate('home');
  });
}

function updateGenerators(app, pkgs) {
  spawn('npm', ['install', '-g'].concat(pkgs), { stdio: 'inherit' })
    .on('close', updateSuccess.bind(null, app));
}

module.exports = function (app) {
  app.insight.track('yoyo', 'update');
  inquirer.prompt([{
    name: 'generators',
    message: 'Generators to update',
    type: 'checkbox',
    choices: _.map(app.generators, function (generator) {
      return {
        name: generator.name,
        checked: true
      };
    })
  }], function (answer) {
    updateGenerators(app, answer.generators);
  });
};
