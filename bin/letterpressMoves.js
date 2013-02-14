var lp = require('../lib/letterpress.js'),
    worker = require('worker-pool/lib/worker').worker;

process.on('config', function(message, callback) {
    console.log('Worker: Configured %s!', process.id);
    callback();
});

process.on('message', function(message, callback) {
  var movesObj = lp.getMovesForBoardInGameState(
    message.board,
    message.minFrequency,
    message.oursBitMask,
    message.theirsBitMask
  );

  var moves = movesObj[0];
  var movesLength = movesObj[1];
  var dictionaryLength = movesObj[2];
  var wordsLength = movesObj[3];

  // removing data to only show bitmask and string representation of word.
  var topMoves = moves
        .slice(0, 19)
        .map(function(move) {
          // send ["word", wordBitMask, newOursBitMask, newTheirsBitMask, gameEnder ]
          return [move[6][0], move[5], move[3], move[4], move[2]];
        });

  callback({
    dictionaryLength: dictionaryLength,
    wordsLength: wordsLength,
    movesLength: movesLength,
    topMoves: topMoves
  });
});

process.on('terminate', function(message, callback) {
    console.log("Worker: %s Loaded", process.id, ++loaded);
});

