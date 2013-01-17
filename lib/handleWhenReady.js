/**
 * Use this module if it takes some amount of time to initialize the handler for
 * a particular route, e.g.
 *  var handleWhenReady = require('handleWhenReady');
 *  var getRealHandler = function(ready) {
 *    // stuff that takes a long time
 *    ready(function(req, res, next) {
 *      ...
 *    });
 *  }
 *  exports.myRoute = handleWhenReady(getRealHandler);
 * @param {Function} getRealHandler
 * @return {Function} route handler which shows "be patient" message until real handler initialized
 */
module.exports = function(getRealHandler) {
  var handler = null;
  getRealHandler(function(realHandler) {
    handler = realHandler;
  });
  return function(req, res, next) {
    if (handler) {
      handler(req, res, next);
    } else {
      res.writeHead(500, {'Content-Type': 'text/plain'});
      res.end("initializing...");
    }
  }
};
