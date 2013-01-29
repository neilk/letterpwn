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
      var minFrequency = $('#getBoard input[name=minFrequency]').get(0).value;
      getMovesForBoard(board, minFrequency);
    } else {
      displayWords([]);
    }
  }

  function displayWords(data) {
    var $words = $('<span>');
    if (data.length) {
      for (var i = 0; i < data.length; i++) {
        var bitMask = data[i][0];
        var word = data[i][1];
        $word = $('<span>')
          .addClass('word')
          .append(word)
          .hover(
            function(bitMask){
              return function() {
                highlightMove(bitMask, true);
              }
            }(bitMask),
            function(bitMask){
              return function() {
                highlightMove(bitMask, false);
              }
            }(bitMask)
          );
        $words.append($word);
        if (i < data.length - 1) {
          $words.append(', ');
        }
      }
    } else {
      $words.append('(none)');
    }
    // var $words = $('<ul>');
    // data.map( function(item){ $words.append($('<li>').append(item)) } );
    $('#words').html($words);
  }

  function highlightMove(bitMask, on) {
    var bit = 1;
    var background = on ? '#ffffcc' : 'none';
    for(var i = 0; i <= 24; i++) {
      if (bitMask & bit) {
        $('#b' + i).css({background: background})
      }
      bit <<= 1;
    }
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
})(jQuery);
