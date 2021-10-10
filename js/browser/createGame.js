/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env browser, jquery */

/* global localStorage */

/**
 * Browser app for game creation
 */
requirejs(['browser/browserApp'], browserApp => {

	const TOOLTIPS = {
		position: { at: 'right center'},
		items: '[data-tooltip]',
		content: function() {
			return $.i18n($(this).data('tooltip'));
		}
	};

	const MORETIPS = {
		position: { at: 'right center'}
	};

	let addressBook;

	function haveRobots() {
		return $('.isRobot:checked').length > 0;
	}

	// Validate fields to determine if Create Game can be enabled
	function validate() {
		console.log(`Validate edition ${$('#edition').val()} dictionary ${$('#dictionary').val()}`);

		let playerNamesUnique = true;
		$('.duplicate').removeClass('duplicate');
		const playerNames = [];
		$('#players > div').each(function() {
			const $name = $(this).find('input.name');
			const name = $name.val();
			if (playerNames.indexOf(name) >= 0) {
				$name.addClass('duplicate');
				playerNamesUnique = false;
			}
			playerNames.push(name);
		});

		if (!playerNamesUnique)
			$('#problemDialog')
			.text($.i18n('error-unique'))
			.dialog();

		$('#createGameButton').prop(
			'disabled',
			!playerNamesUnique
			|| $('#dictionary').val() === 'none' && haveRobots()
			|| !$('#edition').val());
	}

	function loadAddressBook() {
		if (localStorage.getItem('addressBook'))
			return JSON.parse(localStorage.getItem('addressBook'));
		return [];
	}

	function saveAddressBook(addressBook) {
		localStorage.setItem('addressBook', JSON.stringify(addressBook));
	}

	function lookupName(adddressBook, name) {
		if (!name)
			return null;
		for (let i in adddressBook) {
			const entry = adddressBook[i];
			if (entry && entry.name &&
				entry.name.toLowerCase() == name.toLowerCase()) {
				return entry;
			}
		}
		return null;
	}

	function rememberPlayer(addressBook, name, isRobot, email) {
		const entry = lookupName(addressBook, name);
		if (entry) {
			entry.name = name;
			entry.email = email;
			entry.isRobot = isRobot;
		} else {
			addressBook.push({ name: name, isRobot: isRobot, email: email });
		}
	}

	// Add a player to the game
	function createPlayerDOM(name, isRobot, email) {
		const $div = $('<div class="player"></div>');
		const $isRobot = $(`<input type="checkbox" class="isRobot"/>`);
		$isRobot.on('change', function() {
			$(this).closest('.player').find('.email').toggle();
			validate();
		})
		.attr('title', $.i18n('tooltip-isrobot'))
		.tooltip(MORETIPS)
		.prop('checked', isRobot);

		const $remove = $('<button type="button" class="removeButton">Remove</button>');
		$remove.attr('title', $.i18n('tooltip-remove-player'));
		$remove.on('click', function() {
			if ($('#players > div').length < 3) {
				$('#problemDialog')
				.text($.i18n('error-need-2-players'))
				.dialog();
			} else
				$(this).closest('.player').remove();
		});

		const $email = $('<span class="email"></span>');
		const $emb = $('<button type="button" class="emailInvite"></button>');
		$emb.append($.i18n('button-email'));
		$emb.attr('title', $.i18n('tooltip-email'));
		$emb.tooltip(MORETIPS);
		const $emv = $("<input type='email' size='30'/>");
		$emv.attr('value', email || '');
		$emv.attr('title', $.i18n('tooltip-player-email'));
		$emb.on('click', function() {
			$emb.hide(); $emv.show();
			return false;
		});
		$emv.on('change', function() {
			if ($(this).val() == '') {
				$emb.show(); $emv.hide();
			}
			return false;
		});
		$email.append($emb).append($emv);
		if (email) {
			$emb.hide(); $emv.show();
		} else {
			$emb.show(); $emv.hide();
		}

		const $input = $("<input type='text' class='name' size='10'/>");
		$input
		.attr('value', name)
		.attr('title', $.i18n('tooltip-name'))
		.tooltip(MORETIPS)
		.autocomplete({
			source: addressBook.map(entry => entry.name)
		})
		.blur(function () {
			const entry = lookupName(addressBook, $(this).val());
			if (entry) {
				$(this).siblings('.isRobot').val(entry.isRobot);
				$(this).siblings('.email').val(entry.email);
			}
			validate();
		});

		$div
		.append($.i18n('prompt-name'))
		.append($input)
		.append($.i18n('prompt-robot'))
		.append($isRobot)
		.append($email)
		.append($remove);

		if (isRobot) $email.toggle();

		$('#players').append($div);
	}

	// Handle a click on 'Add Player'
	function inventPlayer() {
		const playerNames = [];
		$('#players > div').each(function() {
			playerNames.push($(this).find('input.name').val());
		});

		// Choose a unique name
		let idx = playerNames.length + 1;
		let pn;
		do
			pn = $.i18n('name-new-player', idx++);
		while (playerNames.indexOf(pn) >= 0);

		createPlayerDOM(pn, false);
	}

	browserApp.then(() => {

		addressBook = loadAddressBook();

		$.i18n();

		// Translate data-i18n in the HTML
		$('body').i18n();

		// Set the editions and dictionaries from config.json
		$.getJSON('/defaults', defaults => {
			$.getJSON('/editions', editions => {
				const $eds = $('#edition');
				editions.forEach(e => $eds.append(`<option>${e}</option>`));
				if (defaults.edition)
					$eds.val(defaults.edition);
				$eds.selectmenu();
				validate();
			});

			$.getJSON('/dictionaries', dictionaries => {
				const $dics = $('#dictionary');
				dictionaries.forEach(d => $dics.append(`<option>${d}</option>`));
				if (defaults.dictionary)
					$dics.val(defaults.dictionary);
				$dics.selectmenu();
				validate();
			});
		});
		
		$('form').on('keyup keypress', function(e) {
			var keyCode = e.keyCode || e.which;
			if (keyCode === 13) { 
				e.preventDefault();
				return false;
			}
			return true;
		});

		// Create default players, Human and Robot
		createPlayerDOM($.i18n('name-human-player'), false);
		createPlayerDOM($.i18n('name-robot-player'), true);

		// Button to add additional players
		$('#addPlayer').on('click', () => inventPlayer());

		// Using tooltips with a selectmenu is horrible. Applying
		// tooltip() to the select is useless, you have to apply it to
		// the span that covers the select. However this span is not
		// created until some indeterminate time in the future, and
		// there is no event triggered.  The alternative is to create
		// the selectmenu now, but doing so blows away the browser's
		// memory of previous selections, which we want. Instead, we
		// have to brute-force initialise the 'title' attribute from
		// the data-tooltip...
		$('select').each(function() {
			$(this).attr('title', $.i18n($(this).data('tooltip')));
		});

		// ... and later, when the selectmenus have (hopefully) been created,
		// map them to jquery tooltips.
		setTimeout(() => {
			$('.ui-selectmenu-button').tooltip(MORETIPS);
			// By now the select values should have been assigned, and we can
			// validate
			validate();
		}, 100);

		$('#dictionary').on('selectmenuchange', validate);
		$('#edition').on('selectmenuchange', validate);

		// Create the game
		$('#createGameButton')
		.on('click', function() {
			const data = {
				edition: $('#edition').val(),
				dictionary: $('#dictionary').val(),
				time_limit: $('#time_limit').val(),
				players: []
			};
			const playerNames = [];
			$('#players > div').each(function() {
				const name = $(this).find('input.name').val();
				const isRobot = $(this).find('input.isRobot').prop('checked');
				const email = $(this).find(`.email input`).val();

				playerNames.push(name);

				rememberPlayer(addressBook, name, isRobot, email);

				data.players.push({
					name: name,
					isRobot: isRobot,
					email: email
				});
			});
			// Randomize player order in-place. Equivalent to picking a tile.
			for (var i = data.players.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				const temp = data.players[i];
				data.players[i] = data.players[j];
				data.players[j] = temp;
			}
			saveAddressBook(addressBook);
			$.post('newGame', data)
			.done(() => {
				window.location.replace('/html/games.html');
			})
			.fail(e => {
				$('#problemDialog')
				.text($.i18n('error-create-failed', e.responseText || e.state()))
				.dialog();
			});
			return true;
		});
		$(document).tooltip(TOOLTIPS);
	});
});
