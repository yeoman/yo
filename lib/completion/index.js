#! /usr/bin/env node
'use strict';
const tabtab = require('tabtab')({
  name: 'yo',
  cache: !process.env.YO_TEST
});
const Completer = require('./completer');

(async () => {
  // eslint-disable-next-line node/no-unsupported-features/es-syntax
  const {createEnv} = await import('yeoman-environment');
  const completer = new Completer(createEnv());

  tabtab.completer = completer;

  // Lookup installed generator in yeoman environment,
  // respond completion results with each generator
  tabtab.on('yo', completer.complete.bind(completer));

  // Register complete command
  tabtab.start();
})();

module.exports = tabtab;
