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

# Calculations

The gui and core controls the location of the fractal by specifying x0_start_index, x0_delta, y0_start_index and 
y0_delta. The coordinates calcuated is then (x0_start_index * x0_delta, y0_start_index * y0_delta) to 
((x0_start_index + X_SIZE) * x0_delta, (y0_start_index + Y_SIZE) * y0_delta).

This is to be able to keep good precision with only doubles when zooming. Backends can then use whatever precision
needed when calculating.

# Feature Requests

* Use higher precision in calculations.
