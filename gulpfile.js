'use strict';
var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var watch = require('gulp-watch');
var spawn = require('child_process').spawn;

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

function mochaTaskHandler(callback) {
  var paths = [
    'test/**/*.js',
    '--timeout 50000',
    '--slow 1500',
  ];
  var mocha = spawn('mocha', paths);

  function print(data) {
    process.stdout.write(data.toString('utf-8'));
  }

  mocha
    .stdout
    .on('data', print);

  mocha
    .stderr
    .on('data', print);

  mocha
    .on('close', callback);
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

gulp.task('default', [ 'jshint', 'code-style', 'mocha', 'watch' ]);
