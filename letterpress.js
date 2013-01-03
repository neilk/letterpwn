var
  _ = require('underscore'),
  diskcache = require('diskcache'),
  fs = require('fs'),
  http = require('http'),
  lazy = require('lazy'),
  path = require('path'),
  url = require('url');

// N.b. throughout this program, "word" refers to a data structure which contains the original
// word and a canonical representation of it

/**
 * Given two sorted arrays of chars, determine if 2nd is subset of 1st
 * @param {Array} of chars
 * @param {Array} of chars
 * @return {Boolean}
 */
function isSubset(set, sub) {
  for (var setI = 0, subI = 0; setI < set.length && subI < sub.length; setI += 1) {
    if (set[setI] === sub[subI]) {
      subI++;
    }
  }
  return subI == sub.length;
}

/**
 * Return function to determine if a word has all desired characters
 * @param {Array} of chars - desired chars
 * @return {Function}
 */
function getDesiredMatcher(desired) {
  /**
   * Checks if a given word has all the desired characters
   * @param {Array} of chars
   * @return {Boolean}
   */
  return function(word) {
    return isSubset(word, desired);
  }
}


/**
 * Take string, return canonical sorted array of characters
 * @param {String} letters
 * @return {Array} of single character strings
 */
function canonicalize(s) {
  var arr = [];
  if (typeof s === 'string') {
    s = s.replace(/\W/g, '');
    for (var i = 0; i < s.length; i += 1) {
      arr.push(s[i]);
    }
  }
  return arr.sort();
}

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
   * may want to cache this outside process or in LRU cache or something...?
   * leaving callback in for now in case there is some IO to do here
   *
   * @param {Array} words canonical data structure of dictionary words
   * @param {Function} callback
   */
  return function(board, cont) {
    cont(_.filter(words, function( tuple ) {
      return isSubset(board, tuple[1]);
    }));
  };
}

function getDesiredWords(isDesired, cont) {
  return function(words) {
    var wordStrs = [];
    if (words.length) {
      for (var i = 0; i < words.length; i += 1) {
        if (isDesired(words[i][1])) {
          wordStrs.push(words[i][0]);
        }
      }
    }
    cont(wordStrs);
  };
};

function serve(getWordsForBoard) {
  http.createServer(function (req, res) {
    var query = url.parse(req.url, true).query;
    if (typeof query.board == 'undefined') {
      res.writeHead(500, {'Content-Type': 'text/plain'});
      res.end("board must exist");
    } else {
      var board = canonicalize(query.board);
      if (board.length !== 25) {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end("board must have 25 letters");
      } else {
        console.log("got a request");
        var desired = [];
        if (typeof query.desired !== 'undefined') {
          desired = canonicalize(query.desired);
        }
        console.log("got a request with desire");
        var isDesired = getDesiredMatcher(desired);
        console.log("got a request with desire, matcher");
        var printDesiredWordsSorted = getDesiredWords(isDesired, function(wordStrs) {
          console.log("printing!");
          var results = wordStrs.sort(byLengthDescending).join(" ");
          res.writeHead(200, {'Content-Type': 'text/plain'});
          res.end(results);
        });
        console.log("calling cached function");
        getWordsForBoard(board, printDesiredWordsSorted);
      }
    }
  }).listen(1337, '127.0.0.1');
  console.log('Server running at http://127.0.0.1:1337');
}


/**
 * initializes canonical words data structure from disk, calls callback
 * @param {String} wordFile path to file containing words, one per line
 * @param {Function} cont callback
 */
function getWords(wordFile, cont) {
  var stream = fs.createReadStream(wordFile);
  lazy(stream)
    .lines
    .map( function(line) {
      var wordStr = line.toString().replace(/\n/g, '');
      return([wordStr, canonicalize(wordStr)])
    } )
    .join( function(words) {
      cont(words);
    } );
}


// let's wheedle some walruses

var appDir = path.dirname(process.argv[1]);
var wordFile = path.join(appDir, 'words.txt');

diskcache.init(appDir, function(cacheize) {
  console.log("loading word files...");
  getWords(wordFile, function (words) {
    console.log("loaded " + words.length + " words");
    var getWordsForBoard = cacheize(getWordScanner(words));
    serve(getWordsForBoard);
  });
});



