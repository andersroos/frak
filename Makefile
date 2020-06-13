

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

todo:
	@git grep -e TODO --and --not -e "git grep -e TODO" || true

idea:
	@git grep -e IDEA --and --not -e "git grep -e IDEA" || true

.PHONY: all c64 init clean build-c64 build run run-web idea todo
