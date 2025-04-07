
import _ from 'lodash';
import async from 'async';
import chalk from 'chalk';
import inquirer from 'inquirer';
import spawn from 'cross-spawn';
import sortOn from 'sort-on';
import figures from 'figures';
import npmKeyword from 'npm-keyword';
import packageJson from 'package-json';
import got from 'got';

const OFFICIAL_GENERATORS = new Set([
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
  'generator-webapp',
]);

export const install = app => inquirer.prompt([{
  name: 'searchTerm',
  message: 'Search npm for generators:',
}]).then(answers => searchNpm(app, answers.searchTerm));

const generatorMatchTerm = (generator, term) => `${generator.name} ${generator.description}`.includes(term);
const getAllGenerators = _.memoize(() => npmKeyword('yeoman-generator'));

function searchMatchingGenerators(app, term, callback) {
  function handleDenyList(denyList) {
    const installedGenerators = app.env.getGeneratorNames();

    getAllGenerators().then(allGenerators => {
      callback(null, allGenerators.filter(generator => {
        if (denyList.includes(generator.name)) {
          return false;
        }

        if (installedGenerators.includes(generator.name)) {
          return false;
        }

        return generatorMatchTerm(generator, term);
      }));
    }, callback);
  }

  got('http://yeoman.io/blacklist.json')
    .json()
    .then(response => handleDenyList(response))
    .catch(() => handleDenyList([]));
}

function fetchGeneratorInfo(generator, callback) {
  packageJson(generator.name, {fullMetadata: true}).then(package_ => {
    const official = OFFICIAL_GENERATORS.has(package_.name);
    const mustache = official ? chalk.green(` ${figures.mustache} `) : '';

    callback(null, {
      name: generator.name.replace(/^generator-/, '') + mustache + ' ' + chalk.dim(package_.description),
      value: generator.name,
      official: -official,
    });
  }).catch(callback);
}

function searchNpm(app, term) {
  const promise = new Promise((resolve, reject) => {
    searchMatchingGenerators(app, term, (error, matches) => {
      if (error) {
        reject(error);
        return;
      }

      async.map(matches, fetchGeneratorInfo, (error2, choices) => {
        if (error2) {
          reject(error2);
          return;
        }

        resolve(choices);
      });
    });
  });

  return promise.then(choices => promptInstallOptions(app, sortOn(choices, ['official', 'name'])));
}

function promptInstallOptions(app, choices) {
  let introMessage = 'Sorry, no results matches your search term';

  if (choices.length > 0) {
    introMessage = 'Here\'s what I found. ' + chalk.gray('Official generator → ' + chalk.green(figures.mustache)) + '\n  Install one?';
  }

  const resultsPrompt = [{
    name: 'toInstall',
    type: 'list',
    message: introMessage,
    choices: [...choices, {
      name: 'Search again',
      value: 'install',
    }, {
      name: 'Return home',
      value: 'home',
    }],
  }];

  return inquirer.prompt(resultsPrompt).then(answer => {
    if (answer.toInstall === 'home' || answer.toInstall === 'install') {
      return app.navigate(answer.toInstall);
    }

    installGenerator(app, answer.toInstall);
  });
}

function installGenerator(app, packageName) {
  return spawn('npm', ['install', '--global', packageName], {stdio: 'inherit'})
    .on('error', error => {
      throw error;
    })
    .on('close', async () => {
      console.log(
        '\nI just installed a generator by running:\n'
        + chalk.blue.bold('\n    npm install -g ' + packageName + '\n'),
      );

      await app.env.lookup();
      app.updateAvailableGenerators();
      app.navigate('home');
    });
}
