var   fs = require('fs'),
      path = require('path'),
      util = require('util'),
      lazy = require('lazy'),
      events = require('events');

// set up cache directory
var appDir = path.dirname(process.argv[1]);

var cacheDir = getCacheDir(appDir);
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
if (typeof commandLineArgs[1] !== null) {
  desired = canonicalize(commandLineArgs[1]);
}
console.log(board);
console.log(desired);



/**
 * Given a board, determine all the words that could possibly go onto it
 * Relies on global variables cacheDir and wordFile
 * @param {Array} of chars
 * @return {Array} of {Array} of chars, representing words
 */
function getPossibleWords(board) {
  var words = [];
  var cachePath = path.join(cacheDir, board.join(""));
  /*if (fs.existsSync(cachePath)) {
    words = fs.readFileSync(cachePath);
  } else {
  */

    var words;
    function checkLine(line) {
      var wordStr = line.toString();
      wordStr = wordStr.replace(/\n/g, '');
      var word = canonicalize(wordStr);
      if (isSubset(board, word)) {
        return [wordStr, word];
      }
      console.log("processed " + word);
    }

    console.log("about to read...");
    var stream = fs.createReadStream(wordFile);
    var reader = new lazy(stream).lines.forEach(checkLine).on('pipe');
    console.log("after read...");
    console.log(reader);
    process.exit(0);
//    fs.writeFileSync(cachePath, words);
  // }
  return words;
}

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
 * Given a directory, set up a cache directory with appropriate permissions.
 * If and when we do this for reals, should be part of VM setup (Vagrant or whatever)
 * Actually, this should all be memcacheable
 * Exits with error if cannot do so
 * @param {String} directory appDir
 * @param {String} directory cacheDir
 */
function getCacheDir(appDir) {
  var cacheDir = path.join(appDir, '.letterPressCache');
  var cacheDirStat = fs.statSync(cacheDir);
  if (!cacheDirStat.isDirectory()) {
    fs.mkdirSync(cacheDir);
  } else {
    if ((cacheDirStat.mode & 0700) !== 0700) {
      console.log("permissions are wrong for cacheDir: %s missing user %s %s %s",
                  cacheDir,
                  cacheDirStat.mode & 0400 ? '' : 'read',
                  cacheDirStat.mode & 0200 ? '' : 'write',
                  cacheDirStat.mode & 0100 ? '' : 'execute/traverse');
      process.exit(1);
    }
  }
  return cacheDir;
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


var wordStrs = [];
var isDesired = getDesiredMatcher(desired);
var possibleWordTuples = getPossibleWords(board);
for (var i = 0; i < possibleWordsTuples.length; i += 1) {
  var wordStr = possibleWords[i][0];
  var word = possibleWords[i][1];
  if (isDesired(word)) {
    wordStrs.push(wordStr);
  }
}

if (wordStrs.length) {
  // sort
  console.log(( wordStrs.sort(byLengthDescending) ).join(" "));
}
