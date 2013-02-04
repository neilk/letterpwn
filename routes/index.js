var
  expressValidator = require('express-validator'),
  lp = require('../lib/letterpress'),
  set = require('../lib/set');


// some extra filters for our processing
expressValidator.Filter.prototype.toLowerCase = function() {
  this.modify(this.str.toLowerCase());
  return this.str;
};

expressValidator.Filter.prototype.lettersOnly = function() {
  this.modify(this.str.replace(/[^a-z]/g, ''));
  return this.str;
};

expressValidator.Validator.prototype.isSubsetOf = function(supersetStr) {
  if (!set.isSubset(set.getCanonical(supersetStr), set.getCanonical(this.str))) {
    this.error(this.msg || this.str + ' is not a subset of ' + supersetStr);
  }
  return this;
};

/**
 * Actually serve requests
 */
exports.api = function(req, res, next) {
  req.assert('board', 'Board must exist').notEmpty();
  if (typeof req.param('board') !== 'undefined' && req.param('board') !== '') {
    req.sanitize('board').lettersOnly().toLowerCase();
    req.assert('board', 'Board must have ' + lp.BOARD_SIZE + ' letters').len(lp.BOARD_SIZE, lp.BOARD_SIZE);
  }

  if (typeof req.param('minFrequency') !== 'undefined') {
    req.sanitize('minFrequency').toInt();
    req.assert('minFrequency', 'Frequency must be between 0 and ' + lp.MAX_FREQUENCY)
      .min(0)
      .max(lp.MAX_FREQUENCY);
  }

  if (typeof req.param('oursBitMask') !== 'undefined') {
    req.sanitize('oursBitMask').toInt();
    req.assert('oursBitMask', 'oursBitMask must be between 0 and ' + lp.MAX_BITMASK)
      .min(0)
      .max(lp.MAX_BITMASK);
  }

  if (typeof req.param('theirsBitMask') !== 'undefined') {
    req.sanitize('theirsBitMask').toInt();
    req.assert('theirsBitMask', 'theirsBitMask must be between 0 and ' + lp.MAX_BITMASK)
      .min(0)
      .max(lp.MAX_BITMASK);
  }

  var errors = req.validationErrors() || [];
  if (errors.length) {
    // how do we get the default error-renderer to do the right thing?
    throw new Error( errors );
  } else {
    var board = req.param('board'); // guaranteed to exist
    var minFrequency = typeof req.param('minFrequency') !== 'undefined' ? req.param('minFrequency') : lp.DEFAULT_FREQUENCY;
    var oursBitMask = typeof req.param('oursBitMask') !== 'undefined' ? req.param('oursBitMask') : 0;
    var theirsBitMask = typeof req.param('theirsBitMask') !== 'undefined' ? req.param('theirsBitMask') : 0;
    var moves = lp.getMovesForBoardInGameState(board, minFrequency, oursBitMask, theirsBitMask);

    // send top 10, removing data to only show bitmask and string representation of word.
    res.send(
      moves
        .slice(0, 9)
        .map(function(move) {
          // send ["word", wordBitMask, newOursBitMask, newTheirsBitMask ]
          return [move[6][0], move[5], move[3], move[4]];
        })
    );
  }
}

exports.index = function(req, res, next) {
  var params = {
    'title': 'letterpress cheat! with API',
    'errors': [],
    'minFrequency': 16,
    'desired': '',
    'words': []
  };
  res.render('index', params);
}

exports.slidetest = function(req, res, next) {
  res.render('empty', { title: 'slidetest'} );
};

