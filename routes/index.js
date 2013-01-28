var
  expressValidator = require('express-validator'),
  lp = require('../lib/letterpress');


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

  if (typeof req.param('desired') !== 'undefined') {
    req.sanitize('desired').lettersOnly().toLowerCase();
    req.assert('desired', 'Desired letters must be ' + lp.BOARD_SIZE + ' letters maximum').len(0, lp.BOARD_SIZE);
    req.assert('desired').isSubsetOf(req.param('board'));
  }

  if (typeof req.param('minFrequency') !== 'undefined') {
    req.sanitize('minFrequency').toInt();
    req.assert('minFrequency', 'Frequency must be between 0 and ' + lp.MAX_FREQUENCY)
      .min(0)
      .max(lp.MAX_FREQUENCY);
  }

  var errors = req.validationErrors() || [];
  if (errors.length) {
    // how do we get the default error-renderer to do the right thing?
    throw new Error( errors );
  } else {
    var board = req.param('board'); // guaranteed to exist
    var desired = req.param('desired') || '';
    var minFrequency = typeof req.param('minFrequency') !== 'undefined' ? req.param('minFrequency') : lp.DEFAULT_FREQUENCY;
    var words = lp.getDesiredWordsForBoard(board, desired, minFrequency);
    res.send(words);
  }
}

exports.index = function(req, res, next) {
  var params = {
    'title': 'lp cheat! with API',
    'errors': [],
    'minFrequency': 16,
    'desired': '',
    'words': []
  };
  res.render('index', params);
}

