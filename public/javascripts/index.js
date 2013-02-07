(function($){
  var UPDATE_WAIT_MS = 500;

  var letterInputsSelector = 'input.letter';

  function initLettersForTyping() {
    $(letterInputsSelector)
      .removeAttr('disabled')
      .click( function() { $(this).select(); } )
  }

  $(letterInputsSelector)
    .keyup( function(event) {
      // this form has tabIndexes 1-25 for the inputs. Submit button is 26.
      if (event.which !== 9) {
        var nextTabIndex = (parseInt(this.tabIndex, 10) + 1).toString()
        $(this.form).find('[tabIndex=' + nextTabIndex.toString() + ']').focus().select();
      }
    })
    // we assume the name of the input is 'b12' for the 13th square
    .each( function() {
      var pos = parseInt(this.name.substr(1), 10);
      $(this).data('pos', pos);
      $(this).data('bitmask', 1 << pos);
    } );

  function letterInputsToString() {
    var board = $(letterInputsSelector).get().reduce(function(r,el){ return r + el.value; }, '');
    return board.toLowerCase().replace(/[^a-z]/, '');
  }

  function updateMoves() {
    if (letterInputsToString().length === 25) {
      queueUpdate();
    } else {
      displayMoves([]);
    }
  }

  var queuedUpdate = null;

  function queueUpdate() {
    hideMoves();
    clearTimeout(queuedUpdate);
    queuedUpdate = setTimeout(updateNow, UPDATE_WAIT_MS);
  }

  function updateNow() {
    queuedUpdate = null;
    $('input').blur();
    var board = letterInputsToString();
    getMovesForBoard(board, minFrequency, oursBitMask, theirsBitMask);
  }

  function hideMoves() {
    displayMoves([]);
  }

  function displayMoves(moves) {
    colorBoard(oursBitMask, theirsBitMask);
    var $words = $('<span>');
    if (moves.length) {
      for (var i = 0; i < moves.length; i++) {
        // we expect [ "word", moveBitMask, moveOursBitMask, moveTheirsBitmask ]
        var move = moves[i];
        var word = move[0];
        $word = $('<span>')
          .addClass('word')
          .append(word)
          .data('moveWordBitMask', move[1])
          .data('moveOursBitMask', move[2])
          .data('moveTheirsBitMask', move[3])
          .hover(
            function(){
              colorBoard($(this).data('moveOursBitMask'), $(this).data('moveTheirsBitMask'));
              wiggleMask($(this).data('moveWordBitMask'));
            },
            function(){
              colorBoard(oursBitMask, theirsBitMask);
              wiggleMask(0);
            }
          );
        $words.append($word);
        if (i < moves.length - 1) {
          $words.append(' ');
        }
      }
    } else {
      $words.append('(none)');
    }
    // var $words = $('<ul>');
    // moves.map( function(item){ $words.append($('<li>').append(item)) } );
    $('#words').html($words);
  }

  /**
   * Apply jquery transforms to positions matching bitmask & not matching
   * @param {Number} mask
   * @param {Function} onCb for element when matching
   * @param {String} offCb for elements that do not match
   */
  function maskApply(mask, onCb, offCb) {
    var bit = 1;
    var selector = [];
    for(var i = 0; i <= 24; i++) {
      $el = $('#tdb' + i);
      if (mask & bit) {
        onCb($el);
      } else {
        offCb($el);
      }
      bit <<= 1;
    }
  }

  function classMask(mask, klass) {
    maskApply(
      mask,
      function($el) { $el.addClass(klass); },
      function($el) { $el.removeClass(klass); }
    );
  }

  function wiggleMask(mask) {
    maskApply(
      mask,
      function($el) { $el.wiggle('start'); },
      function($el) { $el.wiggle('stop'); }
    )
  }

  function colorBoard(oursBitMask, theirsBitMask) {
        function colorPlayer(mask, klass) {
      classMask(mask, klass);
      classMask(lpBitMask.getProtectedBitMask(mask), klass + 'Protected');
    }
    colorPlayer(oursBitMask, 'ours');
    colorPlayer(theirsBitMask, 'theirs');
  }

  function getMovesForBoard(board, minFrequency, oursBitMask, theirsBitMask) {
    var ajaxRequest = {
      data: {
        seq: ++sequence,
        board: board,
        minFrequency: minFrequency,
        oursBitMask: oursBitMask,
        theirsBitMask: theirsBitMask
      },
      error: function(xhr, status, err) {
        console.log(xhr, status, err);
      },
      success: function(data, textStatus, xhr) {
        var resSequence = parseInt(data[0], 10);
        var moves = data[1];
        if (resSequence === sequence) {
          displayMoves(moves);
        }
      }
    }

    var startTime = new Date();
    $.ajax('/api', ajaxRequest)
      .done(function() {
        $('#timing').html( "Request completed in " + ((new Date() - startTime)/1000).toFixed(3) + " seconds");
      });
  }

  $('#randomize').click(function(e) {
    oursBitMask = 0;
    theirsBitMask = 0;
    queuedUpdate = null;
    sequence = 0;

    colorBoard(0, 0); // why should we have to do this here? updateMoves does it, but it happens slowly

    $('input.letter').each(function() {
      // ascii 'a' = 65
      this.value = String.fromCharCode(Math.floor(Math.random()*26+65));
    });
    updateNow();
  })


  $('#paintControls #paintOff').click(function(e) {
    initLettersForTyping();
  });

  $('#paintControls .ours').click(function(e) {
    $('input.letter').click( function() {
      // remove this position from 'theirs'
      theirsBitMask &= ~ $(this).data('bitmask');
      // toggle it in 'ours'
      oursBitMask ^= $(this).data('bitmask');
      colorBoard(oursBitMask, theirsBitMask);
      updateMoves();
    });
  });
  $('#paintControls .theirs').click(function(e) {
    $('input.letter').click( function() {
      // remove this position from 'ours'
      oursBitMask &= ~ $(this).data('bitmask');
      // toggle it in theirs
      theirsBitMask ^= $(this).data('bitmask');
      colorBoard(oursBitMask, theirsBitMask);
      updateMoves();
    });
  });


  // init board
  var oursBitMask = 0,
      theirsBitMask = 0,
      sequence = 0;
  initLettersForTyping();
  $('#getBoard input.letter').keyup(updateMoves);

  // TODO i18n
  var frequencyNames = [
    /* 0 */ 'sesquipedalian',
    /* 1 */ 'crazy obscure',
    /* 2 */ 'really obscure',
    /* 3 */ 'obscure',
    /* 4 */ 'grad school',
    /* 5 */ 'grad school',
    /* 6 */ 'university',
    /* 7 */ 'university',
    /* 8 */ 'high school',
    /* 9 */ 'high school (debate club)',
    /* 10 */ 'high school (drama club)',,
    /* 11 */  'high school',
    /* 12 */ 'high school',
    /* 13 */ 'grade school (chess club)',
    /* 14 */ 'grade school (chess club)',
    /* 15 */ 'grade school (chess club)',
    /* 16 */ 'grade school',
    /* 17 */ 'grade school',
    /* 18 */ 'grade school',
    /* 19 */ 'kindergarten',
  ];

  // init frequency slider
  // this REALLY needs to transition to a model which gets updated
  var minFrequency = 12;
  $('#frequencyName').html(frequencyNames[minFrequency]);

  $('#frequencyCtrl').slider({
    min: 0,
    max: 19,
    value: 19 - minFrequency,
    slide: function(event,ui) {
      minFrequency = 19 - ui.value;
      $('#frequencyName').html(frequencyNames[minFrequency]);
    },
    stop: function(event, ui) {
      updateMoves();
    },
  });

  displayMoves([]);

  $('#b0').click();

})(jQuery);
