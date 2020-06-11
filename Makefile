

default: build
	make -j run

init:
	cd web && npm install

build-c64:
	make -C c64

build: build-c64

run-web:
	cd web && npm run dev-server

run: run-web

clean:
	git clean -n -fdx -e .idea

.PHONY: all c64 init clean build-c64 build run run-web
