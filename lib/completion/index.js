#! /usr/bin/env node
'use strict';

var env = require('yeoman-environment').createEnv();
var Completer = require('./completer');

var tabtab = module.exports = require('tabtab')({
  name: 'yo',
  cache: !process.env.YO_TEST
});

var completer = tabtab.completer = new Completer(env);

// Lookup installed generator in yeoman environment, respond completion results
// with each generator.
tabtab.on('yo', completer.complete.bind(completer));

// Register complete command
tabtab.start();
