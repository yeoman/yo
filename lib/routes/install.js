'use strict';
var async = require('async');
var chalk = require('chalk');
var inquirer = require('inquirer');
var spawn = require('cross-spawn');
var sortOn = require('sort-on');
var figures = require('figures');
var npmKeyword = require('npm-keyword');
var packageJson = require('package-json');
var utils = require('../utils');
var got = require('got');

module.exports = function (app) {
  app.insight.track('yoyo', 'install');

  inquirer.prompt([{
    name: 'searchTerm',
    message: 'Search npm for generators'
  }], function (answers) {
    searchNpm(app, answers.searchTerm, function (err) {
      if (err) {
        throw err;
      }
    });
  });
};

var getAllGenerators = (function () {
  var allGenerators;

  return function (cb) {
    if (allGenerators) {
      return cb(null, allGenerators);
    }

    npmKeyword('yeoman-generator', function (err, packages) {
      if (err) {
        cb(err);
        return;
      }

      cb(null, packages.map(function (el) {
        el.match = function (term) {
          return (el.name + ' ' + el.description).indexOf(term) >= 0;
        };

        return el;
      }));
    });
  };
})();

function searchMatchingGenerators(app, term, cb) {
  got('http://yeoman.io/blacklist.json', function (err, data) {

      var blacklist = err ? [] : data;
      var installedGenerators = utils.generatorsFromEnv(app.env);

      getAllGenerators(function (err, allGenerators) {
        if (err) {
          cb(err);
          return;
        }

        cb(null, allGenerators.filter(function (generator) {
          if (blacklist.indexOf(generator.name) !== -1) {
            return false;
          }

          if (installedGenerators.indexOf(generator.name) !== -1) {
            return false;
          }

          return generator.match(term);
        }));
      });

  });
}

function isYeomanPackage(pkg) {
  if (pkg.author && pkg.author.name) {
    return pkg.author.name.indexOf('Yeoman') !== -1;
  }

  return false;
}

function fetchGeneratorInfo(generator, cb) {
  packageJson(generator.name, function (err, pkg) {
    if (err) {
      cb(err);
      return;
    }

    var official = isYeomanPackage(pkg);
    var mustache = official ? chalk.green(' ' + figures.mustache) : '';

    cb(null, {
      name: generator.name.replace(/^generator-/, '') + mustache,
      value: generator.name,
      official: official
    });
  });
}

function searchNpm(app, term, cb) {
  searchMatchingGenerators(app, term, function (err, matches) {
    if (err) {
      cb(err);
      return;
    }

    async.map(matches, fetchGeneratorInfo, function (err, choices) {
      if (err) {
        cb(err);
        return;
      }

      promptInstallOptions(app, sortOn(choices, ['name', 'official']));
      cb();
    });
  });
}

function promptInstallOptions(app, choices) {
  var introMessage = 'Sorry, no results matches your search term';

  if (choices.length > 0){
    introMessage = 'Here\'s what I found. ' + chalk.gray('Official generator → ' + chalk.green(figures.mustache)) + '\n  Install one?';
  }

  var resultsPrompt = [{
    name: 'toInstall',
    type: 'list',
    message: introMessage,
    choices: choices.concat([{
      name: 'Search again',
      value: 'install'
    }, {
      name: 'Return home',
      value: 'home'
    }])
  }];

  inquirer.prompt(resultsPrompt, function (answer) {
    if (answer.toInstall === 'home' || answer.toInstall === 'install') {
      return app.navigate(answer.toInstall);
    }

    installGenerator(app, answer.toInstall);
  });
}

function installGenerator(app, pkgName) {
  app.insight.track('yoyo', 'install', pkgName);

  return spawn('npm', ['install', '-g', pkgName], { stdio: 'inherit' })
    .on('error', function (err) {
      app.insight.track('yoyo:err', 'install', pkgName);
      throw err;
    })
    .on('close', function () {
      app.insight.track('yoyo', 'installed', pkgName);

      console.log(
        '\nI just installed a generator by running:\n' +
        chalk.blue.bold('\n    npm install -g ' + pkgName + '\n')
      );

      app.env.lookup(function () {
        app.updateAvailableGenerators();
        app.navigate('home');
      });
    });
}
