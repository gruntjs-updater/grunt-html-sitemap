/*
 * grunt-html-sitemap
 * https://github.com/Clever-Labs/grunt-html-sitemap
 *
 * Copyright (c) 2014 Bill Patrianakos
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Gather up dependencies
  var util    = require('util');
  var cheerio = require('cheerio');
  var _       = require('lodash');

  // Register our task
  grunt.registerMultiTask('html_sitemap', 'Create HTML sitemaps from a directory.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var taskOpts = this.options({
      siteBase: JSON.parse(grunt.file.read('package.json')).homepage,
      separator: false,
      searchPath: '',
      template: false
    });

    var markup    = cheerio.load('<ul>\n</ul>');
    var regbuild  = /<!--\s*sitemap:(\w+)(?:\(([^\)]+)\))?\s*([^\s]+)\s*-->/; // Extract options specified in comment blocks
    var siteMap   = [];
    var outFiles  = [];

    this.files.forEach(function(file) {
      // Add an output path to the list
      outFiles.push(file.dest);

      // Get the contents of the file
      var page = file.src.filter(function(path) {
        if (!grunt.file.exists(path) || grunt.file.isDir(path) || !grunt.file.isFile(path)) {
          grunt.warn('Invalid input file in your ' + this.target + ': ' + path);
          return false;
        } else {
          return true;
        }
      }).map(function(path) {
        var basePath = (typeof path === 'undefined') ? path : path.replace(taskOpts.searchPath, '');
        return {
          contents: grunt.file.read(path),
          path: taskOpts.siteBase + basePath
        };
      });

      // Parse each found page's content
      if (page) {
        page.forEach(function(pageData) {
          var lines = pageData.contents.replace(/\r\n/g, '\n').split(/\n/);
          var options = {};

          // Iterate over each line
          lines.forEach(function(line) {
            var indent = (line.match(/^\s*/) || [])[0];
            var option = line.match(regbuild);

            // If option found
            if (option && option[1] === 'anchor') {
              options.anchor = option[3];
            } else if (option && option[1] === 'order') {
              options.order = option[2];
            }
          });

          // Check if file needs to be read
          if (options.anchor) {
            pageData.anchor = options.anchor;
          } else {
            var $ = cheerio.load(pageData.contents);
            pageData.anchor = (!taskOpts.separator) ? $('title').text() : $('title').text().split(taskOpts.separator)[0];
          }

          // Append the new item to the sitemap <ul>
          markup('ul').append('  <li><a href="' + pageData.path + '">' + pageData.anchor + '</a></li>\n');
        });
      }
    });

    
    // Get unique destinations and write to them
    var destinations = _.uniq(outFiles, function(file) {
      if (taskOpts.template) {
        var sitemapFile = grunt.template.process(grunt.file.read(taskOpts.template), {data: {sitemap: markup.html()}});
        grunt.file.write(file, sitemapFile);
      } else {
        grunt.file.write(file, markup.html());
        grunt.log.writeln('Sitemap file written to ' + file);
      }
    });

  });
};
