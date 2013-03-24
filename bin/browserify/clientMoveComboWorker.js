// this exists only so it can be browserified for use on the client, thus it
// uses the Web Worker standard as you might in a browser

var lpMoves = require('../../lib/letterpress-moves');

onmessage = function(oEvent) {
  var message = oEvent.data;

  var moves = lpMoves.getMovesForBoard(message.board, message.wordStructs);
  var topMoves = lpMoves.getTopMoves(moves, message.oursBitMask, message.theirsBitMask);

  postMessage({
    topMoves: topMoves,
    movesLength: moves.length
  });
};
