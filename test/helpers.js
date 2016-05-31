'use strict';
var sinon = require('sinon');
var yeoman = require('yeoman-environment');

exports.fakeInsight = function () {
  return {
    track: sinon.stub()
  };
};

exports.fakeCrossSpawn = function (event) {
  return sinon.stub().returns({
    on: function (name, cb) {
      if (name === event) {
        cb();
      }

      return this;
    }
  });
};

exports.fakeEnv = function () {
  var env = yeoman.createEnv();
  env.lookup = sinon.spy(function (cb) {
    cb();
  });
  env.run = sinon.stub();
  return env;
};
