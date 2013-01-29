var
  _ = require('underscore'),
  memoize = require('lru-memoize'),
  set = require('../lib/set'),
  words = require('../data/words'); // not a library - this is the dictionary

/**
 * Words is an array of arrays, such like:
 * [
 *   string (actual word),
 *   array (canonical array of letters in that word)
 *   frequency (Number, integer between 0 and MAX_FREQUENCY)
 * ]
 */

var getMinFrequencyWords = memoize(
  /**
   * Get dictionary filtered for how common the words are
   * @param {Number} minFrequency positive integer <= MAX_FREQUENCY
   * @return {Array} word structure
   */
  function(minFrequency) {
    return _.filter(words, function(w){ return w[2] >= minFrequency; })
  }
);

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
 * Determine possible words on this board, filtered by how
 * common those words are
 *
 * @param {Number} minFrequency how common the words should be, positive integer <= MAX_FREQUENCY
 * @param {Array} boardSet array representing board
 * @return {Array} word structures
 */
var getWordStructsForBoard = memoize(function(minFrequency, boardSet) {
  var words = getMinFrequencyWords(minFrequency);
  return _.filter(words, function(struct) {
    return set.isSubset(boardSet, struct[1]);
  });
});

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
  var wordStructs = getWordStructsForBoard(minFrequency, boardSet);
  return _.chain(wordStructs)
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
