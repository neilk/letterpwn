var _ = require('underscore');

exports.MAX_FREQUENCY = 24;
exports.DEFAULT_FREQUENCY = 15;

exports.BOARD_SIZE = 25;
var POSITIONS_TO_WIN = 13;

// this is all bits turned on in BOARD_SIZE
var MAX_BITMASK = _.range(exports.BOARD_SIZE).reduce(function (r, i) { return r | (1 << i); }, 0);
exports.MAX_BITMASK = MAX_BITMASK;
