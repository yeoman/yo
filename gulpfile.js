'use strict';
var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');
var watch = require('gulp-watch');

function jshintTaskHandler () {
  var paths = [ 
    'cli.js', 'yoyo.js',
    'scripts/*.js' 
  ];
  var srcOpts = { read: false };

  gulp
    .src( paths, srcOpts )
    .pipe( jshint('.jshintrc') )
    .pipe( jshint.reporter('default') );
}
gulp.task('jshint', jshintTaskHandler);

function mochaTaskHandler () {
  var paths = [ 'test/**/*.js' ];  
  var options = {
    timeout: 50000,
    reporter: 'spec',
    globals: [ 
      'events', 'AssertionError',
      'TAP_Global_Harness' 
    ],
  };
  var srcOpts = { read: false };

  gulp
    .src( paths, srcOpts )
    .pipe( mocha( options ) );
}
gulp.task('mocha', mochaTaskHandler);

function watchTaskHandler () {
  var paths = [
    'bin/**/*.js', 'test/**/*.js',
    'gulpfile.js',
  ];
  var srcOpts = { read: false };

  gulp
    .src( paths, srcOpts )
    .pipe( watch() );
}
gulp.task('watch', watchTaskHandler);

gulp.task( 'default', [ 'jshint', 'mocha', 'watch' ] );
