var
  _ = require('underscore'),
  memoize = require('lru-memoize'),
  set = require('../lib/set'),
  words = require('../data/words'); // not a library - this is the dictionary

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
 * @return {Function} taking board returning matching word structures
 */
function getWordScanner(words) {
  /**
   * Read list of words from dictionary
   * determine possible words on this board
   * then run callback with possible words
   * using a callback here because this function is cached with external files and/or an LRU,
   * and thus will do IO
   *
   * @param {Array} words canonical data structure of dictionary words
   * @param {Function} callback
   */
  return function(board) {
    return _.filter(words, function( struct ) {
      return set.isSubset(board, struct[1]);
    });
  };
}

var getWordStructsForBoard = memoize(getWordScanner(words));

/**
 * Main work of this service. Find words on this board that match desired letters and
 * are at least as frequent as minimum specified frequency
 * @param {String} board
 * @param {String} desired
 * @param {Number} minFrequency
 * @return {Array} of strings, the actual words
 */
function getDesiredWordsForBoard(board, desired, minFrequency) {
  var boardSet = set.getCanonical(board);
  var desiredSet = set.getCanonical(desired);
  var wordStructs = getWordStructsForBoard(boardSet);
  return _.chain(wordStructs)
      .filter(function(w){
        return w[2] >= minFrequency; // throw away rare words if specified
      })
      .filter(function(w) {
        return set.isSubset(w[1], desiredSet)  // word structs that are desired
      })
      .map(function(w) {
        return w[0];   // return just the word
      })
      .value()
      .sort(byLengthDescending);
};


exports.getDesiredWordsForBoard = getDesiredWordsForBoard;

exports.MAX_FREQUENCY = 24;
exports.DEFAULT_FREQUENCY = 15;

exports.BOARD_SIZE = 25;
