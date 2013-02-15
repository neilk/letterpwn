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
 * Given a string representing a board, return a map of
 * where each letter is used on the board
 * TODO could return the bitmap position, to save some time
 * e.g. given "aba", return { "a": [0, 2], "b": [1] }
 * @param {String} board
 * @return {Array} as described above
 */
var getBoardPositionMap = memoize(function(board) {
  var boardMap = {};
  for (var i = 0; i < board.length; i += 1) {
    var c = board[i];
    if (!(c in boardMap)) {
      boardMap[c] = [];
    }
    boardMap[c].push(i);
  }
  return boardMap;
});

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
function getMovesForBoardInGameState(board, minFrequency, oursBitMask, theirsBitMask, comboWorker, next) {


  // these are the possible moves on the board, without regards to game state
  // get all the words, filtered by frequency
  var dictionary = getDictionary(minFrequency);
  var wordStructs = getWordStructsForBoardDictionary(board, dictionary);


  // moves can have combinatoric explosion, so we pass it to a worker
  comboWorker.send(
    {
      board: board,
      wordStructs: wordStructs,
      oursBitMask: oursBitMask,
      theirsBitMask: theirsBitMask
    },
    function(m) {
      next({
        dictionaryLength: dictionary.length,
        wordsLength: wordStructs.length,
        movesLength: m.movesLength,
        topMoves: m.topMoves
      });
    }
  );

}

/**
 * Given a sorted list of board positions like
 *   [ 10, 11, 15 ]
 * Produce a number, whose on bits in binary correspond to these positions
 * @param {Array} positions simple array of positive integers <= 24
 * @return {Number}
 */
function getBitMaskForPositions(positions) {
  var bitMask = 0;
  positions.forEach(function(p) {
    bitMask |= (1 << p);
  });
  return bitMask;
}

exports.getMovesForBoardInGameState = getMovesForBoardInGameState;
exports.getBitMaskForPositions = getBitMaskForPositions;
exports.getBoardPositionMap = getBoardPositionMap;


