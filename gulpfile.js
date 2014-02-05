'use strict';
var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');
var watch = require('gulp-watch');
var spawn = require('child_process').spawn;

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
  var paths = [ 
    'test/**/*.js',
    '--timeout 50000',
    '--slow 1500',
  ];  
  var mocha = spawn( 'mocha', paths );

  function print ( data ) {
    process.stdout.write( data.toString('utf-8') );
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
gulp.task('mocha', [ 'jshint' ], mochaTaskHandler);

function watchTaskHandler ( callback ) {
  var paths = [
    'bin/**/*.js', 'test/**/*.js',
  ];
  var srcOpts = { read: false };

  function watchHandler ( events, callback ) {
    mochaTaskHandler( callback );
  }
  gulp
    .src( paths, srcOpts )
    .pipe( watch( watchHandler ) );

  callback( null );
}
gulp.task('watch', [ 'jshint' ], watchTaskHandler);

gulp.task( 'default', [ 'jshint', 'mocha', 'watch' ] );
