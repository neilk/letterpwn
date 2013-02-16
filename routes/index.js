var
  expressValidator = require('express-validator'),
  lp = require('../lib/letterpress'),
  lpConfig = require('../lib/letterpress-config'),
  path = require('path'),
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

  var startTime = Date.now();

  // sequence number to ensure that ajax response matches client state
  // BTW, this is lame and nobody else should do this, but it works
  req.sanitize('seq').toInt();
  req.assert('seq', 'Sequence must be an integer greater than or equal to zero').notEmpty().min(0);

  req.assert('board', 'Board must exist').notEmpty();
  if (typeof req.param('board') !== 'undefined' && req.param('board') !== '') {
    req.sanitize('board').lettersOnly().toLowerCase();
    req.assert('board', 'Board must have ' + lpConfig.BOARD_SIZE + ' letters').len(lpConfig.BOARD_SIZE, lpConfig.BOARD_SIZE);
  }

  if (typeof req.param('minFrequency') !== 'undefined') {
    req.sanitize('minFrequency').toInt();
    req.assert('minFrequency', 'Frequency must be between 0 and ' + lpConfig.MAX_FREQUENCY)
      .min(0)
      .max(lpConfig.MAX_FREQUENCY);
  }

  var errors = req.validationErrors() || [];
  if (errors.length) {
    // how do we get the default error-renderer to do the right thing?
    throw new Error( errors );
  } else {
    var sequence = req.param('seq'); // guaranteed to exist
    var board = req.param('board'); // guaranteed to exist
    var minFrequency = typeof req.param('minFrequency') !== 'undefined' ? req.param('minFrequency') : lpConfig.DEFAULT_FREQUENCY;

    var wordsObj = lp.getWordsForBoard(board, minFrequency);

    var serverTime = Date.now() - startTime;
    res.send([sequence, wordsObj.wordStructs, wordsObj.dictionaryLength, serverTime]);

  }
}

exports.index = function(req, res, next) {
  var params = {
    'title': 'LetterPwn - a Letterpress solver by Neil K.',
    'errors': [],
    'minFrequency': 16,
    'desired': '',
    'words': []
  };
  res.render('index', params);
}


