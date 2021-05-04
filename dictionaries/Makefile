all: *.dict

%.dict: %.txt
	node ../js/dawg/compressor.js $< $@
