var   fs = require('fs'),
      path = require('path'),
      util = require('util'),
      lazy = require('lazy'),
      events = require('events');

function main() {
  /**
   * Given two sorted arrays of chars, determine if 2nd is subset of 1st
   * @param {Array} of chars
   * @param {Array} of chars
   * @return {Boolean}
   */
  function isSubset(set, sub) {
    for (var setI = 0, subI = 0; setI < set.length && subI < sub.length; setI += 1) {
      if (set[setI] === sub[subI]) {
        subI++;
      }
    }
    return subI == sub.length;
  }

  /**
   * Return function to determine if a word has all desired characters
   * @param {Array} of chars - desired chars
   * @return {Function}
   */
  function getDesiredMatcher(desired) {
    /**
     * Checks if a given word has all the desired characters
     * @param {Array} of chars
     * @return {Boolean}
     */
    return function(word) {
      return isSubset(word, desired);
    }
  }


  /**
   * Take string, return canonical sorted array of characters
   * @param {String} letters
   * @return {Array} of single character strings
   */
  function canonicalize(s) {
    var arr = [];
    if (typeof s === 'string') {
      s = s.replace(/\W/g, '');
      for (var i = 0; i < s.length; i += 1) {
        arr.push(s[i]);
      }
    }
    return arr.sort();
  }

  /*
   * Given a directory, set up a cache directory with appropriate permissions.
   * If and when we do this for reals, should be part of VM setup (Vagrant or whatever)
   * Actually, this should all be memcacheable
   * Exits with error if cannot do so
   * @param {String} directory appDir
   * @param {Function} continue
   */
  function getCacheDir(appDir, cont) {
    var cacheDir = path.join(appDir, '.letterPressCache');
    function cacheFn(error, cacheDirStat) {
      if (!cacheDirStat.isDirectory()) {
        function mkdirFn(error) {
          if (error) {
            console.log("error creating directory:" + error)
            process.exit(1);
          }
          cont(cacheDir);
        }
        fs.mkdir(cacheDir, mkdirFn);
      } else {
        if ((cacheDirStat.mode & 0700) !== 0700) {
          console.log("permissions are wrong for cacheDir: %s missing user %s %s %s",
                      cacheDir,
                      cacheDirStat.mode & 0400 ? '' : 'read',
                      cacheDirStat.mode & 0200 ? '' : 'write',
                      cacheDirStat.mode & 0100 ? '' : 'execute/traverse');
                      process.exit(1);
        }
        cont(cacheDir);
      }
    }
    fs.stat(cacheDir, cacheFn);
  }

  /**
   * Comparator for length of strings
   * @param {String}
   * @param {String}
   * @return {Number}
   */
  function byLengthDescending(a, b) {
    return b.length - a.length;
  }

  /**
   * Read list of word-tuples from cached JSON file, check if
   * desired, then run callback with desired words
   * @param {String}
   * @param {Function}
   * @param {Function}
   */
  function readFromCache(cachePath, cont) {
    fs.readFile(cachePath, function (err, data) {
      if (err) {
        // ???
      } else {
        cont(JSON.parse(data));
      }
    });
  }

  /**
   * Read list of words from dictionary, line at a time
   * determine if possible words on this board
   * then determine if desired
   * then run callback with desired words
   * @param {Array} board
   * @param {String} wordFile
   * @param {Function} callback
   */
  function readFromStream(board, wordFile, cont) {
    var tuples = [];
    var stream = fs.createReadStream(wordFile);
    lazy(stream)
      .lines
      .map( function(line) {
        var wordStr = line.toString().replace(/\n/g, '');
        return([wordStr, canonicalize(wordStr)])
      } )
      .filter( function( tuple ) {
        return isSubset(board, tuple[1]);
      })
      .join( function(wordTuples) {
        cont(wordTuples);
      } );
  }


  /**
   * Given a board, determine all the words that could possibly go onto it
   * Relies on global variables cacheDir and wordFile
   * @param {String} cache directory
   * @param {String} word file
   * @return {Function}
   */
  function getScanner(cacheDir, wordFile) {
    /**
     * Given a board, return word scanner
     */
    return function(board) {
      var cachePath = path.join(cacheDir, board.join(""));
      var wordSource;
      return function(isDesired, cont) {
        fs.stat(cachePath, function(err, stats) {
          if (err === null && typeof stats !== 'undefined') {
            readFromCache(cachePath, cont);
          } else {
            readFromStream(board, wordFile, function(ws) {
              fs.writeFile(cachePath, JSON.stringify(ws), function(err) {
                if (err) {
                  console.log("error writing cachefile to " + cachePath);
                  /* ??? */
                } else {
                  cont(ws);
                }
              });
            });
          }
        });
      };
    };
  }

  // let's wheedle some walruses

  var appDir = path.dirname(process.argv[1]);

  var wordFile = path.join(appDir, 'words.txt');
  // command line arguments
  // argv[0] is executing binary, argv[1] is scriptname
  var commandLineArgs = process.argv.slice(2);
  var board = canonicalize(commandLineArgs[0]);

  if (board.length !== 25) {
    console.log("board must have 25 letters, instead has " + board.length);
    console.log(board);
    process.exit(1);
  }

  var desired = [];
  if (typeof commandLineArgs[1] !== 'undefined') {
    desired = canonicalize(commandLineArgs[1]);
  }
  var isDesired = getDesiredMatcher(desired);

  var wordStrs = [];
  var cacheDir = getCacheDir(appDir, cont);
  function cont(cacheDir) {
    var getBoardScanner = getScanner(cacheDir, wordFile);
    var getWordTuplesForBoard = getBoardScanner(board);
    var filteredWordsFn = function(wordTuples) {
      var wordStrs = [];
      if (wordTuples.length) {
        for (var i = 0; i < wordTuples.length; i += 1) {
          if (isDesired(wordTuples[i][1])) {
            wordStrs.push(wordTuples[i][0]);
          }
        }
        console.log(( wordStrs.sort(byLengthDescending) ).join(" "));
      }
    }
    getWordTuplesForBoard(isDesired, filteredWordsFn);
  }
}

main();
