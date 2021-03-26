/* eslint-env browser, jquery */
/* global localStorage */

requirejs(["jquery", "jquery-ui"], () => {
	
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
		const $cb = $('<input type="checkbox" class="isRobot"/>');
		$cb.on("change", function() {
			$(this).closest(".player").find(".email").toggle();
		});
		const $remove = $('<button type="button" class="removeButton">Remove</button>');
		$remove.on("click", function() {
			if ($("#players > div").length < 3) {
				$('#problemDialog')
				.text("Require at least 2 players to make a game")
				.dialog();
			} else
				$(this).closest(".player").remove();
		});
		
		const $email = $('<span class="email"></span>');
		const $emb = $('<button type="button" class="emailInvite" title="Click to add an email address for this player to receive an invitation">Email</button>');
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
						  
		$div
		.append(`Name <input type="text" class="name" size="10" value="${name}" title="Enter the name by which the player will be known. Names must be unique."/>`)
		.append('Robot?')
		.append($cb)
		.append($email)
		.append($remove);
		
		$cb.prop("checked", isRobot);
		if (isRobot) $email.toggle();

		$("#players").append($div);
	}

	$(document).ready(() => {
		
		$(document).tooltip();
		
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
		.on("click", () => addPlayer("New Player", false));

		addPlayer("Player1", false);
		addPlayer("Player2", true);
		
		// Submit to create the game
		$('#createGameButton').on('click', function() {
			let data = {
				edition: $("#edition").val(),
				dictionary: $("#dictionary").val(),
				players: [] };
			const playerNames = [];
			let playerIndex = 0;
			$("#players > div").each(function() {
				const name = $(this).find('input.name').val();
				const isRobot = $(this).find('input.isRobot').prop("checked");
				const email = $(this).find(`.email input`).val();
				
				if (playerNames.indexOf(name) >= 0) {
					event.stopPropagation();
					event.preventDefault();
					$('#problemDialog')
					.text("Player names must be unique")
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
			saveAddressBook(addressBook);
			$.post("newgame", data)
			.done(() => {
				window.location.replace("/html/games.html");
			})
			.fail(e => {
				$('#problemDialog')
				.text(`Failed to create game: ${e.responseText}`)
				.dialog();
			});
			return true;
		});
	});
});
