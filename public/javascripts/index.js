(function($){
  var letterInputsSelector = '#getBoard input[type=text]';

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
      var desired = $('#getBoard input[name=desired]').get(0).value;
      getDesiredWordsForBoard(board, minFrequency, desired);
    } else {
      displayWords([]);
    }
  }

  function displayWords(data) {
    var $words = $('<span>');
    if (data.length) {
      $words.append(data.join(', '));
    } else {
      $words.append('(none)');
    }
    // var $words = $('<ul>');
    // data.map( function(item){ $words.append($('<li>').append(item)) } );
    $('#words').html($words);
  }

  function getDesiredWordsForBoard(board, minFrequency, desired) {
    var ajaxRequest = {
      data: {
        board: board,
        minFrequency: minFrequency,
        desired: desired
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
