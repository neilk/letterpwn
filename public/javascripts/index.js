(function($){

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
    $('#moves').addClass('fade').scrollTop();
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
    $('#results').hide("slide", { direction: "left" }, SLIDE_DELAY_MS);
  }

  function displayMoves(moves) {
    $('#results').show("slide", { direction: "left"}, SLIDE_DELAY_MS);
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
    if (xhr) {
      xhr.abort();
    }
    xhr = $.ajax('/api', ajaxRequest)
      .done(function(data) {
        xhr = null;
        var serverStats = data[2];
        var serverDictionaryLength = commify(serverStats[0]);
        var serverMoves = commify(serverStats[1]);
        var serverElapsedTime = (serverStats[2]/1000).toFixed(3);
        var clientElapsedTime = ((Date.now() - startTime)/1000).toFixed(3);
        $('#timing').html( serverDictionaryLength + " words searched, " + serverMoves
                           + " possible moves ranked in " + serverElapsedTime + " seconds."
                           + " Round trip in " + clientElapsedTime + " seconds");
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
  $('#oursPaint').parent().click(function(e) {
    $('input.letter')
      .attr('readonly', 'readonly')
      .off('click')
      .on('click', function(e) {
        var bitMask = $(this).data('bitmask');
        // remove this position from 'theirs'
        theirsBitMask &= ~bitMask;
        // toggle it in 'ours'
        oursBitMask |= bitMask;
        updateMoves();
      });
  });
  $('#theirsPaint').parent().click(function(e) {
    $('input.letter')
      .attr('readonly', 'readonly')
      .off('click')
      .on('click', function(e) {
        var bitMask = $(this).data('bitmask');
        // remove this position from 'ours'
        oursBitMask &= ~bitMask;
        // toggle it in theirs
        theirsBitMask |= bitMask;
        updateMoves();
      });
  });
  $('#paintOff').click(function(e) {
    $('input.letter')
      .attr('readonly', 'readonly')
      .off('click')
      .on('click', function(e) {
        var bitMask = $(this).data('bitmask');
        oursBitMask &= ~bitMask;
        theirsBitMask &= ~bitMask;
        updateMoves();
      });
  });

  function updateSlider(event, ui) {
    minFrequency = frequencyNames[ui.value].minFrequency;
    $('#frequencyLabel').html(frequencyNames[ui.value].label);
  }

  /* configuration */

  // TODO i18n
  var frequencyNames = [
    { minFrequency:19, label:'see spot run'},
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

  /* initialize board & other inputs */

  var oursBitMask = 0,
      theirsBitMask = 0,
      sequence = 0,
      initialFrequencySliderValue = 1,
      queuedUpdate = null,
      lastUpdate = null,
      $mainBoard = $('#getBoard'),
      xhr = null;

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
