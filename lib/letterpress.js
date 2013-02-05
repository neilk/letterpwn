var
  _ = require('underscore'),
  lpBitMask = require('../public/javascripts/letterpress-bitmask'),
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
 * @param {Array} board string representing board
 * @param {Number} minFrequency how common the words should be, positive integer <= MAX_FREQUENCY
 * @return {Array} word structures
 */
var getWordStructsForBoard = memoize(function(board, minFrequency) {
  var boardSet = set.getCanonical(board);
  var words = getMinFrequencyWords(minFrequency);
  return _.filter(words, function(struct) {
    return set.isSubset(boardSet, struct[1]);
  });
});

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
 * Get all possible moves on the board.
 * A move consists of a wordStruct and a bitmask representing where it can be played
 * @param {String} board
 * @param {Number} minFrequency
 * @return {Array} of moves
 */
var getMovesForBoard = memoize(function(board, minFrequency) {

  // get all the words, filtered by frequency
  var wordStructs = getWordStructsForBoard(board, minFrequency);

  // an index of where letters are, on the board
  var boardPositionMap = getBoardPositionMap(board);

  var moves = [];

  wordStructs.forEach(function(wordStruct) {

    // make a histogram of the letters in the word (TODO this could be precomputed, and put into the words file)
    var letterCounts = _.countBy(wordStruct[1], _.identity);

    var posCombos = [];

    for (c in letterCounts) {
      // in all the positions where c is on the board, create as many combos as we need for this word,
      // and add that to posCombos
      // e.g. if we want two "a", and "a" appears four times on the board, we'll get six combos of the four positions
      posCombos.push(kCombinations(boardPositionMap[c], letterCounts[c]));
    }

    // flatten combos out into possible board positions for this word
    var flatCombos = flattenCombos(posCombos);

    flatCombos.forEach(function(positions) {
      moves.push([wordStruct, getBitMaskForPositions(positions)]);
    });

  });

  return moves;
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
 * @return {Array} of moves sorted by score
 */
var getMovesForBoardInGameState = memoize(function(board, minFrequency, oursBitMask, theirsBitMask) {

  // add other bitmask metrics to help sort best move
  var oursProtectedBitMask = lpBitMask.getProtectedBitMask(oursBitMask)
  var theirsProtectedBitMask = lpBitMask.getProtectedBitMask(theirsBitMask);

  // these are the possible moves on the board, without regards to game state
  var moves = getMovesForBoard(board, minFrequency);

  // let's now add some information to a new array, for each move we rate how good it is
  // given current game state
  var movesScoredForGameState = moves.map(function(move) {
    var wordStruct = move[0];
    var wordBitMask = move[1];
    var newOursBitMask = (wordBitMask & ~theirsProtectedBitMask) | oursBitMask;
    var newOursProtectedBitMask = lpBitMask.getProtectedBitMask(newOursBitMask);
    var newTheirsBitMask = theirsBitMask & ~newOursBitMask;
    var newTheirsProtectedBitMask = lpBitMask.getProtectedBitMask(newTheirsBitMask);
    var newOursCount = countBits(newOursBitMask);
    var newTheirsCount = countBits(newTheirsBitMask);
    var newOursProtectedCount = countBits(newOursProtectedBitMask);
    var newTheirsProtectedCount = countBits(newTheirsProtectedBitMask);
    var vulnerability = getVulnerability(newOursProtectedBitMask);

    var gameEnder = 0;
    if ((newOursBitMask | newTheirsBitMask) === MAX_BITMASK) {
      gameEnder = (newOursCount >= POSITIONS_TO_WIN) ? 1 : -1;
    }

    // and let's add this to the moves!
    return([
      newOursProtectedCount - newTheirsProtectedCount,
      newOursCount - newTheirsCount,
      gameEnder,
      newOursBitMask,
      newTheirsBitMask,
      wordBitMask,
      wordStruct,
      vulnerability
    ]);
  });

  // we use this in the filter, to only show words with different scores.
  var latestScore = 0;

  return (movesScoredForGameState
    .sort(byBestMove)
    .filter(function(move){
      if (move[0] + move[1] != latestScore) {
        latestScore = move[0] + move[1];
        return true;
      }
      return false;
    })
  );
});

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

/**
 * Comparator for moves
 * Note we sort by frequency ascending; if two words are similar, most common one
 * should be first. (i.e. "forward" sorts before "froward")
 * @param {Array} a move
 * @param {Array} b move
 * @return {Number}
 */
function byBestMove(a, b) {
  return (  // if we don't open with a paren, JS just returns nothing. sigh.
    (b[2] - a[2]) // sort winning moves first
    || (b[0] - a[0]) // more protected positions
    || (a[7] - b[7]) // least vulnerable positions
    || (b[1] - a[1]) // more positions
    || (a[6][2] - b[6][2]) // more common words first
  );
}

/**
 * Count the number of 'on' bits for a number in binary
 * @param {Number} x
 * @return {Number}
 */
function countBits(x) {
  var result = 0;
  // strip one set bit per iteration
  while (x != 0) {
    x &= x-1;
    result++;
  }
  return result;
}

/**
 * Given a bitmask, decide how vulnerable it is to opponent
 * The most defensible positions are compact, with no "holes" for opponent to place a
 * square and build within our defended area. A square that can affect multiple squares of
 * our is particularly bad. So we sum up all adjacent squares for each
 * square (that we don't already have).
 * @param {Number} bitMask
 * @return {Number}
 */
function getVulnerability(bitMask) {
  var vulnerability = 0;
  lpBitMask.adjacent.forEach(function(a) {
    if (a[0] & bitMask) {
      vulnerability += countBits(a[1] & ~bitMask);
    }
  });
  return vulnerability;
}

/**
 * Given the possible combinations of board positions, produce a flattened list.
 * i.e. if the board is "abcb" and the word is "cab", the position combos should be:
 *    [ [ 2 ], [ 0 ], [ 1, 3 ] ]
 * and the flattened combos should be:
 *    [ [ 0, 1, 2 ], [ 0, 2, 3 ] ]
 * @param {Array} posCombos as described above
 * @return {Array} flattened combinations as described above
 */
function flattenCombos(posCombos) {
  var results = [];
  function pc(i, curr) {
    var opts = posCombos[i];
    for (var j = 0; j < opts.length; j++) {
      var myCurr = Array.prototype.slice.call(curr);
      myCurr = myCurr.concat(opts[j]);
      if (i + 1 == posCombos.length) {
        results.push(myCurr.sort());
      } else {
        pc(i + 1, myCurr);
      }
    }
  }
  if (posCombos.length > 0) {
    pc(0, []);
  }
  return results;
}


/**
 * Given a set of items, obtain all combinations of a certain length
 * @param {Array} set
 * @param {Number} count
 */
function kCombinations(set, count) {
  var results = [];
  function kc(count, start, curr) {
    for (var i = start; i < set.length; i++) {
      var myCurr = Array.prototype.slice.call(curr);
      myCurr.push(set[i]);
      if (count === 1) {
        results.push(myCurr.sort());
      } else {
        kc(count - 1, i + 1, myCurr)
      }
    }
  }
  if (count !== 0) {
    kc(count, 0, []);
  }
  return results;
}

exports.getMovesForBoardInGameState = getMovesForBoardInGameState;
exports.getBitMaskForPositions = getBitMaskForPositions;

exports.MAX_FREQUENCY = 24;
exports.DEFAULT_FREQUENCY = 15;

exports.BOARD_SIZE = 25;
var POSITIONS_TO_WIN = 13;

// this is all bits turned on in BOARD_SIZE
var MAX_BITMASK = _.range(exports.BOARD_SIZE).reduce(function (r, i) { return r | (1 << i); }, 0);
exports.MAX_BITMASK = MAX_BITMASK;
