'use strict';
var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var watch = require('gulp-watch');

function jshintTaskHandler(callback) {
  var paths = [
    'cli.js',
    'yoyo.js',
    'scripts/*.js',
    'gulpfile.js'
  ];
  var srcOpts = { read: true };

  gulp
    .src(paths, srcOpts)
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'));
  callback(null);
}
gulp.task('jshint', jshintTaskHandler);

function codeStyleTaskHandler(callback) {
  var paths = [
    'cli.js',
    'yoyo.js',
    'scripts/*.js',
    'gulpfile.js'
  ];
  var srcOpts = { read: true };
  
  gulp
    .src(paths, srcOpts)
    .pipe(jscs());
  callback(null);
}
gulp.task('code-style', codeStyleTaskHandler);

function mochaTaskHandler(events) {
  var paths = [
    './test/**/*.js',
  ];
  var srcOpts = { read: false };
  var options = {
    slow: 1500,
    timeout: 50000,
    reporter: 'spec',
    globals: [
      'events',
      'AssertionError',
      'TAP_Global_Harness',
    ] 
  };

  gulp
    .src(paths)
    .pipe(mocha(options));
}
gulp.task('mocha', mochaTaskHandler);

function watchTaskHandler(callback) {
  var paths = [
    'bin/**/*.js', 'test/**/*.js',
  ];
  var srcOpts = { read: false };

  function watchHandler(events, callback) {
    mochaTaskHandler(callback);
  }
  gulp
    .src(paths, srcOpts)
    .pipe(watch(watchHandler));

  callback(null);
}
gulp.task('watch', watchTaskHandler);

gulp.task('default', ['jshint', 'code-style', 'mocha', 'watch']);
