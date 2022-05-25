# Make html version of github markdown
%.html : %.md
	node node_modules/marked/bin/marked.js -gfm $< > $@

all:
	(cd dictionaries && make)
	node server.js --debug_server --debug_game

tests:
	npm run test

coverage:
	npm run coverage

# Make HTML source-code documentation and README
doc:
	npm run doc

lint:
	npm run lint

# Make docker image, test
docker:
	npm run docker

# Check translations
tx:
	npm run tx

# Update package.json with latest packages
# using npm-check-update (npm install -g npm-check-updates)
update:
	npm run update
