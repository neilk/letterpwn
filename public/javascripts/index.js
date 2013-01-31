(function($){
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

  function updateWords() {
    var board = letterInputsToString();
    if (board.length === 25) {
      $('input').blur();
      var minFrequency = $('#getBoard input[name=minFrequency]').get(0).value;
      getMovesForBoard(board, minFrequency, oursBitMask, theirsBitMask);
    } else {
      displayWords([]);
    }
  }

  function displayWords(data) {
    $('#getBoard td').removeClass('ours protected');
    colorBoard(oursBitMask, theirsBitMask);
    var $words = $('<span>');
    if (data.length) {
      for (var i = 0; i < data.length; i++) {
        var bitMask = data[i][0];
        var word = data[i][1];
        $word = $('<span>')
          .addClass('word')
          .append(word)
          .data('bitMask', bitMask)
          .hover(
            function(){
              colorBoard(oursBitMask | $(this).data('bitMask'), theirsBitMask);
            },
            function(){
              colorBoard(oursBitMask, theirsBitMask);
            }
          );
        $words.append($word);
        if (i < data.length - 1) {
          $words.append(' ');
        }
      }
    } else {
      $words.append('(none)');
    }
    // var $words = $('<ul>');
    // data.map( function(item){ $words.append($('<li>').append(item)) } );
    $('#words').html($words);
  }

  function colorBoard(oursBitMask, theirsBitMask) {
    function colorMask(mask, klass) {
      console.log(mask, klass);
      var bit = 1;
      for(var i = 0; i <= 24; i++) {
        var $el = $('#tdb' + i);
        if (mask & bit) {
          $el.addClass(klass);
          console.log(klass, "for", $el.get(0).id)
        } else {
          $el.removeClass(klass);
        }
        bit <<= 1;
      }
    }
    function colorPlayer(mask, klass) {
      colorMask(mask, klass);
      colorMask(lpBitMask.getProtectedBitMask(mask), klass + 'Protected');
    }
    colorPlayer(oursBitMask, 'ours');
    colorPlayer(theirsBitMask, 'theirs');
  }

  function getMovesForBoard(board, minFrequency, oursBitMask, theirsBitMask) {
    var ajaxRequest = {
      data: {
        board: board,
        minFrequency: minFrequency,
        oursBitMask: oursBitMask,
        theirsBitMask: theirsBitMask
      },
      error: function(xhr, status, err) {
        console.log(xhr, status, err);
      },
      success: function(data, textStatus, xhr) {
        displayWords(data);
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
    colorBoard(0, 0); // why should we have to do this here? updateWords does it, but it happens slowly

    $('input.letter').each(function() {
      // ascii 'a' = 65
      this.value = String.fromCharCode(Math.floor(Math.random()*26+65));
    });
    updateWords();
  })


  $('#paintControls #paintOff').click(function(e) {
    initLettersForTyping();
  });

  var oursBitMask = 0;
  var theirsBitMask = 0;
  $('#paintControls .ours').click(function(e) {
    $('input.letter').click( function() {
      // remove this position from 'theirs'
      theirsBitMask &= ~ $(this).data('bitmask');
      // toggle it in 'ours'
      oursBitMask ^= $(this).data('bitmask');
      colorBoard(oursBitMask, theirsBitMask);
      updateWords();
    });
  });
  $('#paintControls .theirs').click(function(e) {
    $('input.letter').click( function() {
      // remove this position from 'ours'
      oursBitMask &= ~ $(this).data('bitmask');
      // toggle it in theirs
      theirsBitMask ^= $(this).data('bitmask');
      colorBoard(oursBitMask, theirsBitMask);
      updateWords();
    });
  });


  initLettersForTyping();
  $('#getBoard input.letter').keyup(updateWords);
  $('#getBoard input[name=minFrequency]').keyup(updateWords);
  displayWords([]);

  $('#b0').click();

})(jQuery);
