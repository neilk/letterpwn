var lpMoves = require('../lib/letterpress-moves');

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
});

process.on('terminate', function(message, callback) {
    console.log("Worker: %s Loaded", process.id, ++loaded);
});

