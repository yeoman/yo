'use strict';
var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');
var watch = require('gulp-watch');

function jshintTaskHandler ( callback ) {
  var paths = [ 
    'cli.js', 'yoyo.js',
    'scripts/*.js' 
  ];
  var srcOpts = { read: false };

  gulp
    .src( paths, srcOpts )
    .pipe( jshint('.jshintrc') )
    .pipe( jshint.reporter('default') );

  callback( null );
}
gulp.task('jshint', jshintTaskHandler);

function mochaTaskHandler ( callback ) {
  var paths = [ 'test/**/*.js' ];  
  var options = {
    test: {
      options: {
        slow: 1500,
        timeout: 50000,
        reporter: 'spec',
        globals: [ 
          'events', 'AssertionError',
          'TAP_Global_Harness' 
        ],
      }
    }
  };
  var srcOpts = { read: false };

  gulp
    .src( paths, srcOpts )
    .pipe( mocha( options ) );

  callback( null );
}
gulp.task('mocha', [ 'jshint' ], mochaTaskHandler);

function watchTaskHandler ( callback ) {
  var paths = [
    'bin/**/*.js', 'test/**/*.js',
  ];
  var srcOpts = { read: false };

  function watchHandler ( events, callback ) {
    gulp.run([ 'mocha' ], callback);
  }
  gulp
    .src( paths, srcOpts )
    .pipe( watch( watchHandler ) );

  callback( null );
}
gulp.task('watch', watchTaskHandler);

gulp.task( 'default', [ 'jshint', 'mocha' ] );
