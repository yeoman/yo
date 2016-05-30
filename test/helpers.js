'use strict';
var path = require('path');
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

exports.fakeReadPkgUp = function () {
  return {
    sync: function (options) {
      // turn /phoenix/app into phoenix-app
      var name = options.cwd.split(path.sep).filter(function (chunk) {
        return !!chunk;
      }).join('-');
      return {
        pkg: {
          name: name,
          version: '0.1.0'
        }
      };
    }
  };
};
