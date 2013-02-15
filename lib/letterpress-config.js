var _ = require('underscore');

exports.MAX_FREQUENCY = 24;
exports.DEFAULT_FREQUENCY = 15;

exports.BOARD_SIZE = 25;
var POSITIONS_TO_WIN = 13;

// this is all bits turned on in BOARD_SIZE
var MAX_BITMASK = _.range(exports.BOARD_SIZE).reduce(function (r, i) { return r | (1 << i); }, 0);
exports.MAX_BITMASK = MAX_BITMASK;



/**
 * Given a sorted list of board positions like
 *   [ 10, 11, 15 ]
 * Produce a number, whose on bits in binary correspond to these positions
 * @param {Array} positions simple array of positive integers <= 24
 * @return {Number}
 */
exports.getBitMaskForPositions = function(positions) {
  var bitMask = 0;
  positions.forEach(function(p) {
    bitMask |= (1 << p);
  });
  return bitMask;
}


