'use strict';
var async = require('async');
var chalk = require('chalk');
var inquirer = require('inquirer');
var spawn = require('cross-spawn-async');
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

  inquirer.prompt([{
    name: 'searchTerm',
    message: 'Search npm for generators:'
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

    npmKeyword('yeoman-generator').then(function (packages) {
      cb(null, packages.map(function (el) {
        el.match = function (term) {
          return (el.name + ' ' + el.description).indexOf(term) >= 0;
        };

        return el;
      }));
    }).catch(cb);
  };
})();

function searchMatchingGenerators(app, term, cb) {
  got('yeoman.io/blacklist.json', {json: true}, function (err, data) {
    var blacklist = err ? [] : data;
    var installedGenerators = app.env.getGeneratorNames();

    getAllGenerators(function (err2, allGenerators) {
      if (err2) {
        cb(err2);
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

function searchNpm(app, term, cb) {
  searchMatchingGenerators(app, term, function (err, matches) {
    if (err) {
      cb(err);
      return;
    }

    async.map(matches, fetchGeneratorInfo, function (err2, choices) {
      if (err2) {
        cb(err2);
        return;
      }

      promptInstallOptions(app, sortOn(choices, ['official', 'name']));
      cb();
    });
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

  inquirer.prompt(resultsPrompt, function (answer) {
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
