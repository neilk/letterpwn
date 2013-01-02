var fs = require('fs'),
    md5 = require('MD5'),
    path = require('path');

/**
 * Given a directory, set up a cache directory with appropriate permissions.
 * If and when we do this for reals, should be part of VM setup (Vagrant or whatever)
 * Actually, this should all be memcacheable
 * Exits with error if cannot do so
 * @param {String} directory appDir
 * @param {Function} continue
 */
function init(baseDir, cont) {
  var dir = path.join(baseDir, '.diskcache');
  function cacheFn(error, dirStat) {
    if (error || !dirStat.isDirectory()) {
      function mkdirFn(error) {
        if (error) {
          console.log("error creating directory:" + error)
          process.exit(1);
        }
        cont(getCacheizer(dir));
      }
      fs.mkdir(dir, mkdirFn);
    } else {
      if ((dirStat.mode & 0700) !== 0700) {
        console.log("permissions are wrong for dir: %s missing user %s %s %s",
                    dir,
                    dirStat.mode & 0400 ? '' : 'read',
                    dirStat.mode & 0200 ? '' : 'write',
                    dirStat.mode & 0100 ? '' : 'execute/traverse');
                    process.exit(1);
      }
      cont(getCacheizer(dir));
    }
  }
  fs.stat(dir, cacheFn);
}

/**
 * Given a cache directory, return a function that can be used to make
 * other functions use an on-disk cache in that directory
 * @param {String} cacheDir
 * @return {Function}
 */
function getCacheizer(cacheDir) {

  /**
   * Read data from cache into a callback
   * @param {String} cachePath
   * @param {Function} cb
   */
  function readFromCache(cachePath, cb) {
    // if we have it in cache, read it into the callback
    fs.readFile(cachePath, function (err, data) {
      if (err) {
        console.log("could not read from cache file " + cachePath);
      } else {
        cb(JSON.parse(data));
      }
    });
  }

  /**
   * Call a function with arguments, assuming last arg is a callback
   * wrap final callback with our own
   * which writes results to cache
   * @param {String} cachePath
   * @param {Function} fn function to call
   * @param {Array} args arguments for function
   * @param {Function} cb callback to wrap
   */
  function writeToCache(cachePath, fn, args, cb) {
    // replace the original callback with one that writes results to cache
    args.push( function(results) {
      fs.writeFile(cachePath, JSON.stringify(results), function(err) {
        if (err) {
          console.log("error writing cachefile to " + cachePath);
        }
        cb(results);
      });
    });
    fn.apply(null, args);
  }

  /**
   * Given a function whose last argument is a callback,
   * return a version that uses an on-disk JSON cache in cacheDir
   * for the function, and then calls the
   * callback with the results
   *
   * n.b. functions that take functions as arguments, or rely
   * on "this" context, won't work properly
   * @param {Function}
   * @return {Function}
   */
   return function(fn) {
     var fnStr = fn.toString();
     return function() {
       var args = Array.prototype.slice.call(arguments);
       var cb = args.pop();
       var cachePath = path.join(cacheDir, md5(fnStr + JSON.stringify(args)));
       fs.stat(cachePath, function(err, stats) {
         if (err === null && typeof stats !== 'undefined') {
           readFromCache(cachePath, cb);
         } else {
           writeToCache(cachePath, fn, args, cb);
         }
       });
     };
   };
}

exports.init = init;

