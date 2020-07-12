MAKEFILE_DIR := $(dir $(lastword $(MAKEFILE_LIST)))
BASE_DIR := $(realpath $(CURDIR)/$(MAKEFILE_DIR))

CPP_WASM=docker run --rm -u $(shell id -u):$(shell id -g) -v $(BASE_DIR):/src trzeci/emscripten em++ -O3
CORELIB_OBJS=web/corelib.bc

default: build
	make -j run

init:
	cd web && npm install
	npm install -g nodemon
	docker pull trzeci/emscripten
	cd java-server && gradle wrapper --gradle-version 6.5.1

c64-build:
	make -C c64

web/%.bc: web/%.cpp
	$(CPP_WASM) $< -c -o $@

web/corelib.wasm: $(CORELIB_OBJS)
	$(CPP_WASM) --bind -o ./web/corelib.js $(CORELIB_OBJS)

web-build: web/corelib.wasm

web-run:
	cd web && npm run dev-server

registry-run:
	cd registry && nodemon registry.js

java-server-build:
	cd java-server && ./gradlew build

java-server-run:
	cd java-server && ./gradlew run

build: c64-build web-build

run: web-run registry-run java-server-run

clean:
	rm -f web/*.bc web/corelib.wasm web/corelib.js

git-clean:
	git clean -n -fdx -e .idea

todo:
	@git grep -e TODO --and --not -e "git grep -e TODO" || true

idea:
	@git grep -e IDEA --and --not -e "git grep -e IDEA" || true

.PHONY: all c64 init git-clean clean build-c64 build run run-web idea todo

# DO NOT DELETE

web/corelib.bc: web/screen.hpp web/color_mapper.hpp
