// this is very similar to clientMoveComboWorker but alas just different
// enough to be kept separate. Make sure to update the other if this changes

var lpMoves = require('../lib/letterpress-moves');

getMoves = function(message) {
  var moves = lpMoves.getMovesForBoard(message.board, message.wordStructs);
  var topMoves = lpMoves.getTopMoves(moves, message.oursBitMask, message.theirsBitMask);

  return (JSON.stringify({
    topMoves: topMoves,
    movesLength: moves.length
  }));
};

