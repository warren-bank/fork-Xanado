/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env browser, jquery */

/* global localStorage */

/**
 * Browser app for game creation
 */
requirejs(["browserApp"], browserApp => {

	const TOOLTIPS = {
		position: { at: "right center"},
		items: "[data-tooltip]",
		content: function() {
			return $.i18n($(this).data("tooltip"));
		}
	};

	const MORETIPS = {
		position: { at: "right center"}
	};
	
	function haveRobots() {
		return $(".isRobot:checked").length > 0;
	}
	
	function validate() {
		console.log(`Validate edition ${$("#edition").val()} dictionary ${$("#dictionary").val()}`);
		$('#createGameButton').prop(
			"disabled",
			$("#dictionary").val() == "none" && haveRobots()
			|| !$("#edition").val());
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

	function addPlayer(name, isRobot, email) {
		const $div = $('<div class="player"></div>');
		const $isRobot = $('<input type="checkbox" class="isRobot"/>');
		$isRobot.on("change", function() {
			$(this).closest(".player").find(".email").toggle();
			validate();
		})
		.attr("title", $.i18n('tooltip-isrobot'))
		.tooltip(MORETIPS)
		.prop("checked", isRobot);

		const $remove = $('<button type="button" class="removeButton">Remove</button>');
		$remove.on("click", function() {
			if ($("#players > div").length < 3) {
				$('#problemDialog')
				.text($.i18n('msg-need-2-players'))
				.dialog();
			} else
				$(this).closest(".player").remove();
		});
		
		const $email = $('<span class="email"></span>');
		const $emb = $('<button type="button" class="emailInvite"></button>');
		$emb.append($.i18n('button-email'));
		$emb.attr("title", $.i18n('tooltip-email'));
		$emb.tooltip(MORETIPS);
		const $emv = $(`<input type="email" size="30" value="${email||''}"/>`);
		$emb.on("click", function() {
			$emb.hide(); $emv.show();
			return false;
		});
		$emv.on("change", function() {
			if ($(this).val() == "") {
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
		
		const $input = $(`<input type="text" class="name" size="10" value="${name}"/>`);
		$input.attr("title", $.i18n('tooltip-name'));
		$input.tooltip(MORETIPS);

		$div
		.append($.i18n('prompt-name'))
		.append($input)
		.append($.i18n('prompt-robot'))
		.append($isRobot)
		.append($email)
		.append($remove);
		
		if (isRobot) $email.toggle();

		$("#players").append($div);
	}

	browserApp.then(() => {

		$.i18n({locale: "en"});
		
		$("body").i18n();
			
		// Set the editions and dictionaries from config.json
		$.getJSON('/config', data => {
			const $eds = $("#edition");
			data.editions.forEach(e => $eds.append(`<option>${e}</option>`));
			if (data.edition)
				$eds.val(data.edition);
			$eds.selectmenu();

			let $dics = $("#dictionary");
			data.dictionaries.forEach(d => $dics.append(`<option>${d}</option>`));
			if (data.dictionary)
				$dics.val(data.dictionary);
			$dics.selectmenu();
		});
		
		const addressBook = loadAddressBook();
		$('input.name')
		.autocomplete({
			source: addressBook.map(entry => entry.name)
		})
		.blur(function () {
			const entry = lookupName(addressBook, $(this).val());
			if (entry) {
				$(this).siblings('.isRobot').val(entry.isRobot);
				$(this).siblings('.email').val(entry.email);
			}
		});
		
		$('form').on('keyup keypress', function(e) {
			var keyCode = e.keyCode || e.which;
			if (keyCode === 13) { 
				e.preventDefault();
				return false;
			}
		});
		
		$("#playerDialog .isRobot")
		.on("change", function() {
			if (this.checked)
				$("#playerDialog > dlg_email").hide();
			else
				$("#playerDialog > dlg_email").show();
		});
		
		$("#addPlayer")
		.on("click", () => addPlayer($.i18n('msg-new-player'), false));

		addPlayer($.i18n('msg-human-player'), false);
		addPlayer($.i18n('msg-robot-player'), true);

		// Using tooltips with a selectmenu is horrible. Applying tooltip()
		// to the select is useless, you have to apply it to the span that
		// covers the select. However this span is not created until some
		// indeterminate time in the future, and there is no event triggered.
		// The alternative is to create the selectmenu now, but doing so blows
		// away the browser's memory of previous selections, which we want.
		//$("select")
		//.selectmenu()
		//.each(function() {
		//	$(`#${this.id}-button`).attr("data-tooltip", $(this).data('tooltip'));
		//});
		
		// Instead, initialise the "title" attribute from the data-tooltip...
		$("select").each(function() {
			$(this).attr("title", $.i18n($(this).data('tooltip')));
		});
		// ... and later, when the selectmenus have (hopefully) been created,
		// map them to jquery tooltips.
		setTimeout(() => {
			$(".ui-selectmenu-button").tooltip(MORETIPS);
			// By now the select values should have been assigned, and we can
			// validate
			validate();
		}, 100);
		
		$("#dictionary").on("selectmenuchange", validate)
		$("#edition").on("selectmenuchange", validate);
		
		// Submit to create the game
		$('#createGameButton')
		.on('click', function() {
			let data = {
				edition: $("#edition").val(),
				dictionary: $("#dictionary").val(),
				players: [] };
			const playerNames = [];
			$("#players > div").each(function() {
				const name = $(this).find('input.name').val();
				const isRobot = $(this).find('input.isRobot').prop("checked");
				const email = $(this).find(`.email input`).val();
				
				if (playerNames.indexOf(name) >= 0) {
					event.stopPropagation();
					event.preventDefault();
					$('#problemDialog')
					.text($.i18n('msg-unique'))
					.dialog();
					return false;
				}
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
				let j = Math.floor(Math.random() * (i + 1));
				let temp = data.players[i];
				data.players[i] = data.players[j];
				data.players[j] = temp;
			}
			saveAddressBook(addressBook);
			$.post("newGame", data)
			.done(() => {
				window.location.replace("/html/games.html");
			})
			.fail(e => {
				$('#problemDialog')
				.text($.i18n('msg-create-failed', e.responseText))
				.dialog();
			});
			return true;
		});
		$(document).tooltip(TOOLTIPS);
	});
});
