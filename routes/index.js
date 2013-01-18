var
  _ = require('underscore'),
  diskcache = require('./lib/diskcache'),
  expressValidator = require('express-validator'),
  routeWhenReady = require('./lib/routeWhenReady'),
  set = require('./lib/set'),
  words = require('./data/words'), // not a library - this is the dictionary
  util = require('util');

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
 * Return a function closed over a complex structure of words
 * (This is so we can make the inner function cacheable)
 * @param {Array} words
 * @return {Function} taking board and callback
 */
function getWordScanner(words) {
  /**
   * Read list of words from dictionary
   * determine possible words on this board
   * then run callback with possible words
   * using a callback here because this function is cached with external files and/or an LRU,
   * and thus will do IO
   *
   * @param {Array} words canonical data structure of dictionary words
   * @param {Function} callback
   */
  return function(board, next) {
    next(_.filter(words, function( struct ) {
      return set.isSubset(board, struct[1]);
    }));
  };
}

/**
 * Main work of this service. Call callback with array of words
 * for this board that are also desired, excluding rare words if so specified
 * @param {Function} getWordStructsForBoard cached function to get words for board
 * @param {String} board
 * @param {String} desired
 * @param {Number} minFrequency
 * @param {Function} next callback
 */
function getDesiredWordsForBoard(getWordStructsForBoard, board, desired, minFrequency, next) {
  var boardSet = set.getCanonical(board);
  var desiredSet = set.getCanonical(desired);
  getWordStructsForBoard(boardSet, function(words) {
    next(
      _.chain(words)
        .filter(function(w){
          return w[2] >= minFrequency; // throw away rare words if specified
        })
        .filter(function(w) {
          return set.isSubset(w[1], desiredSet)  // word structs that are desired
        })
        .map(function(w) {
          return w[0];   // return just the word
        })
        .value()
    );
  });
}


/**
 * Partial to print words to response
 * @param {http.response} res
 * @return {Function}
 */
function getWordPrinter(res, params) {
  /**
   * Render template to client
   * @param {Array} words array of strings
   */
  return function(words) {
    params.words = words.sort(byLengthDescending);
    res.render('index', params);
  }
}


// some extra filters for our processing
expressValidator.Filter.prototype.toLowerCase = function() {
  this.modify(this.str.toLowerCase());
  return this.str;
};

expressValidator.Filter.prototype.lettersOnly = function() {
  this.modify(this.str.replace(/[^a-z]/g, ''));
  return this.str;
};


/**
 * Actually serve requests
 * @param {Function} getWordStructsForBoard efficiently cached function to get the words for a particular board
 * @return {Function} suitable for serving requests
 */
function getHandler(getWordStructsForBoard) {
  var MAX_FREQUENCY = 24;

  return function (req, res) {
    req.assert('board', 'Board must exist').notEmpty();
    if (typeof req.param('board') !== 'undefined') {
      req.sanitize('board').lettersOnly().toLowerCase();
      req.assert('board', 'Board must have 25 letters').len(25, 25);
    }

    if (typeof req.param('desired') !== 'undefined') {
      req.sanitize('desired').lettersOnly().toLowerCase();
      req.assert('desired', 'Desired letters must be 25 letters maximum').len(0, 25);
    }

    req.sanitize('minFrequency').toInt();
    req.assert('minFrequency', 'Frequency must be between 0 and ' + MAX_FREQUENCY)
      .min(0)
      .max(MAX_FREQUENCY);

    var params = {
      'board': req.param('board'),
      'desired': req.param('desired'),
      'minFrequency': req.param('minFrequency'),
      'errors': [],
      'words': [],
      'title': 'Letterpress cheat!'
    };
    var errors = req.validationErrors();
    if (errors) {
      params.errors = errors;
      console.log(errors);
      res.render('index', params);
    } else {
      var board = req.param('board');
      var desired = req.param('desired') || [];
      var minFrequency = req.param('minFrequency') || 0;
      var printWords = getWordPrinter(res, params);
      getDesiredWordsForBoard(getWordStructsForBoard, board, desired, minFrequency, printWords);
    }
  };
}

/* when ready, replace it with the real handler */
var getDiskCachedHandler = function(ready) {
  diskcache.init(__dirname, function(cacheize) {
    var getWordStructsForBoard = cacheize(getWordScanner(words));
    ready(getHandler(getWordStructsForBoard));
  });
};




exports.index = routeWhenReady(getDiskCachedHandler);
