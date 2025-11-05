#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {createRequire} from 'node:module';
import {TerminalAdapter} from '@yeoman/adapter';
import chalk from 'chalk';
import updateNotifier from 'update-notifier';
import yosay from 'yosay';
import stringLength from 'string-length';
import rootCheck from 'root-check';
import meow from 'meow';
import list from 'cli-list';
import {bootstrap} from 'global-agent';
import pkg from './utils/project-package.js';
import Router from './router.js';
import * as routes from './routes/index.js';
import {getDirname} from './utils/node-shims.js';

const __dirname = getDirname(import.meta.url);
const generators = list(process.argv.slice(2));

bootstrap();

const cli = generators.map(generator => {
  const minicli = meow({
    autoHelp: false, autoVersion: true, pkg, argv: generator, importMeta: import.meta,
  });
  const options = minicli.flags;
  const arguments_ = minicli.input;

  // Add un-camelized options too, for legacy
  // TODO: Remove some time in the future when generators have upgraded
  for (const key of Object.keys(options)) {
    const legacyKey = key.replaceAll(/[A-Z]/g, m => `-${m.toLowerCase()}`);
    options[legacyKey] = options[key];
  }

  return {opts: options, args: arguments_};
});

const firstCmd = cli[0] || {opts: {}, args: {}};
const cmd = firstCmd.args[0];

if (firstCmd.opts.environmentVersion) {
  const envPackageJson = createRequire(import.meta.url)('yeoman-environment/package.json');
  console.log(envPackageJson.version);
  process.exit(0);
}

function updateCheck() {
  const notifier = updateNotifier({pkg});
  const message = [];

  if (notifier.update) {
    message.push(
      'Update available: ' + chalk.green.bold(notifier.update.latest) + chalk.gray(' (current: ' + notifier.update.current + ')'),
      'Run ' + chalk.magenta('npm install -g ' + pkg.name) + ' to update.',
    );
    console.log(yosay(message.join(' '), {maxLength: stringLength(message[0])}));
  }
}

async function pre() {
  // Debugging helper
  if (cmd === 'doctor') {
    const {default: yeomanDoctor} = await import('yeoman-doctor');
    yeomanDoctor();
    return;
  }

  if (cmd === 'completion') {
    throw new Error('Tabtab completion is no longer supported. See https://github.com/yeoman/yo/issues/886');
  }

  // Easteregg
  if (cmd === 'yeoman' || cmd === 'yo') {
    const {default: yeomanCharacter} = await import('yeoman-character');
    console.log(yeomanCharacter);
    return;
  }

  await init();
}

function createGeneratorList(env) {
  const generators = Object.keys(env.getGeneratorsMeta()).reduce((namesByGenerator, generator) => {
    const parts = generator.split(':');
    const generatorName = parts.shift();

    // If first time we found this generator, prepare to save all its sub-generators
    namesByGenerator[generatorName] ||= [];

    // If sub-generator (!== app), save it
    if (parts[0] !== 'app') {
      namesByGenerator[generatorName].push(parts.join(':'));
    }

    return namesByGenerator;
  }, {});

  if (Object.keys(generators).length === 0) {
    return '  Couldn\'t find any generators, did you install any? Troubleshoot issues by running\n\n  $ yo doctor';
  }

  return Object.keys(generators).map(generator => {
    const subGenerators = generators[generator].map(subGenerator => `    ${subGenerator}`).join('\n');
    return `  ${generator}\n${subGenerators}`;
  }).join('\n');
}

const onError = error => {
  console.error('Error', process.argv.slice(2).join(' '), '\n');
  console.error(firstCmd.opts.debug ? error.stack : error.message);
  process.exit(error.code || 1);
};

async function init() {
  const {createEnv} = await import('yeoman-environment');
  const env = createEnv();

  // Lookup for every namespaces, within the environments.paths and lookups
  await env.lookup(firstCmd.opts.localOnly || false);
  const generatorList = createGeneratorList(env);

  // List generators
  if (firstCmd.opts.generators) {
    console.log('Available Generators:\n\n' + generatorList);
    env.emit('finished');
    return;
  }

  // Start the interactive UI if no generator is passed
  if (!cmd) {
    if (firstCmd.opts.help) {
      const usageText = fs.readFileSync(path.join(__dirname, 'usage.txt'), 'utf8');
      console.log(`${usageText}\nAvailable Generators:\n\n${generatorList}`);
      env.emit('finished');
      return;
    }

    try {
      await runYo(env);
    } catch (error) {
      onError(error);
    }

    return;
  }

  // More detailed error message
  // If users type in generator name with prefix 'generator-'
  if (cmd.startsWith('generator-')) {
    const generatorName = cmd.replace('generator-', '');
    const generatorCommand = chalk.yellow('yo ' + generatorName);

    console.log(chalk.red('Installed generators don\'t need the "generator-" prefix.'));
    console.log(`In the future, run ${generatorCommand} instead!\n`);

    try {
      await env.run(generatorName, firstCmd.opts);
    } catch (error) {
      onError(error);
    }

    return;
  }

  // Note: at some point, nopt needs to know about the generator options, the
  // one that will be triggered by the below args. Maybe the nopt parsing
  // should be done internally, from the args.
  for (const generator of cli) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await env.run(generator.args, generator.opts);
    } catch (error) {
      onError(error);
    }
  }
}

function runYo(env) {
  const adapter = new TerminalAdapter();
  const router = new Router({adapter, env});
  router.registerRoute('help', routes.help);
  router.registerRoute('update', routes.update);
  router.registerRoute('run', routes.run);
  router.registerRoute('install', routes.install);
  router.registerRoute('exit', routes.exit);
  router.registerRoute('clearConfig', routes.clearConfig);
  router.registerRoute('home', routes.home);

  process.once('exit', router.navigate.bind(router, 'exit'));

  router.updateAvailableGenerators();
  return router.navigate('home');
}

rootCheck('\n' + chalk.red('Easy with the `sudo`. Yeoman is the master around here.') + '\n\nSince yo is a user command, there is no need to execute it with root\npermissions. If you\'re having permission errors when using yo without sudo,\nplease spend a few minutes learning more about how your system should work\nand make any necessary repairs.\n\nA quick solution would be to change where npm stores global packages by\nputting ~/npm/bin in your PATH and running:\n' + chalk.blue('npm config set prefix ~/npm') + '\n\nSee: https://github.com/sindresorhus/guides/blob/master/npm-global-without-sudo.md');

updateCheck();

// eslint-disable-next-line unicorn/prefer-top-level-await
(async function () {
  await pre();
})();
