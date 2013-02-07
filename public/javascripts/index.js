(function($){

  function initLettersForTyping() {
    $('input.letter')
      .removeAttr('disabled')
      .click( function() { $(this).select(); } )
  }

  function letterInputsToString() {
    var board = $('input.letter').get().reduce(function(r,el){ return r + el.value; }, '');
    return board.toLowerCase().replace(/[^a-z]/, '');
  }

  function updateMoves() {
    if (letterInputsToString().length === 25) {
      queueUpdate();
    } else {
      displayMoves([]);
    }
  }


  function queueUpdate() {
    hideMoves();
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
    getMovesForBoard(board, minFrequency, oursBitMask, theirsBitMask);
  }

  function hideMoves() {
    displayMoves([]);
  }

  function displayMoves(moves) {
    colorBoard($mainBoard, oursBitMask, theirsBitMask);
    $('#moves').scrollTop();
    var $moves = $('<div>')
    if (moves.length) {
      for (var i = 0; i < moves.length; i++) {
        // we expect [ "word", moveBitMask, moveOursBitMask, moveTheirsBitmask ]
        var move = moves[i];
        var word = move[0];
        $moves.append(
          $('<div>').addClass('move').append(
            $('<table>').append(
              $('<tr>').addClass('moveRow').append(
                $('<td>').append(getPreviewBoard(move[2], move[3])),
                $('<td>').append(word)
              )
            )
          )
          .data('moveWordBitMask', move[1])
          .data('moveOursBitMask', move[2])
          .data('moveTheirsBitMask', move[3])
          .hover(
            function(){
              colorBoard($mainBoard, $(this).data('moveOursBitMask'), $(this).data('moveTheirsBitMask'));
              classMask($mainBoard, $(this).data('moveWordBitMask'), 'previewMove');
              // wiggleMask($(this).data('moveWordBitMask'));
            },
            function(){
              colorBoard($mainBoard, oursBitMask, theirsBitMask);
              classMask($mainBoard, 0, 'previewMove');
              // wiggleMask(0);
            }
          )
        );
      }
    } else {
      $moves.append('(none)');
    }
    $('#moves').html($moves);
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

  function wiggleMask($parent, mask) {
    maskApply(
      $parent,
      mask,
      function($el) { $el.wiggle('start'); },
      function($el) { $el.wiggle('stop'); }
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

  $('#randomize').click(function(e) {
    oursBitMask = 0;
    theirsBitMask = 0;
    queuedUpdate = null;
    sequence = 0;
    colorBoard($mainBoard, 0, 0); // why should we have to do this here? updateWords does it, but it happens slowly

    $('input.letter').each(function() {
      // ascii 'a' = 65
      this.value = String.fromCharCode(Math.floor(Math.random()*26+65));
    });
    updateNow();
  })

  $('#paintControls .ours').click(function(e) {
    letterPaint = function(bitMask) {
      // remove this position from 'theirs'
      theirsBitMask &= ~bitMask;
      // toggle it in 'ours'
      oursBitMask |= bitMask;
    };
  });
  $('#paintControls .theirs').click(function(e) {
    letterPaint = function(bitMask) {
      // remove this position from 'ours'
      oursBitMask &= ~bitMask;
      // toggle it in theirs
      theirsBitMask |= bitMask;
    };
  });
  $('#paintControls #paintOff').click(function(e) {
    // ?? initLettersForTyping();
    letterPaint = function(bitMask) {
      oursBitMask &= ~bitMask;
      theirsBitMask &= ~bitMask;
    };
  });


  function updateSlider(event, ui) {
    minFrequency = frequencyNames[ui.value].minFrequency;
    $('#frequencyLabel').html(frequencyNames[ui.value].label);
  }

  /* configuration */

  // TODO i18n
  var frequencyNames = [
    { minFrequency:19, label:'see spot run'},
    { minFrequency:16, label:'common' },
    { minFrequency:10, label:'highbrow'},
    { minFrequency:5, label:'obscure'},
    { minFrequency:0, label:'sesquipedalian'}
  ];

  /* constants */

  var UPDATE_WAIT_MS = 500;

  /* initialize board & other inputs */

  var oursBitMask = 0,
      theirsBitMask = 0,
      sequence = 0,
      initialFrequencySliderValue = parseInt(frequencyNames.length / 2, 10),
      queuedUpdate = null,
      lastUpdate = null,
      $mainBoard = $('#getBoard'),
      letterPaint = function(){};

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

  /* init letters */

  $('input.letter')
   .each(function() {
      // we assume the name of the input is like 'b12' for the 13th position
      var pos = parseInt(this.name.substr(1), 10);
      $(this).data('pos', pos);
      $(this).data('bitmask', 1 << pos);
    })
    .click(function() {
      letterPaint($(this).data('bitmask'));
      updateMoves();
    })
    .keyup(function(event) {
      // this form has tabIndexes 1-25 for the inputs. Submit button is 26.
      if (event.which !== 9) {
        var nextTabIndex = (parseInt(this.tabIndex, 10) + 1).toString()
        $(this.form).find('[tabIndex=' + nextTabIndex.toString() + ']').focus().select();
      }
      updateMoves();
    });

  initLettersForTyping();

  // no moves yet to display
  displayMoves([]);

  // start off typing in the first position
  $('#b0').click();



})(jQuery);
