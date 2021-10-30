JS := $(shell find js -name '*.js' )

all:
	(cd dictionaries && make)
	node server.js

# Make HTML source-code documentation
doc: doc/index.html


doc/index.html: $(JS)
	node_modules/.bin/jsdoc -c config_jsdoc.json -d doc $(JS)

lint:
	node node_modules/.bin/eslint $(JS)

docekr:
	docker build . --tag xword
