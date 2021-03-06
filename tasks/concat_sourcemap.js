/*
 * grunt-concat-sourcemap
 * https://github.com/k-nakamura/grunt-concat-sourcemap
 *
 * Copyright (c) 2013 Koji NAKAMURA
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  var path = require('path');

  var SourceMapConsumer = require('source-map').SourceMapConsumer;
  var SourceMapGenerator = require('source-map').SourceMapGenerator;
  var SourceNode = require('source-map').SourceNode;

  // source map file of input
  var sourceMaps = [];

  grunt.registerMultiTask('concat_sourcemap', 'Concatenate files and generate a sourece map.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      separator: grunt.util.linefeed,
      sourceRoot: ''
    });

    // Iterate over all src-dest file pairs.
    this.files.forEach(function(f) {

      var sourceNode = new SourceNode();

      // Warn on and remove invalid source files (if nonull was set).
      var filepaths = f.src.filter(function(filepath) {
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          return true;
        }
      });

      // Concatenate files with using SourceNode.
      var i, l, j, m;
      for (i = 0, l = filepaths.length; i < l; i++) {
        // Read file source.
        var src = grunt.file.read(filepaths[i]);
        var childNodeChanks = src.split('\n');
        for (j = 0, m = childNodeChanks.length - 1; j < m; j++) {
          childNodeChanks[j] += '\n';
        }
        childNodeChanks.map(function(line) {
          if (/\/\/@\s+sourceMappingURL=(.+)/.test(line)) {
            var sourceMapPath = filepaths[i].replace(/[^\/]*$/, RegExp.$1);
            var sourceMap = JSON.parse(grunt.file.read(sourceMapPath));
            sourceMap.file = filepaths[i];
            var sourceRoot = path.resolve(path.dirname(filepaths[i]), sourceMap.sourceRoot);
            sourceMap.sources = sourceMap.sources.map(function(source){
              return path.relative(process.cwd(), path.join(sourceRoot, source));
            });
            delete sourceMap.sourceRoot;
            sourceMaps.push(sourceMap);
            return line.replace(/@\s+sourceMappingURL=[\w\.]+/, '');
          }
          return line;
        }).forEach(function(line, j){
          sourceNode.add(new SourceNode(j + 1, 0, filepaths[i], line));
        });
        sourceNode.add(options.separator);
      }

      var mapfilepath = f.dest.split('/').pop() + '.map';
      sourceNode.add('//@ sourceMappingURL=' + mapfilepath);

      var code_map = sourceNode.toStringWithSourceMap({
        file: f.dest,
        sourceRoot: options.sourceRoot
      });

      // Write the destination file.
      grunt.file.write(f.dest, code_map.code);

      // Write the source map file.
      var generator = SourceMapGenerator.fromSourceMap(new SourceMapConsumer(code_map.map.toJSON()));
      sourceMaps.forEach(function(sourceMap){
        generator.applySourceMap(new SourceMapConsumer(sourceMap));
      });
      var newSourceMap = generator.toJSON();
      newSourceMap.file = path.basename(newSourceMap.file);
      grunt.file.write(f.dest + '.map', JSON.stringify(newSourceMap, null, '  '));

      // Print a success message.
      grunt.log.writeln('File "' + f.dest + '" created.');
    });
  });

};
