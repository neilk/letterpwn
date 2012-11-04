var fs = require('fs');
var path = require('path');
var util = require('util');


// set up cache directory
var appDir = path.dirname(process.argv[1]);

var cacheDir = getCacheDir(appDir);
// command line arguments
// argv[0] is executing binary, argv[1] is scriptname
var commandLineArgs = process.argv.slice(2);
var board = letterStringToCanonicalArray(commandLineArgs[0]);
var desired = letterStringToCanonicalArray(commandLineArgs[1]);


console.log(board);
console.log(desired);


/**
 * Take a string, return sorted array of characters
 * @param {String} letters
 * @return {Array} of single character strings
 */
function letterStringToCanonicalArray(letterStr) {
  letterStr.replace(/\W/g, '');
  var arr = [];
  for (var i = 0; i < letterStr.length; i += 1) {
    arr.push(letterStr[i]);
  }
  return arr.sort();
}

/**
 * Given directory, set up a cache directory with appropriate permissions.
 * Exits with error if cannot do so
 * @param {String} directory
 * @param {String} cache directory
 */
function getCacheDir(appDir) {
  var cacheDir = path.join(appDir, '.letterPressCache');
  var cacheDirStat = fs.statSync(cacheDir);
  if (!cacheDirStat.isDirectory()) {
    fs.mkdirSync(cacheDir);
  } else {
    console.log(cacheDirStat.mode & 0700);
    if ((cacheDirStat.mode & 0700) !== 0700) {
      console.log("permissions are wrong for cacheDir: %s missing user %s %s %s",
                  cacheDir,
                  cacheDirStat.mode & 0400 ? '' : 'read',
                  cacheDirStat.mode & 0200 ? '' : 'write',
                  cacheDirStat.mode & 0100 ? '' : 'execute/traverse');
      process.exit(1);
    }
  }
  return cacheDir;
}


