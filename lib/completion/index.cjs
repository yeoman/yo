#! /usr/bin/env node
const tabtab = require('./tabtab.cjs')({
  name: 'yo',
  cache: !require('node:process').env.YO_TEST,
});

(async () => {
  const {createEnv} = await import('yeoman-environment');
  const {default: Completer} = await import('./completer.js');
  const completer = new Completer(createEnv());

  tabtab.completer = completer;

  // Lookup installed generator in yeoman environment,
  // respond completion results with each generator
  tabtab.on('yo', completer.complete.bind(completer));

  // Register complete command
  tabtab.start();
})();

module.exports = tabtab;
