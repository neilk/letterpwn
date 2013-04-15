var Worker = require('webworker-threads').Worker;

var worker = new Worker('bin/testWorker.js');
var workerSend;

(function() {
  var idCounter = 0;
  var callbacks = {};
  worker.onmessage = function(oEvent) {
    console.log("received message");
    console.log(JSON.stringify(oEvent));
    var message = oEvent.data;
    var _id = message._id;
    delete message._id;
    callbacks[_id](message);
    delete callbacks[_id];
  };
  workerSend = function(message, callback) {
    message._id = idCounter++;
    console.log("setting callback with id = " + message._id);
    callbacks[message._id] = callback;
    worker.postMessage(message);
  };
})();

exports.test = function(req, res, next) {
  var label = req.param('label');
  var n = parseInt(req.param('n'));
  workerSend({ n: n }, function(message) {
    console.log("received!");
    var fibo = message.fibo;
    res.send(label + " -> " + fibo + "\n");
  });
};


