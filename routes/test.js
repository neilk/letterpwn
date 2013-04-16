var numThreads = 10;
var threadPool= require('threads_a_gogo').createPool(numThreads);
threadPool.load('/Users/neilk/cloud/Dropbox/projects/letterpress-cheat/bin/testWorker.js');

exports.test = function(req, res, next) {
  var label = req.param('label');
  var n = parseInt(req.param('n'));
  threadPool.any.eval('fibo(' + n + ')', function(err, data) {
    res.end(label + " -> " + data + "\n");
  });
};


