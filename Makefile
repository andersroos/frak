

all: c64

init: init-js

init-js:
	npm install -g yarn
	yarn install

c64:
	make -C c64


.PHONY: all c64 init init-js
