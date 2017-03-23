define(['jquery'], function($) {
	function scrollToTop() {
		verticalOffset = (typeof verticalOffset) === 'undefined' ? 0 : verticalOffset;
		var $element = $('body');
		offset = $element.offset();
		offsetTop = offset.top;
		$('html, body').animate({
			scrollTop : offsetTop
		}, 500, 'linear');
	}

	// Add the markup
	$('body').append($('<div class="scroll-top-wrapper "><span class="scroll-top-inner"><i class="fa fa-2x fa-arrow-circle-up"></i></span></div>'));

	$(document).on('scroll', function() {
		if ($(window).scrollTop() > 100) {
			$('.scroll-top-wrapper').addClass('show');
		} else {
			$('.scroll-top-wrapper').removeClass('show');
		}
	});
	$('.scroll-top-wrapper').on('click', scrollToTop);
});