JS := $(shell find js -name '*.js' )

all:
	(cd dictionaries && make)
	node server.js

# Make HTML source-code documentation
doc: doc/index.html

doc/index.html: $(JS) doc/README.md
	node_modules/.bin/jsdoc -c doc/config.json -d doc $(JS)

lint:
	node node_modules/.bin/eslint $(JS)

# Make docker image, test
docker:
	docker build . --tag xword

# Update package.json with latest packages
# using npm-check-update (npm install -g npm-check-updates)
update:
	ncu -u
