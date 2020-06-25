# About

Trying out different libs/languages doing fractal calculations.

# Structure

gui and core -> dispatcher -> workers (1 - n)

registry

## Gui

* Presentation.
* User interaction.
* In browser gui worker.

## Core

* History storage.
* Color mapping.
* Dispatcher communication.
* Block strategy?
* Statistics.
* In browser gui worker.
* Partly built in web assembly.

## Dispatcher

* Manage workers.
* Block queue.
* Block strategy?
* Multiple implementations, web worker, server or other.

## Worker

* Calculate blocks.
* Multiple implementations, web worker, server or other.

## Registry

* Registry for dispatchers.
* Js client that will fake no registry if no registry.
* Node server.

# Feature Requests

* Use higher precision in calculations.
* Set max n.
* Back/Undo for zoom (and other operations).
