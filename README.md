# About

Trying out different libs/languages doing fractal calculations.

# Structure

gui -> core -> dispatcher -> workers (1 - n)

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
* In browser gui worker?

## Dispatcher

* Manage workers.
* Block queue.
* Block strategy?
* Web worker, server or other.

## Worker

* Calculate blocks.
* Web worker, server or other.

## Registry

* Registry for dispatchers.
* Node server.
