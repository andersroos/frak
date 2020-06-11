

all: c64

init: init-js

init-js:
	yarn set version berry
	yarn set version latest

c64:
	make -C c64


.PHONY: all c64 init init-js
