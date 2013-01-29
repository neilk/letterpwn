(function($){
  var letterInputsSelector = 'input.letter';

  $(letterInputsSelector)
    .click( function() { $(this).select(); } )
    .keyup( function(event) {
      // this form has tabIndexes 1-25 for the inputs. Submit button is 26.
      if (event.which !== 9) {
        var nextTabIndex = (parseInt(this.tabIndex, 10) + 1).toString()
        $(this.form).find('[tabIndex=' + nextTabIndex.toString() + ']').focus().select();
      }
    });

  function letterInputsToString() {
    var board = $(letterInputsSelector).get().reduce(function(r,el){ return r + el.value; }, '');
    return board.toLowerCase().replace(/[^a-z]/, '');
  }

  function updateWords() {
    var board = letterInputsToString();
    if (board.length === 25) {
      $('input').blur();
      var minFrequency = $('#getBoard input[name=minFrequency]').get(0).value;
      getMovesForBoard(board, minFrequency);
    } else {
      displayWords([]);
    }
  }

  function displayWords(data) {
    $('#getBoard td').removeClass('ours captured');
    var $words = $('<span>');
    if (data.length) {
      for (var i = 0; i < data.length; i++) {
        var bitMask = data[i][0];
        var word = data[i][1];
        var capturedBitMask = data[i][2];
        $word = $('<span>')
          .addClass('word')
          .append(word)
          .hover(
            function(bitMask, capturedBitMask){
              return function() {
                highlightMove(bitMask, capturedBitMask, true);
              }
            }(bitMask, capturedBitMask),
            function(bitMask, capturedBitMask){
              return function() {
                highlightMove(bitMask, capturedBitMask, false);
              }
            }(bitMask, capturedBitMask)
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

  function highlightMove(bitMask, capturedBitMask, on) {
    function highlightMask(mask, klass, on) {
      var bit = 1;
      for(var i = 0; i <= 24; i++) {
        if (mask & bit) {
          var $el = $('#tdb' + i);
          if (on) {
            $el.addClass(klass);
          } else {
            $el.removeClass(klass);
          }
        }
        bit <<= 1;
      }
    }
    highlightMask(bitMask ^ capturedBitMask, 'ours', on);
    highlightMask(capturedBitMask, 'ours captured', on);
  }

  function getMovesForBoard(board, minFrequency) {
    var ajaxRequest = {
      data: {
        board: board,
        minFrequency: minFrequency,
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

  $('#getBoard input').keyup(updateWords);
  displayWords([]);

  $('#b0').click();

})(jQuery);
