var lpMoves = require('../lib/letterpress-moves');

// to avoid memory leaks, exit after a certain number of calls
// it is partially random so that all children don't do this at once
// this requires 'auto-restart' to be true in backgrounder's initialization
var minCalls = 20, maxCalls = 40;
var callsRemaining = Math.random() * (maxCalls - minCalls) + minCalls;

process.on('config', function(message, callback) {
  console.log('Worker: Configured combo worker %s!', process.id);
  callback();
});

process.on('message', function(message, callback) {
  var moves = lpMoves.getMovesForBoard(message.board, message.wordStructs);
  var topMoves = lpMoves.getTopMoves(moves, message.oursBitMask, message.theirsBitMask);

  callback({
    topMoves: topMoves,
    movesLength: moves.length
  });

  if (--callsRemaining <= 0) {
    process.exit(0);
  }
});

// this doesn't seem to get called?
process.on('terminate', function(message, callback) {
  console.log("Worker: %s terminating", process.pid);
});

