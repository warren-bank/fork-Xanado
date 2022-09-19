## XANADO server configuration
The XANADO server is configured by reading a [JSON](https://en.wikipedia.org/wiki/JSON) file containing
the following fields:

+ `port` : The port on the server to use. The default 9093 may be used by several
  [other applications](https://www.speedguide.net/port.php?port=9093)
+ `games` : Path to the directory where games files will be stored,
  relative to the root of the installation. Defaults to `games`.
 + `defaults` : A structure containing defaults to apply to new games and the UI for new users.
  +`edition` : The string name of the default edition when creating new games. Game editions can
    be found in the `editions` directory. Default is `English_Scrabble`.
  + `dictionary` : The default dictionary when creating new games. Note that the
	robot player requires a dictionary. Dictionaries can be found
	 in the 'dictionaries' directory. Default is `CSW2019_English`.
  + `notification` : Whether to generate UI notifications. Notifications require HTTPS. Defaults to `false`.
  + `theme` : User interface theme, must be the name of a subdirectory of `css`. Defaults to `default`.
  + `warnings` : Whether to generate warning sounds. Defaults to  `true`.
  + `cheers` : Whether to generate end of game cheers / groans. Defaults to `true`.
  + `tile` : Whether to make a click when a tile is placed. Defaults to `true`.
  + `turn` : Whether to bong when it's your turn. Defaults to `true`.
 + `auth` : A structure that gives authentication options.
  + `db_file` : Optional path to file used to store usernames and passwords, relative to the
    root directory of the installation. Default is `passwd.json`.
  + `oauth2` : Structure containing configurations for oauth2 providers. You have to have registered the
	application and obtained client id's and secrets from the provider's website. These configurations are
    passed directly to the [Passport](https://www.passportjs.org/) strategy for the named provider
    e.g. [passport-google](https://www.npmjs.com/package/passport-google), [passport-facebook](https://www.npmjs.com/package/passport-facebook). All fields must be given.
   + `google` :
    + `logo` : logo URL [e.g.](https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-jiKhxDx1FrYbtRHKJ9z_hELisAlapwE9LUPh6fcXIfb5vwpbMl4xl9H9TRFPc5NOO8Sb3VSgIBrfRYvW6cUA)
	+ `module`: "passport-google-oauth20"
	+ `clientID` : YOUR CLIENT ID
	+ `clientSecret` : YOUR SECRET
	+ `scope` : `[ "profile", "email" ]`
	+ `callbackURL`: Google requires a fully qualified URL, by their policies e.g.
      `protocol://YOUR.SERVER/oauth2/callback/google`
   + `facebook` :
		`logo` : logo URL [e.g.](https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg)
	+ `clientID` : YOUR CLIENT ID
	+ `clientSecret` : YOUR SECRET
	+ `profileFields` : `["id", "displayName", "email"]`
	+ `callbackURL`: `"/oauth2/callback/facebook"`. Facebook requires a relative URL. Put an absolute URL in and you will get a blank page and facebook will never redirect.
 + `mail` : Email configuration, required for mailing password resets and invitations.
  + `host`: mail host
  + `sender`:  Mail sender name and address e.g. `"XANADO <xanado@example.com>"`
  + `transport` : Structure that is passed directly to the nodemailer
    `createTransport` function. Refer to the [nodemailer documentation](https://nodemailer.com/about/)
    You can also set "transport" to the string "mailgun" to use a [mailgun]( https://www.mailgun.com/)
    configuration.

 + `https` : HTTPS configuration structure. HTTPS is required for notifications
   to work in the browser and may be important for protecting passwords. See
	[here](https://linuxize.com/post/creating-a-self-signed-ssl-certificate/)
	for how to create a self-signed certificate. On Linux:
	`openssl req -newkey rsa:4096 -x509 -sha256 -days 3650 -nodes -out https.crt -keyout https.key`
  + `cert` : cert file e.g. `https.cert`
  + `key` : key file e.g. `https.key`

### Example
Example configuration file, overriding selected fields and giving oauth2, https, and mail configurations.
```
{
  "port": 8192,
  "defaults": {
	"dictionary": "British_English",
	"notification": true
  },
  "auth": {
	"db_file" : "/var/www/xanado/passwd.json",
	"oauth2": {
	  "google": {
		"logo": "https://lh3.googleusercontent.com/COxit...vW6cUA",
		"module": "passport-google-oauth20",
		"clientID":"989874355454-b3finaffwontworkg9kbutyoucantry4.apps.googleusercontent.com",
		"clientSecret":"GOSECR-etSoNottell1-d-ngyou45421hjd",
		"scope": [ "profile", "email" ],
		"callbackURL": "https://xanado.net:8192/oauth2/callback/google"
	  },
	  "facebook": {
		"logo": "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg",
		"clientID":"982304575029836",
		"clientSecret": "7aca810b098c980f88a642fffe75750a",
		"profileFields": ["id", "displayName", "email"],
		"callbackURL": "/oauth2/callback/facebook"
	  }
	}
  },
  "mail": {
    "sender": "Xanado <xanado@xanado.net>",
	"transport": {
	  "host": "isp.net"
	  "user": "xanado"
	}
  }
}
```
