FILES=$(shell ls *.txt)

all: $(FILES:.txt=.dict)

%.dict: %.txt
	node ../js/dawg/dictionary_compressor.js $< $@
