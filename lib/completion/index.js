#! /usr/bin/env node
'use strict';
import tabtabFactory from 'tabtab';
import Completer from './completer.js';

const tabtab = tabtabFactory({
  name: 'yo',
  cache: !process.env.YO_TEST
});

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

export default tabtab;
