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
		for (let i in adddressBook) {
			const entry = adddressBook[i];
			if (entry.name.toLowerCase() == name.toLowerCase()) {
				return entry;
			}
		}
		return null;
	}

	function setName(addressBook, name, email) {
		const entry = lookupName(addressBook, name);
		if (entry) {
			entry.name = name;
			entry.email = email;
		} else {
			addressBook.push({ name: name, email: email });
		}
	}

	$(document).ready(() => {

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
		$('input').attr('autocomplete', 'off');
		$('input.name')
        .autocomplete({
            source: addressBook.map(entry => entry.name)
        })
        .blur(function () {
            const entry = lookupName(addressBook, $(this).val());
            if (entry) {
                $(this).siblings('input').val(entry.email);
            }
        });

		$('form').on('submit', function(event) {
			let playerCount = 0;
			const playerNames = [];
			for (let index = 1; index <= 6; index++) {
				const name = $(`input[name='name${index}']`).val();
				const email = $(`input[name='email${index}']`).val();
				if (name) {
					setName(addressBook, name, email);
					playerCount++;
					if (playerNames.indexOf(name) >= 0) {
						event.stopPropagation();
						event.preventDefault();
						$('#problem_dialog')
						.text("Player names must be unique")
						.dialog()
						.open();
						return false;
					}
					playerNames.push(name);
				}
			}
			saveAddressBook(addressBook);
			if (playerCount < 2) {
				event.stopPropagation();
				event.preventDefault();
				$('#problem_dialog')
				.text("Require at least 2 players to make a game")
				.dialog()
				.open();
				return false;
			} else
				return true;
		});
		$('input').first().focus();
	});
});
