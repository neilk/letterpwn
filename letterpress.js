var fs = require('fs');

var cacheDir = process.env.HOME + '/.letterpressCache';

var board, desired;

// argv[0] is executing binary, argv[1] is scriptname
var arg = process.argv.slice(2);
var board = letterStringToCanonicalArray(arg[0]);
var desired = letterStringToCanonicalArray(arg[1]);

console.log(board);
console.log(desired);

/**
 * Take a string, return canonical array of characters
 * @param {String} letters
 * @return {Array} of single character strings
 */
function letterStringToCanonicalArray(letterStr) {
  letterStr.replace(/\W/g, '');
  var arr = [];
  for (var i = 0; i < letterStr.length; i += 1) {
    arr.push(letterStr[i]);
  }
  return arr;
}

