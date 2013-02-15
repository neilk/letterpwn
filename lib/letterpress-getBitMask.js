/**
 * Given a sorted list of board positions like
 *   [ 10, 11, 15 ]
 * Produce a number, whose on bits in binary correspond to these positions
 * @param {Array} positions simple array of positive integers <= 24
 * @return {Number}
 */
exports.getBitMaskForPositions = function(positions) {
  return positions.reduce(function(bitMask, p) { return bitMask |= (1 << p) }, 0);
}


