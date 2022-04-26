JS := $(shell find js -name '*.js' )

# Make html version of github markdown
%.html : %.md
	node node_modules/marked/bin/marked.js -gfm $< > $@

all:
	(cd dictionaries && make)
	node server.js --debug_comms --debug_game

TESTS := $(shell find . \( -name node_modules -o -name doc \) -prune -false -o \( -type f -name '*.ut' \) )

%.utr: %.ut
	node $^

tests: $(TESTS:.ut=.utr)

doc/index.html: $(JS) doc/README.md
	node_modules/.bin/jsdoc -c doc/config.json -d doc $(JS)

# Make HTML source-code documentation and README
doc: doc/index.html README.html

lint:
	node node_modules/.bin/eslint $(JS)

# Make docker image, test
docker:
	docker build . --tag xword

# Check translations
tx:
	perl bin/checkStrings.pl

# Update package.json with latest packages
# using npm-check-update (npm install -g npm-check-updates)
update:
	ncu -u
