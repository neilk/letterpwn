var
  _ = require('underscore'),
  lpBitMask = require('../public/javascripts/letterpress-bitmask'),
    countBits = lpBitMask.countBits,
  lpConfig = require('../lib/letterpress-config'),
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

var getDictionary = memoize(
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
 * Determine possible words on this board, filtered by how
 * common those words are
 *
 * @param {Array} board string representing board
 * @param {Number} minFrequency how common the words should be, positive integer <= MAX_FREQUENCY
 * @return {Array} [wordstructures, number of words in dictionary for this minimum frequency]
 */
function getWordStructsForBoardDictionary(board, dictionary) {
  var boardSet = set.getCanonical(board);
  var wordStructs = _.filter(dictionary, function(struct) {
    return set.isSubset(boardSet, struct[1]);
  });
  return wordStructs;
}

/**
 * Main work of this service. Find moves on this board, using words
 * that are at least as frequent as minimum specified frequency,
 * ordered by how well they increase our score given board situation
 * described in the bitmasks
 * @param {String} board
 * @param {Number} minFrequency
 * @param {Number} oursBitMask
 * @param {Number} theirsBitMask
 * @return {Array} of [moves sorted by score, number of moves considered, dictionary length, number of words considered]
 */
function getWordsForBoard(board, minFrequency) {


  // these are the possible moves on the board, without regards to game state
  // get all the words, filtered by frequency
  var dictionary = getDictionary(minFrequency);
  var wordStructs = getWordStructsForBoardDictionary(board, dictionary);

  return {
    wordStructs: wordStructs,
    dictionaryLength: dictionary.length
  };

}

exports.getWordsForBoard = getWordsForBoard;


