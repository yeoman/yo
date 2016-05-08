'use strict';
var _ = require('lodash');
var async = require('async');
var chalk = require('chalk');
var inquirer = require('inquirer');
var spawn = require('cross-spawn');
var Promise = require('pinkie-promise');
var sortOn = require('sort-on');
var figures = require('figures');
var npmKeyword = require('npm-keyword');
var packageJson = require('package-json');
var got = require('got');

var OFFICIAL_GENERATORS = [
  'generator-angular',
  'generator-backbone',
  'generator-bootstrap',
  'generator-chrome-extension',
  'generator-chromeapp',
  'generator-commonjs',
  'generator-generator',
  'generator-gruntplugin',
  'generator-gulp-webapp',
  'generator-jasmine',
  'generator-jquery',
  'generator-karma',
  'generator-mobile',
  'generator-mocha',
  'generator-node',
  'generator-polymer',
  'generator-webapp'
];

module.exports = function (app) {
  app.insight.track('yoyo', 'install');

  return inquirer.prompt([{
    name: 'searchTerm',
    message: 'Search npm for generators:'
  }]).then(function (answers) {
    return searchNpm(app, answers.searchTerm);
  });
};

function generatorMatchTerm(generator, term) {
  return (generator.name + ' ' + generator.description).indexOf(term) >= 0;
}

var getAllGenerators = _.memoize(function () {
  return npmKeyword('yeoman-generator');
});

function searchMatchingGenerators(app, term, cb) {
  got('yeoman.io/blacklist.json', {json: true}, function (err, data) {
    var blacklist = err ? [] : data;
    var installedGenerators = app.env.getGeneratorNames();

    getAllGenerators().then(function (allGenerators) {
      cb(null, allGenerators.filter(function (generator) {
        if (blacklist.indexOf(generator.name) !== -1) {
          return false;
        }

        if (installedGenerators.indexOf(generator.name) !== -1) {
          return false;
        }

        return generatorMatchTerm(generator, term);
      }));
    }, cb);
  });
}

function fetchGeneratorInfo(generator, cb) {
  packageJson(generator.name).then(function (pkg) {
    var official = OFFICIAL_GENERATORS.indexOf(pkg.name) !== -1;
    var mustache = official ? chalk.green(' ' + figures.mustache + ' ') : '';

    cb(null, {
      name: generator.name.replace(/^generator-/, '') +
        // `gray` → `dim` when iTerm 2.9 is out
        mustache + ' ' + chalk.gray(pkg.description),
      value: generator.name,
      official: -official
    });
  }).catch(cb);
}

function searchNpm(app, term) {
  var promise = new Promise(function (resolve, reject) {
    searchMatchingGenerators(app, term, function (err, matches) {
      if (err) {
        reject(err);
        return;
      }

      async.map(matches, fetchGeneratorInfo, function (err2, choices) {
        if (err2) {
          reject(err2);
          return;
        }

        resolve(choices);
      });
    });
  });

  return promise.then(function (choices) {
    return promptInstallOptions(app, sortOn(choices, ['official', 'name']));
  });
}

function promptInstallOptions(app, choices) {
  var introMessage = 'Sorry, no results matches your search term';

  if (choices.length > 0) {
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

  return inquirer.prompt(resultsPrompt).then(function (answer) {
    if (answer.toInstall === 'home' || answer.toInstall === 'install') {
      return app.navigate(answer.toInstall);
    }

    installGenerator(app, answer.toInstall);
  });
}

function installGenerator(app, pkgName) {
  app.insight.track('yoyo', 'install', pkgName);

  return spawn('npm', ['install', '-g', pkgName], {stdio: 'inherit'})
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
