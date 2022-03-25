/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env browser, jquery */

/**
 * Dialog for game creation. Demand loads the HTML.
 */
define("browser/InvitePlayersDialog", ["browser/Dialog"], Dialog => {

	class InvitePlayersDialog extends Dialog {
		
		constructor(options) {
			super("InvitePlayersDialog", $.extend({
				title: $.i18n("Invite players")
			}, options));
		}

		createDialog() {
			super.createDialog();
			const $datalist = this.$dlg.find("#invitePlayerName");
			$.get("/users")
			.then(users => {

				function pick(name) {
					if (!name)
						return;
					let known = users.find(uo => (
						uo.name === name
						|| uo.email === name
						|| uo.key === name));
					if (!known) {
						known = { email: name };
						users.push(known);
					}

					if (invitees.find(uo => known === uo))
						return;

					invitees.push(known);
					
					$list.empty();
					invitees.forEach(uo => {
						const $in = $("<span class='invitee'></span>")
							  .text((uo.name || uo.email))
							  .data("uo", uo)
							  .on('click', function() {
								  $(this).remove();
							  });
						$list.append($in);
					});
				}

				users.forEach(
					uo =>
					$datalist.append(`<option value="${uo.key}">${uo.name}</option>`));

				const $list = this.$dlg.find("#invitedPlayers");
				const invitees = [];

				const $select = this.$dlg.find("#invitePlayerName");
				$select
				.selectmenu()
				.on('selectmenuchange', () => pick($select.val()));

				const $input = this.$dlg.find("#invitePlayerEmail");
				$input
				.on('change', () => pick($input.val()));
			});
		}

		openDialog() {
			super.openDialog();
			const $gk = this.$dlg.find("[name=gameKey]");
			$gk.val(this.options.gameKey);
		}

		submit() {
			const ps = [];
			this.$dlg.find(".invitee")
			.each(function() {
				ps.push($(this).data("uo"));
			});
			super.submit({ player: ps });
		}

		getAction() {
			return "invitePlayers";
		}
	}

	return InvitePlayersDialog;
});
