'use strict';
var async = require('async');
var chalk = require('chalk');
var customError = require('custom-error');
var inquirer = require('inquirer');
var request = require('request');
var spawn = require('cross-spawn');
var sortOn = require('sort-on');
var figures = require('figures');
var utils = require('../utils');
var urls = require('../utils/urls');

module.exports = function (app) {
  app.insight.track('yoyo', 'install');

  inquirer.prompt([{
    name: 'searchTerm',
    message: 'Search npm for generators'
  }], function (answers) {
    searchNpm(app, answers.searchTerm);
  });
};

function formatRow(row) {
  return {
    name: row.key[1],
    match: function (term) {
      return row.key.join(' ').indexOf(term) >= 0;
    }
  };
}

var NpmError = customError('NpmError');
function npmError(extra) {
  return new NpmError('Failed to fetch npm registry (see http://status.npmjs.org for status) \n' + (extra || ''));
}

var getAllGenerators = (function () {
  var allGenerators;

  return function (cb) {
    if (allGenerators) {
      return cb(allGenerators);
    }

    var url = urls.npm.keyword('yeoman-generator');

    request({
      url: url,
      json: true
    }, function (err, res, body) {
      if (err || res.statusCode !== 200) {
        throw npmError(err + '\n' + body);
      }

      allGenerators = body.rows.map(formatRow);
      cb(allGenerators);
    });
  };
})();

function searchMatchingGenerators(app, term, cb) {
  var BLACKLIST = [
    'generator-express-angular', // haven't updated package.json
    'ft-wp', // haven't updated package.json
    'generator-angular-phonegap', // haven't updated package.json
    'generator-angular-js', // haven't updated package.json
    'generator-ionicjs', // duplicate entry of generator-ionic
    'generator-charcoal', // deprecated
    'generator-react-coffee-webpack', // duplicate entry of generator-react-webpack
    'generator-angular-rails-proxy' // didn't change their package.json (ಠ_ಠ)
  ];

  var installedGenerators = utils.generatorsFromEnv(app.env);

  getAllGenerators(function (allGenerators) {
    cb(allGenerators.filter(function (generator) {
      if (BLACKLIST.indexOf(generator.name) !== -1) {
        return false;
      }

      if (installedGenerators.indexOf(generator.name) !== -1) {
        return false;
      }

      return generator.match(term);
    }));
  });
}

function isYeomanPackage(body) {
  if (body.author) {
    return body.author.name === 'Yeoman team' || body.author.name === 'The Yeoman Team';
  }

  return false;
}

function fetchGeneratorInfo(generator, cb) {
  var url = urls.npm.package(generator.name);

  request({ url: url, json: true }, function (err, res, body) {
    if (err || res.statusCode !== 200) {
      return cb(npmError(err + '\n' + body));
    }

    var official = isYeomanPackage(body);
    var mustache = official ? chalk.green(' ' + figures.mustache) : '';

    cb(null, {
      name: generator.name.replace(/^generator-/, '') + mustache,
      value: generator.name,
      official: official
    });
  });
}

function searchNpm(app, term) {
  searchMatchingGenerators(app, term, function (matches) {
    async.map(matches, fetchGeneratorInfo, function (err, choices) {
      if (err) {
        throw err;
      }

      promptInstallOptions(app, sortOn(choices, ['name', 'official']));
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
