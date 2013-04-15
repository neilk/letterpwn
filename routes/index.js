var
  expressValidator = require('express-validator'),
  lp = require('../lib/letterpress'),
  lpConfig = require('../lib/letterpress-config'),
  path = require('path'),
  set = require('../lib/set'),
  Worker = require('webworker-threads').Worker;


var worker = new Worker('bin/serverMoveComboWorker.js')

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

  if (typeof req.param('oursBitMask') !== 'undefined') {
    req.sanitize('oursBitMask').toInt();
    req.assert('oursBitMask', 'oursBitMask must be between 0 and ' + lpConfig.MAX_BITMASK)
      .min(0)
      .max(lpConfig.MAX_BITMASK);
  }

  if (typeof req.param('theirsBitMask') !== 'undefined') {
    req.sanitize('theirsBitMask').toInt();
    req.assert('theirsBitMask', 'theirsBitMask must be between 0 and ' + lpConfig.MAX_BITMASK)
      .min(0)
      .max(lpConfig.MAX_BITMASK);
  }

  if (typeof req.param('isClientComboAble') !== 'undefined') {
    req.sanitize('isClientComboAble').toBoolean();
  }

  var errors = req.validationErrors() || [];
  if (errors.length) {
    // how do we get the default error-renderer to do the right thing?
    throw new Error( errors );
  } else {
    var sequence = req.param('seq'); // guaranteed to exist
    var board = req.param('board'); // guaranteed to exist
    var minFrequency = typeof req.param('minFrequency') !== 'undefined' ? req.param('minFrequency') : lpConfig.DEFAULT_FREQUENCY;
    var oursBitMask = typeof req.param('oursBitMask') !== 'undefined' ? req.param('oursBitMask') : 0;
    var theirsBitMask = typeof req.param('theirsBitMask') !== 'undefined' ? req.param('theirsBitMask') : 0;
    var isClientComboAble = typeof req.param('isClientComboAble') !== 'undefined' ? req.param('isClientComboAble') : false;

    var wfb = lp.getWordsForBoard(board, minFrequency);
    var wordStructs = wfb.wordStructs;
    var dictionaryLength = wfb.dictionaryLength;

    var stats = {
      dictionaryLength: wfb.dictionaryLength,
      wordsLength: wordStructs.length
    };

    /**
     * Send results to client, in a way we can invoke inline, or in a callback
     * invoked when worker completes.
     * @param {String} objType 'words' or 'moves'
     * @param {Object} obj whatever we're sending
     * @param {Object} extraStats object of simple key-value pairs, stats about what was considered
     */
    function sendToClient(objType, obj, extraStats) {

      if (typeof extraStats !== 'undefined') {
        for (var key in extraStats) {
          stats[key] = extraStats[key];
        }
      }
      stats['computeTime'] = Date.now() - startTime;

      // and send!
      res.send([sequence, objType, obj, stats]);
    }


    /* if client can calculate moves, just send the words. Otherwise get a worker to
       do the calculation here on the server */
    if (isClientComboAble) {
      sendToClient('words', wfb.wordStructs);
    } else {
      worker.onmessage = function(movesObj) {
        sendToClient('moves', movesObj.topMoves, { movesLength: movesObj.movesLength });
      };
      worker.postMessage(
        {
          board: board,
          wordStructs: wordStructs,
          oursBitMask: oursBitMask,
          theirsBitMask: theirsBitMask
        }
      );
    }

  }
}

exports.index = function(req, res, next) {
  var params = {
    'errors': [],
    'minFrequency': 16,
    'desired': '',
    'words': []
  };
  res.render('index', params);
}


