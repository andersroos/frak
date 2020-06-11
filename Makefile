

all: c64

init: init-js

init-js:
	npm install -g yarn
	yarn install

c64:
	make -C c64


clean:
	git clean -n -fdx -e .idea

.PHONY: all c64 init init-js clean

