(function($){
  $('#minFrequencySlider').slider({
    value:16,
    min:0,
    max:24
  });

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
      var minFrequency = $('#getBoard input[name=minFrequency]').get().value;
      var desired = $('#getBoard input[name=desired]').get().value;
      getDesiredWordsForBoard(board, minFrequency, desired);
    }
  }

  function getDesiredWordsForBoard(board, minFrequency, desired) {
    $.ajax('/api', {
      data: {
        board: board,
        minFrequency: minFrequency,
        desired: desired
      },
      error: function(xhr, status, err) {
        console.log(xhr, status, err);
      },
      success: function(data, textStatus, xhr) {
        var $ul = $('<ul>');
        data.map( function(item){ $ul.append($('<li>').append(item)) } );
        $('#words').html($ul);
      }
    });
  }

  $('#getBoard input').change(updateWords);
})(jQuery);
