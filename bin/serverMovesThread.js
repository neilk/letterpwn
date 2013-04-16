//var lpMoves = require('../lib/letterpress-moves');
//var lpMoves = require('/Users/neilk/cloud/Dropbox/projects/letterpress-cheat/lib/letterpress-moves');
var fs = require('fs');
function getMoves(message) {
  var moves = lpMoves.getMovesForBoard(message.board, message.wordStructs);
  var topMoves = lpMoves.getTopMoves(moves, message.oursBitMask, message.theirsBitMask);

  return (JSON.stringify({
    topMoves: topMoves,
    movesLength: moves.length
  }));
};

