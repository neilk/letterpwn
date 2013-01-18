var
  _ = require('underscore'),
  expressValidator = require('express-validator'),
  lru = require('lru-cache'),
  set = require('../lib/set'),
  words = require('../data/words'), // not a library - this is the dictionary
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
 * @return {Function} taking board returning matching word structures
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
  return function(board) {
    return _.filter(words, function( struct ) {
      return set.isSubset(board, struct[1]);
    });
  };
}

/**
 * Main work of this service. Call callback with array of words
 * for this board that are also desired, excluding rare words if so specified
 * @param {Function} getWordStructsForBoard cached function to get words for board
 * @param {String} board
 * @param {String} desired
 * @param {Number} minFrequency
 * @return {Array} of strings, the actual words
 */
function getDesiredWordsForBoard(getWordStructsForBoard, board, desired, minFrequency, next) {
  var boardSet = set.getCanonical(board);
  var desiredSet = set.getCanonical(desired);
  var wordStructs = getWordStructsForBoard(boardSet);
  return _.chain(words)
      .filter(function(w){
        return w[2] >= minFrequency; // throw away rare words if specified
      })
      .filter(function(w) {
        return set.isSubset(w[1], desiredSet)  // word structs that are desired
      })
      .map(function(w) {
        return w[0];   // return just the word
      })
      .value();
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
function getRoute(getWordStructsForBoard) {
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
      res.render('index', params);
    } else {
      var board = req.param('board');
      var desired = req.param('desired') || [];
      var minFrequency = req.param('minFrequency') || 0;
      var words = getDesiredWordsForBoard(getWordStructsForBoard, board, desired, minFrequency);
      params.words = words.sort(byLengthDescending);
      res.render('index', params);
    }
  };
}

/**
 * Given a function,
 * return a memoized version using an LRU cache
 *
 * n.b. functions that take functions as arguments, or rely
 * on "this" context, won't work properly
 * @param {Function}
 * @return {Function}
 */
function memoize(fn) {
  var cache = lru(10000);
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var key = args.join(':');
    var results;
    if (cache.has(key)) {
      results = cache.get(key);
    } else {
      results = fn.apply(null, args);
      cache.set(key, results);
    }
    return results;
  }
}

var getWordStructsForBoard = memoize(getWordScanner(words));

var route = getRoute(getWordStructsForBoard);

exports.index = route;

