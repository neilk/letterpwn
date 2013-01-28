(function($){
  $('#minFrequencySlider').slider({
    value:16,
    min:0,
    max:24
  });

  $('#getBoard input[type=text]')
    .click( function() { $(this).select(); } )
    .keyup( function(event) {
      // this form has tabIndexes 1-25 for the inputs. Submit button is 26.
      if (event.which !== 9) {
        var nextTabIndex = (parseInt(this.tabIndex, 10) + 1).toString()
        $(this.form).find('[tabIndex=' + nextTabIndex.toString() + ']').focus().select();
      }
    });

})(jQuery);
