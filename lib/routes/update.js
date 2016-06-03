'use strict';
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

function getPackageGit(generators, pkgs) {
  pkgs = Object.prototype.toString.call(pkgs) === '[object Array]' ? pkgs : [pkgs];
  return pkgs.map(function (pkg) {
    var repository = generators[pkg] ? generators[pkg].repository : null;
    if (typeof repository === 'string') {
      return repository;
    }
    if (!repository || !repository.url) {
      return pkg;
    }
    return repository.type ? [repository.type, repository.url].join('+') : repository.url;
  });
}

function updateGenerators(app, pkgs) {
  spawn('npm', ['install', '-g'].concat(getPackageGit(app.generators || {}, pkgs)), {stdio: 'inherit'})
    .on('close', updateSuccess.bind(null, app));
}

module.exports = function (app) {
  app.insight.track('yoyo', 'update');
  inquirer.prompt([{
    name: 'generators',
    message: 'Generators to update',
    type: 'checkbox',
    choices: Object.keys(app.generators || {}).map(function (key) {
      return {
        name: app.generators[key].name,
        checked: true
      };
    })
  }], function (answer) {
    updateGenerators(app, answer.generators);
  });
};
