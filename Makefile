all:
	(cd dictionaries && make)
	node server.js

# Make HTML source-code documentation
doc: doc/index.html

JS := $(shell find . \( -name node_modules -o -name doc -o -name test \) -prune -false -o \( -name '*.js' \) )

doc/index.html: $(JS)
	node_modules/.bin/jsdoc -c config_jsdoc.json -d doc $(JS)
