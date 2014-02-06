'use strict';
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var watch = require('gulp-watch');
var spawn = require('child_process').spawn;

function jshintTaskHandler(callback) {
  var paths = ['cli.js', 'yoyo.js', 'scripts/*.js', 'gulpfile.js'];
  var srcOpts = { read: true };

  gulp
    .src(paths, srcOpts)
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'));
  callback(null);
}
gulp.task('jshint', jshintTaskHandler);

function codeStyleTaskHandler(callback) {
  var paths = ['cli.js', 'yoyo.js', 'scripts/*.js', 'gulpfile.js'];
  var srcOpts = { read: true };
  
  gulp
    .src(paths, srcOpts)
    .pipe(jscs());
  callback(null);
}
gulp.task('code-style', codeStyleTaskHandler);

function mochaTaskHandler(callback) {
  var params = [
    './test/**/*.js',
    '--slow 1500',
    '--timeout 50000',
    '--reporter spec',
    '--globals events',
    '--globals AssertionError',
    '--globals TAP_Global_Harness',
  ];
  var mocha = spawn('mocha', params);

  mocha
    .stdout
    .pipe(process.stdout);

  mocha
    .stderr
    .pipe(process.stdout);

  function exitHandler(code) {
    var out = null;

    if (code) {
      out = 'fail';
    }
    callback(out);
  }
  mocha
    .on('exit', exitHandler);
}
gulp.task('mocha', mochaTaskHandler);

function watchTaskHandler(callback) {
  var paths = ['bin/**/*.js', 'test/**/*.js'];
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

gulp.task('default', ['jshint', 'code-style', 'mocha']);
