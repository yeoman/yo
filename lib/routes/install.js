
import _ from 'lodash';
import chalk from 'chalk';
import spawn from 'cross-spawn';
import sortOn from 'sort-on';
import figures from 'figures';
import {npmKeyword} from 'npm-keyword';
import packageJson from 'package-json';
import denyList from '../deny-list.js';

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

/**
 * @param {import('../router.js').default} app
 * @returns
 */
export const install = async app => {
  const answers = await app.adapter.prompt([{
    name: 'searchTerm',
    message: 'Search npm for generators:',
  }]);

  return searchNpm(app, answers.searchTerm);
};

const generatorMatchTerm = (generator, term) => `${generator.name} ${generator.description}`.includes(term);
const getAllGenerators = _.memoize(() => npmKeyword('yeoman-generator'));

async function searchMatchingGenerators(app, term) {
  const installedGenerators = app.env.getGeneratorNames();
  const allGenerators = await getAllGenerators();
  return allGenerators.filter(generator => {
    if (denyList.includes(generator.name)) {
      return false;
    }

    if (installedGenerators.includes(generator.name)) {
      return false;
    }

    return generatorMatchTerm(generator, term);
  });
}

async function fetchGeneratorInfo(generator) {
  const package_ = await packageJson(generator.name, {fullMetadata: true});
  const official = OFFICIAL_GENERATORS.has(package_.name);
  const mustache = official ? chalk.green(` ${figures.mustache} `) : '';

  return {
    name: generator.name.replace(/^generator-/, '') + mustache + ' ' + chalk.dim(package_.description),
    value: generator.name,
    official: -official,
  };
}

async function searchNpm(app, term) {
  const matches = await searchMatchingGenerators(app, term);
  const packages = await Promise.all(matches.map(generator => fetchGeneratorInfo(generator)));

  return promptInstallOptions(app, sortOn(packages, ['official', 'name']));
}

/**
 * @param {import('../router.js').default} app
 * @returns
 */
async function promptInstallOptions(app, choices) {
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

  const answer = await app.adapter.prompt(resultsPrompt);

  if (answer.toInstall === 'home' || answer.toInstall === 'install') {
    return app.navigate(answer.toInstall);
  }

  installGenerator(app, answer.toInstall);
}

function installGenerator(app, packageName) {
  return spawn('npm', ['install', '--global', packageName], {stdio: 'inherit'})
    .on('error', error => {
      throw error;
    })
    .on('close', async () => {
      console.log('\nI just installed a generator by running:\n'
        + chalk.blue.bold('\n    npm install -g ' + packageName + '\n'));

      await app.env.lookup();
      app.updateAvailableGenerators();
      app.navigate('home');
    });
}
