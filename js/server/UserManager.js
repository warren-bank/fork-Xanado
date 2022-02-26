/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node */

define('server/UserManager', [
	'fs', 'proper-lockfile',
	'express-session', 'passport', 'passport-strategy',
	'platform'
], (
	fs, Lock,
	ExpressSession, Passport, Strategy,
	Platform
) => {

	const Fs = fs.promises;

	class XanadoPass extends Strategy {
		constructor(verify) {
			super();
			this.name = 'xanado';
			this._verify = verify;
		}

		authenticate(req) {
			console.log("authenticate");
			const user = req.body.login_username;
			const pass = req.body.login_password;
			return this._verify(user, pass)
			.then(uo => this.success(uo))
			.catch (e => this.error([ e.message, user ]));
		}
	}

	/**
	 * Manage user login, registration, password reset using Express
	 * and Passport. User object will be kept in req, and contains
	 * { name:, email:, key:, pass: }
	 *
	 * This makes no pretence of being secure, it is simply a means to manage
	 * simple player login to a game.
	 * The routes added are:
	 * POST /register (name, email, pass)
	 * POST /login (name, pass)
	 * POST /logout
	 * POST /reset-password
	 * POST /change-password (pass)
	 * GET /reset-password/:token
	 * GET /session get the redacted user object for the logged-in player
	 */
	class UserManager {

		/**
		 * Call req.login to complete the login process
		 * @param {object} uo user object
		 * @private
		 */
		passportLogin(req, res, uo) {
			console.log(`passportLogin in ${uo}`);
			return new Promise(resolve => {
				req.login(uo, () => {
					console.log(uo, "logged in");
					resolve(uo);
				});
			});
		}

		/**
		 * Load the user DB
		 * @return {Promise} promise that resolved to the DB
		 * @private
		 */
		getDB() {
			if (this.db)
				return Promise.resolve(this.db);
			
			return Lock.lock(this.options.db_file)
			.then(release => Fs.readFile(this.options.db_file)
				  .then(data => release()
						.then(() => JSON.parse(data))))
			.then(db => {
				this.db = db;
				return db;
			});
		}

		/**
		 * Write the DB after an update e.g. user added, pw change etc
		 * @return {Promise} that resolves when the write completes
		 * @private
		 */
		writeDB() {
			const s = JSON.stringify(this.db, null, 1);
			return Fs.access(this.options.db_file)
			.then(acc => Lock.lock(this.options.db_file)
				  .then(release => Fs.writeFile(
					  this.options.db_file, s)
						.then(() => release())))
			.catch(e => Fs.writeFile(this.options.db_file, s)); // file does not exist
		}

		/**
		 * Promise to get the user object for the named user
		 * @param {string} user user name
		 * @return {Promise} resolve to user object, or throw
		 * @private
		 */
		getUser(user, pass) {
			return this.getDB()
			.then(db => {
				let sawUser = false;
				for (let uo of db) {
					if (uo.name === user) {
						sawUser = true;
						if (uo.pass === pass) {
							console.log("getUser --> ", uo);
							return uo;
						}
					}
				}
				console.log(`getUser ${user}/${pass} failed`);
				throw new Error(sawUser ? /*i18n*/'um-bad-pass'
								: /*i18n*/'um-no-such-user');
			});
		}

		/**
		 * Promise to get the user object for the given email
		 * @param {string} email user email
		 * @return {Promise} resolve to user object, or throw
		 * @private
		 */
		getUserByEmail(email) {
			return this.getDB()
			.then(db => {
				for (let f of db) {
					if (f.email === email)
						return f;
				}
				throw new Error(/*i18n*/'um-unknown-email');
			});
		}

		/**
		 * Promise to get the user object for the given key
		 * @param {string} email user email
		 * @return {Promise} resolve to user object, or throw
		 * @private
		 */
		getUserByKey(key) {
			return this.getDB()
			.then(db => {
				for (let f of db) {
					if (f.key === key)
						return f;
				}
				throw new Error(/*i18n*/'um-unknown-key');
			});
		}
		
		/**
		 * Generate a unique key not already in the user DB. Assumes
		 * the DB is loaded.
		 * @return {string} unique 16-character string
		 * @private
		 */
		genKey() {
			let key, unique;
			do {
				key = Math.floor(1e16 + Math.random() * 9e15)
					  .toString(36).substr(0, 10);
				unique = true;
				for (let f of this.db) {
					if (key === f.key) {
						unique = false;
						break;
					}
				}
				for (let k of this.options.reservedKeys) {
					if (key === k) {
						unique = false;
						break;
					}
				}
			} while (!unique);
			return key;
		}

		/**
		 * Add a new user to the DB
		 * @param {string} user user name
		 * @param {string} email user email
		 * @param {string} pass user password
		 * @return {Promise} resolve to user object, or reject if duplicate
		 * @private
		 */
		addUser(user, email, pass) {
			console.log(`Add user '${user}' '${email}' '${pass}'`);
			return this.getUser(user, pass)
			.then(userObject => {
				return Promise.reject(`${userObject} already registered`);
			})
			.catch(e => {
				const userObject = {
					name: user,
					email: email,
					pass: pass,
					key: this.genKey()
				};
				console.log("Pushing ", userObject);
				this.db.push(userObject);
				return this.writeDB()
				.then(() => userObject);
			});
		}

		/**
		 * Make a one-time token for use in password resets
		 * @param {Object} user user object
		 * @private
		 */
		makeOneTimeToken(user) {
			const token = Math.floor(1e16 + Math.random() * 9e15)
				  .toString(36).substr(0, 10);
			user.oneTimeToken = token;
			return this.writeDB()
			.then(() => token);
		}

		/**
		 * Retrieve a user by their one-time token
		 * @private
		 */
		getUserByOneTimeToken(token) {
			return this.getDB()
			.then(db => {
				for (let f of db) {
					if (f.oneTimeToken === token)  {
						delete f.oneTimeToken; // one time
						return this.writeDB()
						.then(() => f);
					}
				}
				throw new Error(`Invalid token ${token}`);
			});
		}

		/**
		 * @private
		 */
		setUpPassport(express) {
			
			// Initialise Passport
			express.use(Passport.initialize());

			// Same as app.use(passport.authenticate('session')); 
			express.use(Passport.session());

			Passport.serializeUser((userObject, done) => {
				// Decide what info from the user object loaded from
				// the DB needs to be shadowed in the session as
				// req.user
				//console.log("serializeUser", userObject);
				done(null, userObject);
			});

			Passport.deserializeUser((userObject, done) => {
				// Session active, look it up to get user
				//console.log("deserializeUser",userObject);
				// attach user object as req.user
				done(null, userObject);
			});

			Passport.use(new XanadoPass(
				(user, pass) => this.getUser(user, pass)));
		}

		/**
		 * @private
		 */
		sendResult(res, status, info) {
			console.log(`<-- ${status}`, info);
			res.status(status);
			res.send(info);
		}

		/**
		 * @private
		 */
		handle_register(req, res, next) {
			const username = req.body.register_username;
			const email = req.body.register_email;
			const pass = req.body.register_password;
			console.log(`/register ${username} ${email} ${pass}`);
			if (!username)
				return this.sendResult(
					res, 500, [ /*i18n*/'um-bad-user', username ]);

			return this.addUser(username, email, pass)
			.then(userObject => this.passportLogin(req, res, userObject)
				  .then(() => this.sendResult(res, 200, [])))
			.catch(e => {
				console.error(e);
				return this.sendResult(
					res, 403, [ /*i18n*/'um-user-exists', username ]);
			});
		}

		/**
		 * @private
		 */
		handle_login(req, res, next) {
			console.log(`/login`);
			const auth = Passport.authenticate(
				'xanado',
				(err, userObject) => {
					if (err) {
						console.error(err);
						return this.sendResult(res, 403, err);
					}

					if (!userObject) {
						console.error("No user object", err);
						return this.sendResult(res, 403, [
							/*i18n*/'um-bad-pass' ]);
					}

					// req.login should set req.user
					return this.passportLogin(req, res, userObject)
					.then(() => this.sendResult(res, 200, []));
				});

			auth(req, res, next);
		}

		/**
		 * @private
		 */
		handle_logout(req, res, next) {
			if (req.session
				&& req.session.passport
				&& req.session.passport.user
				&& req.logout) {
				const departed = req.session.passport.user.name;
				console.log("Logging out", departed);
				req.logout();
				return this.sendResult(res, 200, [
					/*i18n*/'um-logged-out', departed ]);
			}
			return this.sendResult(
				res, 500, [ /*i18n*/'um-not-logged-in' ]);
		}

		/**
		 * @private
		 */
		handle_change_password(req, res) {
			if (req.session
				&& req.session.passport
				&& req.session.passport.user) {
				const pass = req.body.chpw_password;
				const userObject = req.session.passport.user;
				userObject.pass = pass;
				return this.writeDB()
				.then(() => this.sendResult(res, 200, [
					/*i18n*/'um-pass-changed',
					req.session.passport.user.name ]));
			}
			return this.sendResult(
				res, 500, [ /*i18n*/'um-not-logged-in' ]);
		}

		/**
		 * @private
		 */
		handle_reset_password(req, res) {
			const email = req.body.reset_email;
			console.log(`/reset-password for ${email}`);
			if (!email)
				return this.sendResult(
					res, 500, [ /*i18n*/'um-unknown-email' ]);
			const surly = `${req.protocol}://${req.get('Host')}`;
			return this.getUserByEmail(email)
			.then(user => {
				return this.makeOneTimeToken(user)
				.then(token => {
					const url = `${surly}/reset-password/${token}`;
					console.log(`Send password reset ${url} to ${user.email}`);
					if (!this.options.mail)
						return this.sendResult(res, 500, [
							/*i18n*/'um-mail-not-configured' ]);
					return this.options.mail.transport.sendMail({
						from: this.options.mail.sender,
						to:  user.email,
						subject: Platform.i18n('um-password-reset'),
						text: Platform.i18n('um-reset-text', url),
						html: Platform.i18n('um-reset-html', url)
					})
					.then(() => this.sendResult(
						res, 403, [ /*i18n*/'um-reset-sent', user.name ]))
					.catch(e => {
						console.log("WARNING: Mail misconfiguration?", e);
						return this.sendResult(
							res, 500, [	/*i18n*/'um-mail-not-configured' ]);
					});
				});
			})
			.catch(e => this.sendResult(res, 403, [ e.message, email ]));
		}

		/**
		 * @private
		 */
		handle_password_reset(req, res) {
			console.log(`Password reset ${req.params.token}`);
			return this.getUserByOneTimeToken(req.params.token)
			.then(userObject => this.passportLogin(req, res, userObject))
			.then(() => res.redirect('/'))
			.catch(e => this.sendResult(res, 500, [	e.message ]));
		}

		/**
		 * Report who is logged in. This will return a redacted user
		 * object, with just the user name and uniqe key
		 * @private
		 */
		handle_session(req, res) {
			if (req.user)
				// Return redacted user object
				return res.status(200).send({
					name: req.user.name,
					key: req.user.key
				});

			return res.status(401).send('not-logged-in');
		}

		/**
		 * Middleware to check if a user is signed in. Use it with
		 * any route where a logged-in user is required.
		 * @private
		 */
		checkLoggedIn(req, res, next) {
			if (req.isAuthenticated())
				return next();

			console.log("<-- 401 Not signed in");
			return res.status(401).send([ /*i18n*/'um-not-logged-in' ]);
		}

		/**
		 * Construct on an express instance, adding relevant routes.
		 * @param {Express} express Express object
		 * @param {object} options configuration options
		 * @param {string} options.sessionSecret secret to use with express
		 * sessions
		 * @param {string} options.db_file path to json file that stores
		 * passwords
		 * @param {object} options.mail mail configuration for use with
		 * nodemailer
		 */
		constructor(express, options) {
			this.options = options;
			this.db = undefined;

			// UserManager requires ExpressSession to be configured
			express.use(ExpressSession({
				secret: options.sessionSecret,
				resave: false,
				saveUninitialized: false
			}));

			this.setUpPassport(express);

			// See if there is a current session
			express.get(
				'/session',
				(req, res) => this.handle_session(req, res));

			// Register a new user
			express.post(
				'/register',
				(req, res, next) => this.handle_register(req, res, next));

			// Log in a user
			express.post(
				'/login',
				(req, res, next) => this.handle_login(req, res, next));

			// Log out the current signed-in user
			express.post(
				'/logout',
				(req, res) => this.handle_logout(req, res));

			// Send a password reset email to the user with the given email
			express.post(
				'/reset-password',
				(req, res) => this.handle_reset_password(req, res));

			// Receive a password reset from a link in email
			express.get(
				'/reset-password/:token',
				(req, res) => this.handle_password_reset(req, res));

			// Change the password for the current user
			express.post(
				'/change-password',
				(req, res) => this.handle_change_password(req, res));
		}
	}

	return UserManager;
});
