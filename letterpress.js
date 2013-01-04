var
  _ = require('underscore'),
  diskcache = require('diskcache'),
  fs = require('fs'),
  http = require('http'),
  lazy = require('lazy'),
  path = require('path'),
  url = require('url');

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
 * Return a function closed over a complex structure of words
 * (This is so we can make the inner function cacheable)
 * @param {Array} words
 * @return {Function} taking board and callback
 */
function getWordScanner(words) {
  /**
   * Read list of words from dictionary
   * determine possible words on this board
   * then run callback with possible words
   * may want to cache this outside process or in LRU cache or something...?
   * leaving callback in for now in case there is some IO to do here
   *
   * @param {Array} words canonical data structure of dictionary words
   * @param {Function} callback
   */
  return function(board, next) {
    next(_.filter(words, function( struct ) {
      return isSubset(board, struct[1]);
    }));
  };
}

/**
 * Actually serve requests
 * @param {Function} getWordStructsForBoard efficiently cached function to get the words for a particular board
 */
function serve(getWordStructsForBoard) {
  http.createServer(function (req, res) {
    var query = url.parse(req.url, true).query;
    if (typeof query.board == 'undefined') {
      res.writeHead(500, {'Content-Type': 'text/plain'});
      res.end("board must exist");
    } else {
      var board = canonicalize(query.board);
      if (board.length !== 25) {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end("board must have 25 letters");
      } else {
        console.log("got a request");
        var desired = [];
        if (typeof query.desired !== 'undefined') {
          desired = canonicalize(query.desired);
        }

        minFrequency = 0;
        if (typeof query.minFrequency !== 'undefined') {
          minFrequency = parseInt(query.minFrequency, 10);
          if (minFrequency > MAX_FREQUENCY) {
            minFrequency = MAX_FREQUENCY;
          }
          if (isNaN(minFrequency) || minFrequency < 0) {
            minFrequency = 0;
          }
        }

        /**
         * Main work of this service. Call callback with array of words
         * for this board that are also desired, excluding rare words if so specified
         * @param {Function} getWordStructsForBoard cached function to get words for board
         * @param {Array} board
         * @param {Array} desired array of characters
         * @param {Number} minFrequency
         * @param {Function} next callback
         */
        function getDesiredWordsForBoard(getWordStructsForBoard, board, desired, minFrequency, next) {
          getWordStructsForBoard(board, function(words) {
            next(
              _.chain(words)
                .filter(function(w){
                  return w[2] >= minFrequency; // throw away rare words if specified
                })
                .filter(function(w) {
                  return isSubset(w[1], desired)  // word structs that are desired
                })
                .map(function(w) {
                  return w[0];   // return just the word
                })
                .value()
            );
          });
        }

        function printWords(words) {
          console.log("printing!");
          res.writeHead(200, {'Content-Type': 'text/plain'});
          res.end(words.sort(byLengthDescending).join(" "));
        }

        getDesiredWordsForBoard(getWordStructsForBoard, board, desired, minFrequency, printWords);
      }
    }
  }).listen(1337, '127.0.0.1');
  console.log('Server running at http://127.0.0.1:1337');
}


/**
 * Initializes canonical words data structure from disk, calls callback
 * with this data structure.
 * Creates an array of 'word structs', an array of arrays where each element is of the form
 *   [ word, canonical-word, frequency ]
 *      word is simply the word, as a string
 *      canonical-word is the word unpacked into a sorted array of characters, good for instant subset comparisons
 *      frequency is an integer from 1-24 expressing how common this word is. 1=very rare, 24=very common. Log scale.
 * @param {String} wordFile path to file containing words and frequencies, tab separated, one per line
 * @param {Function} next callback
 */
function getWords(wordFile, next) {
  var stream = fs.createReadStream(wordFile);
  lazy(stream)
    .lines
    .map( function(line) {
      var wordFreq = line.toString().replace(/\n/g, '').split(/\t/);
      var word = wordFreq[0];
      var frequency = parseInt(wordFreq[1], 10);
      return([word, canonicalize(word), frequency])
    } )
    .join( function(wordStructs) {
      next(wordStructs);
    } );
}


// let's wheedle some walruses

var appDir = path.dirname(process.argv[1]);
var wordFile = path.join(appDir, 'words-freq-sorted-log.txt');
var MAX_FREQUENCY = 24;

diskcache.init(appDir, function(cacheize) {
  console.log("loading word files...");
  getWords(wordFile, function (words) {
    console.log("loaded " + words.length + " words");
    var getWordStructsForBoard = cacheize(getWordScanner(words));
    serve(getWordStructsForBoard);
  });
});



