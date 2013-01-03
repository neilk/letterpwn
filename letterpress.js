var   diskcache = require('diskcache'),
      fs = require('fs'),
      lazy = require('lazy'),
      path = require('path');

// N.b. throughout this program, "word" refers to a data structure which contains the original
// word and a canonical representation of it

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
 * Read list of words from dictionary, line at a time
 * determine possible words on this board
 * then run callback with possible words
 *
 * n.b. the canonical representation can and should be
 * cached, but then we'd have to slurp it into memory
 * and run this as a daemon
 *
 * @param {Array} board
 * @param {String} wordFile
 * @param {Function} callback
 */
function getWordsForBoard(board, wordFile, cont) {
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
    .join( function(words) {
      cont(words);
    } );
}

function getDesiredWords(isDesired, cont) {
  return function(words) {
    var wordStrs = [];
    if (words.length) {
      for (var i = 0; i < words.length; i += 1) {
        if (isDesired(words[i][1])) {
          wordStrs.push(words[i][0]);
        }
      }
    }
    cont(wordStrs);
  };
};

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
var printDesiredWordsSorted = getDesiredWords(isDesired, function(wordStrs) {
  console.log(( wordStrs.sort(byLengthDescending) ).join(" "));
});

diskcache.init(appDir, function(cacheize) {
  var cachedGetWordsForBoard = cacheize(getWordsForBoard);
  cachedGetWordsForBoard(board, wordFile, printDesiredWordsSorted);
});


