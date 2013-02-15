(function($){
  var MAX_FREQUENCY = 24;
  var DEFAULT_FREQUENCY = 15;

  var BOARD_SIZE = 25;
  var POSITIONS_TO_WIN = 13;

  // this is all bits turned on in BOARD_SIZE
  var MAX_BITMASK = 33554431;

  function letterInputsToString() {
    var board = $('input.letter').get().reduce(function(r,el){ return r + el.value; }, '');
    return board.toLowerCase().replace(/[^a-z]/, '');
  }

  function updateMoves() {
    colorBoard($mainBoard, oursBitMask, theirsBitMask);

    // did somebody win? show that
    if (lpBitMask.countBits(oursBitMask | theirsBitMask) == 25) {
      displayGameEnd(lpBitMask.countBits(oursBitMask) >= 13);

    // ok do we even have enough letters to get new words?
    } else if (letterInputsToString().length === 25) {
      queueUpdate();

    // just show nothing
    } else {
      hideMoves();
    }
  }


  function queueUpdate() {
    $('#results').show("slide", { direction: "left"}, SLIDE_DELAY_MS);
    $('#moves').addClass('fade').scrollTop(0);
    clearTimeout(queuedUpdate);
    if (lastUpdate === null || lastUpdate < Date.now() - UPDATE_WAIT_MS) {
      updateNow();
    } else {
      queuedUpdate = setTimeout(updateNow, UPDATE_WAIT_MS);
    }
  }

  function updateNow() {
    lastUpdate = Date.now();
    queuedUpdate = null;
    var board = letterInputsToString();
    updateMovesForBoard(board, minFrequency, oursBitMask, theirsBitMask);
  }

  function hideMoves() {
    $('#results').hide("slide", { direction: "left" }, SLIDE_DELAY_MS);
  }

  function displayMoves(moves) {
    $('#loading').hide();
    $('#moves').removeClass('fade').scrollTop();
    $('#moves').scrollTop();
    var $moves = $('<div>')
    if (moves.length) {
      for (var i = 0; i < moves.length; i++) {
        // we expect [ "word", moveBitMask, moveOursBitMask, moveTheirsBitmask, gameEnder ]
        var move = moves[i];
        var word = move[0];
        var gameEnder = move[4]
        // see definition of gameEnderTag for why we add 1
        var $gameEnder = gameEnder === 0 ? '' : gameEnderTag[gameEnder + 1].clone();
        $moves.append(
          $('<div>').addClass('move').append(
            $('<table>').append(
              $('<tr>').addClass('moveRow').append(
                $('<td>').append(getPreviewBoard(move[2], move[3])),
                $('<td>').append(word, $gameEnder)
              )
            )
          )
          .data('moveWordBitMask', move[1])
          .data('moveOursBitMask', move[2])
          .data('moveTheirsBitMask', move[3])
          .hover(
            function(){
              colorBoard($mainBoard, $(this).data('moveOursBitMask'), $(this).data('moveTheirsBitMask'));
              wiggleMask($(this).data('moveWordBitMask'));
            },
            function(){
              colorBoard($mainBoard, oursBitMask, theirsBitMask);
              wiggleMask(0);
            }
          )
        );
      }
    } else {
      $moves.append($('<p>').addClass('gameAnnounce').append(msg.noMoves));
    }
    $('#moves').html($moves);
  }

  function displayGameEnd(win) {
    var message = msg.win,
        klass = 'ourScore';
    if (!win) {
      message = msg.lose,
      klass = 'theirScore';
    }
    $('#moves').html($('<p>').addClass(klass + ' gameAnnounce').append(message));
  }

  /**
   * Apply jquery transforms to positions matching bitmask & not matching
   * @param {Number} mask
   * @param {Function} onCb for element when matching
   * @param {String} offCb for elements that do not match
   */
  function maskApply($parent, mask, onCb, offCb) {
    var bit = 1;
    var selector = [];
    for(var i = 0; i <= 24; i++) {
      $el = $parent.find('.tdb' + i);
      if (mask & bit) {
        onCb($el);
      } else {
        offCb($el);
      }
      bit <<= 1;
    }
  }

  function classMask($parent, mask, klass) {
    maskApply(
      $parent,
      mask,
      function($el) { $el.addClass(klass); },
      function($el) { $el.removeClass(klass); }
    );
  }

  function wiggleMask(mask) {
    maskApply(
      $mainBoard,
      mask,
      function($el) {
        // we activate relative positioning so the shadows are over other non-wiggly cells
        $('#getBoard td').css({position: 'relative'});
        $el.addClass('shadow').wiggle('start');
      },
      function($el) {
        // take away all of style because *any* position seems to cause the highlighting of the input
        // to overlap with neighbors. Strange.
        $('#getBoard td').removeAttr('style');
        $el.removeClass('shadow').wiggle('stop');
      }
    )
  }

  function colorBoard($parent, oursBitMask, theirsBitMask) {
    function colorPlayer($parent, mask, klass) {
      classMask($parent, mask, klass);
      classMask($parent, lpBitMask.getProtectedBitMask(mask), klass + 'Protected');
    }
    colorPlayer($parent, oursBitMask, 'ours');
    colorPlayer($parent, theirsBitMask, 'theirs');
  }

  function updateMovesForBoard(board, minFrequency, oursBitMask, theirsBitMask) {
    var newBoardState = [board, oursBitMask, theirsBitMask].join('\x01');
    if (newBoardState !== boardState) {
      processedCache = {};
    }
    boardState = newBoardState;
    if (processedCache[minFrequency]) {
      $('#actualApiRequestStats').hide();
      displayProcessedResult(processedCache[minFrequency]);
      return;
    }
    var ajaxRequest = {
      data: {
        seq: ++sequence,
        board: board,
        minFrequency: minFrequency
      },
      error: function(xhr, status, err) {
        console.log(xhr, status, err);
      },
      success: function(data, textStatus, xhr) {
        var resSequence = parseInt(data[0], 10);
        if (resSequence === sequence) {
          var processed = processApiResult(board, data);
          processedCache[minFrequency] = processed;
          displayProcessedResult(processed);
        }
      }
    }

    var startTime = new Date();
    var showSpinnerTimeout;
    if (xhr) {
      // don't send out two XHRs at once - abort the other one
      // we could still have a race condition, which we try to ameliorate with
      // the sequence number
      xhr.abort();
    }
    showSpinnerTimeout = setTimeout( function() { $('#loading').show(); }, LOADING_SPINNER_DELAY_MS );
    xhr = $.ajax('/api', ajaxRequest)
      .done(function(data) {
        // we won't need to abort this xhr, 'cause we're done.
        // is there a race condition here if someone else grabbed xhr?
        xhr = null;

        clearTimeout(showSpinnerTimeout);
        $('#loading').hide();
        // show some stats related to actual API calls
        // (not always shown if results were cached locally)
        $('#clientElapsedTime').html(((Date.now() - startTime)/1000).toFixed(3));
        $('#actualApiRequestStats').show();
      });
  }

  function processApiResult(board, data) {
    var wordStructs = data[1];
    var dictionaryLength = data[2];
    var serverTime = data[3];
    var moves = getMovesForBoard(board, wordStructs);
    var topMoves = getTopMoves(moves, oursBitMask, theirsBitMask);
    return [
      topMoves,
      [
        dictionaryLength,
        wordStructs.length,
        moves.length,
        serverTime
      ]
    ];
  }
  /**
   * We expect the api result to be:
   * data[0]  sequence number (ignored here)
   * data[1]  array of moves
   * data[2]  stats
   * @param {Array} data described above
   */
  function displayProcessedResult(data) {
    displayMoves(data[0]);
    displayStats(data[1]);
  }

  /**
   * display stats
   * @param stats [dictionaryCount, wordsCount, movesCount, serverElapsedTime]
   */
  function displayStats(stats) {
    $('#statsDictionaryCount').html(commify(stats[0]));
    $('#statsWordsCount').html(commify(stats[1]));
    $('#statsMoveCount').html(commify(stats[2]));
    $('#statsServerElapsedTime').html((stats[3]/1000).toFixed(3));
  }

  function getPreviewBoard(oursBitMask, theirsBitMask) {
    var $table = $('<table>').addClass('preview');
    for (var i = 0; i < 5; i++) {
      var $tr = $('<tr>');
      for (var j = 0; j < 5; j++) {
        var $td = $('<td>').addClass('tdb' + (i * 5 + j));
        $tr.append($td);
      }
      $table.append($tr);
    }
    colorBoard($table, oursBitMask, theirsBitMask);
    return $table;
  }

  function commify(n) {
    n = n.toString();
    var x = n.split("");
    for (var i = n.length - 3; i > 0; i-= 3) {
      x.splice(i, 0, ",");
    }
    return x.join("");
  }

  $('#randomize').click(function(e) {
    oursBitMask = 0;
    theirsBitMask = 0;
    queuedUpdate = null;
    sequence = 0;
    colorBoard($mainBoard, 0, 0); // why should we have to do this here? updateWords does it, but it happens slowly
    lastUpdate = null;

    $('input.letter').each(function() {
      // ascii 'a' = 65
      this.value = String.fromCharCode(Math.floor(Math.random()*26+65));
    });
    queueUpdate();
  })

  $('#paintControls .icon').parent().click(function(e) {
    $('#paintControls .iconHighlight').removeClass('active');
    $(this).addClass('active');
  });

  $('#enterText').parent().click(function(e) {
    $('input.letter')
      .keyup(function(event) {
        // this form has tabIndexes 1-25 for the inputs. Submit button is 26.
        if (event.which !== 9) {
          var nextTabIndex = (parseInt(this.tabIndex, 10) + 1).toString()
          $(this.form).find('[tabIndex=' + nextTabIndex.toString() + ']').focus().select();
        }
        updateMoves();
      })
      .removeAttr('readonly')
      .off('click')
      .on('click', function() {
        $(this).select();
      } );
  });

  // this is used for the three coloring tools - ours, theirs, none
  function getLetterPainterMode(bitMaskOp) {
    return function() {
      $('input.letter')
        .attr('readonly', 'readonly')
        .off('click')
        .on('click', function(e) {
          bitMaskOp($(this).data('bitmask'));
          updateMoves();
        });
    }
  };

  $('#oursPaint').parent().click(
    getLetterPainterMode(
      function(bitMask) {
        // remove this position from 'theirs'
        theirsBitMask &= ~bitMask;
        // toggle it in 'ours'
        oursBitMask |= bitMask;
      }
    )
  );

  $('#theirsPaint').parent().click(
    getLetterPainterMode(
      function(bitMask) {
        // remove this position from 'ours'
        oursBitMask &= ~bitMask;
        // toggle it in theirs
        theirsBitMask |= bitMask;
      }
    )
  );

  $('#nonePaint').parent().click(
    getLetterPainterMode(
      function(bitMask) {
        oursBitMask &= ~bitMask;
        theirsBitMask &= ~bitMask;
      }
    )
  );


  function updateSlider(event, ui) {
    minFrequency = frequencyNames[ui.value].minFrequency;
    $('#frequencyLabel').html(frequencyNames[ui.value].label);
  }

  /**
   * Given a sorted list of board positions like
   *   [ 10, 11, 15 ]
   * Produce a number, whose on bits in binary correspond to these positions
   * @param {Array} positions simple array of positive integers <= 24
   * @return {Number}
   */
  function getBitMaskForPositions(positions) {
    return positions.reduce(function(bitMask, p) { return bitMask |= (1 << p) }, 0);
  }


  /**
   * Given a string representing a board, return a map of
   * where each letter is used on the board
   * TODO could return the bitmap position, to save some time
   * e.g. given "aba", return { "a": [0, 2], "b": [1] }
   * @param {String} board
   * @return {Array} as described above
   */
  function getBoardPositionMap(board) {
    var boardMap = {};
    for (var i = 0; i < board.length; i += 1) {
      var c = board[i];
      if (!(c in boardMap)) {
        boardMap[c] = [];
      }
      boardMap[c].push(i);
    }
    return boardMap;
  }

  function getMovesForBoard(board, wordStructs) {
    // an index of where letters are, on the board
    var boardPositionMap = getBoardPositionMap(board);
    var moves = [];

    wordStructs.forEach(function(wordStruct) {

      // make a histogram of the letters in the word
      // n.b. it seems like this could be precalculated, but that is slower & uses more memory
      // at this point we are probably dealing with only a few hundred words anyway
      var letters = wordStruct[1];
      var letterCounts = {};
      for(var i = 0; i < letters.length; i++) {
        var c = letters[i];
        if (!(c in letterCounts)) {
          letterCounts[c] = 0;
        }
        letterCounts[c]++;
      }

      var posCombos = [];
      for (c in letterCounts) {
        // in all the positions where c is on the board, create as many combos as we need for this word,
        // and add that to posCombos
        // e.g. if we want two "a", and "a" appears four times on the board, we'll get six combos of the four positions
        posCombos.push(kCombinations(boardPositionMap[c], letterCounts[c]));
      }

      // flatten combos out into possible board positions for this word
      var flatCombos = flattenCombos(posCombos);

      flatCombos.forEach(function(positions) {
        moves.push([wordStruct, getBitMaskForPositions(positions)]);
      });

    });

    return moves;

  }


  /**
   * Given the possible combinations of board positions, produce a flattened list.
   * i.e. if the board is "abcb" and the word is "cab", the position combos should be:
   *    [ [ 2 ], [ 0 ], [ 1, 3 ] ]
   * and the flattened combos should be:
   *    [ [ 0, 1, 2 ], [ 0, 2, 3 ] ]
   * @param {Array} posCombos as described above
   * @return {Array} flattened combinations as described above
   */
  function flattenCombos(posCombos) {
    var results = [];
    function pc(i, curr) {
      var opts = posCombos[i];
      for (var j = 0; j < opts.length; j++) {
        var myCurr = Array.prototype.slice.call(curr);
        myCurr = myCurr.concat(opts[j]);
        if (i + 1 == posCombos.length) {
          results.push(myCurr.sort());
        } else {
          pc(i + 1, myCurr);
        }
      }
    }
    if (posCombos.length > 0) {
      pc(0, []);
    }
    return results;
  }


  /**
   * Given a set of items, obtain all combinations of a certain length
   * @param {Array} set
   * @param {Number} count
   */
  function kCombinations(set, count) {
    var results = [];
    function kc(count, start, curr) {
      for (var i = start; i < set.length; i++) {
        var myCurr = Array.prototype.slice.call(curr);
        myCurr.push(set[i]);
        if (count === 1) {
          results.push(myCurr.sort());
        } else {
          kc(count - 1, i + 1, myCurr)
        }
      }
    }
    if (count !== 0) {
      kc(count, 0, []);
    }
    return results;
  }

  function getTopMoves(moves, oursBitMask, theirsBitMask) {

    // add other bitmask metrics to help sort best move
    var oursProtectedBitMask = lpBitMask.getProtectedBitMask(oursBitMask)
    var theirsProtectedBitMask = lpBitMask.getProtectedBitMask(theirsBitMask);

    // let's now add some information to a new array, for each move we rate how good it is
    // given current game state
    var movesScoredForGameState = moves.map(function(move) {
      var wordStruct = move[0];
      var wordBitMask = move[1];
      var newOursBitMask = (wordBitMask & ~theirsProtectedBitMask) | oursBitMask;
      var newOursProtectedBitMask = lpBitMask.getProtectedBitMask(newOursBitMask);
      var newTheirsBitMask = theirsBitMask & ~newOursBitMask;
      var newTheirsProtectedBitMask = lpBitMask.getProtectedBitMask(newTheirsBitMask);
      var newOursCount = lpBitMask.countBits(newOursBitMask);
      var newTheirsCount = lpBitMask.countBits(newTheirsBitMask);
      var newOursProtectedCount = lpBitMask.countBits(newOursProtectedBitMask);
      var newTheirsProtectedCount = lpBitMask.countBits(newTheirsProtectedBitMask);
      var vulnerability = getVulnerability(newOursProtectedBitMask);

      var gameEnder = 0;
      if ((newOursBitMask | newTheirsBitMask) === MAX_BITMASK) {
        gameEnder = (newOursCount >= POSITIONS_TO_WIN) ? 1 : -1;
      }

      // and let's add this to the moves!
      return([
        newOursProtectedCount - newTheirsProtectedCount,
        newOursCount - newTheirsCount,
        gameEnder,
        newOursBitMask,
        newTheirsBitMask,
        wordBitMask,
        wordStruct,
        vulnerability
      ]);
    });

    return filterMoves(movesScoredForGameState.sort(byBestMove))
            .slice(0, 19)
            .map(function(move) {
              // send ["word", wordBitMask, newOursBitMask, newTheirsBitMask, gameEnder ]
              return [move[6][0], move[5], move[3], move[4], move[2]];
            });

  }

  /**
   * Comparator for moves
   * Note we sort by frequency ascending; if two words are similar, most common one
   * should be first. (i.e. "forward" sorts before "froward")
   * @param {Array} a move
   * @param {Array} b move
   * @return {Number}
   */
  function byBestMove(a, b) {
    return (  // if we don't open with a paren, JS just returns nothing. sigh.
      (b[2] - a[2]) // sort winning moves first
      || (b[0] - a[0]) // more protected positions
      || (a[7] - b[7]) // least vulnerable positions
      || (b[1] - a[1]) // more positions
      || (a[6][2] - b[6][2]) // more common words first
    );
  }



  function filterMoves(moves) {

    // we use this in the filter, to only show new words with different scores.
    var latestScore = 0;
    var seen = {};

    return moves
      .filter(function(move){
        if (seen[move[6][0]] || (move[0] + move[1] === latestScore)) {
          return false;
        }
        latestScore = move[0] + move[1];
        seen[move[6][0]] = 1;
        return true;
      });

  }


  /**
   * Given a bitmask, decide how vulnerable it is to opponent
   * The most defensible positions are compact, with no "holes" for opponent to place a
   * square and build within our defended area. A square that can affect multiple squares of
   * our is particularly bad. So we sum up all adjacent squares for each
   * square (that we don't already have).
   * @param {Number} bitMask
   * @return {Number}
   */
  function getVulnerability(bitMask) {
    var vulnerability = 0;
    lpBitMask.adjacent.forEach(function(a) {
      if (a[0] & bitMask) {
        vulnerability += lpBitMask.countBits(a[1] & ~bitMask);
      }
    });
    return vulnerability;
  }



  /* configuration */

  // TODO i18n
  var frequencyNames = [
    { minFrequency:18, label:'basic'},
    { minFrequency:15, label:'common' },
    { minFrequency:12, label:'highbrow'},
    { minFrequency:9, label:'obscure'},
    { minFrequency:0, label:'sesquipedalian'}
  ];

  var msg = {
    win: 'win',
    lose: 'lose',
    noMoves: 'no moves found'
  }

  /* constants */
  var SLIDE_DELAY_MS = 200;
  var UPDATE_WAIT_MS = 500;
  var LOADING_SPINNER_DELAY_MS = 1000;

  /* initialize board & other inputs */

  var oursBitMask = 0,
      theirsBitMask = 0,
      sequence = 0,
      initialFrequencySliderValue = 1,
      queuedUpdate = null,
      lastUpdate = null,
      $mainBoard = $('#getBoard'),
      xhr = null,
      processedCache = {},
      boardState = null;

  /* n.b. data comes to us as -1, 0, 1 so add 1 to get offset */
  var gameEnderTag = [
    $('<span>').addClass('gameAnnounce theirScore').append(msg.lose),
    null,
    $('<span>').addClass('gameAnnounce ourScore').append(msg.win)
  ];

  // set up initial toolbar highlights, active tool
  $('#enterText').parent().click();

  /* init frequency slider */

  $('#frequencyCtrl').slider({
    min: 0,
    max: frequencyNames.length - 1,
    change: function(event, ui) {
      updateSlider(event, ui);
    },
    slide: function(event,ui) {
      updateSlider(event, ui);
    },
    stop: function(event, ui) {
      updateMoves();
    },
  });

  $('#frequencyCtrl').slider( "value", initialFrequencySliderValue);

  /* init show / hide stats */
  $('#hideStats').click(function() {
    $('#stats').hide();
    $('#showStats').show();
  });
  $('#showStats a').click(function() {
    $('#stats').show();
    $('#showStats').hide();
  })

  /* init letters */

  $('input.letter')
   .each(function() {
      // we assume the name of the input is like 'b12' for the 13th position
      var pos = parseInt(this.name.substr(1), 10);
      $(this).data('pos', pos);
      $(this).data('bitmask', 1 << pos);
    })
    .click(function() {
    })


  // start off typing in the first position
  $('#b0').click();



})(jQuery);
