# About

Trying out different languages/libs by doing fractal calculations.

# Structure

gui and core -> dispatcher -> workers (1 - n)

registry

## Gui

* Presentation.
* User interaction.

## Core

* History storage.
* Color mapping.
* Backend dispatcher communication.
* Statistics.
* Partly built in web assembly.

## Backend

Handled by core and communicates via websockets or webworker messages.

### Dispatcher

* Manage workers.
* Splits fractal into blocks and manages block queue.
* Multiple implementations, web worker, server or other.

### Worker

* Calculate blocks.
* Multiple implementations, web worker, server or other.

# Calculations

The gui and core controls the location of the fractal by specifying x0_start_index, x0_delta, y0_start_index and 
y0_delta. The coordinates calcuated is then (x0_start_index * x0_delta, y0_start_index * y0_delta) to 
((x0_start_index + X_SIZE) * x0_delta, (y0_start_index + Y_SIZE) * y0_delta).

This is to be able to keep good precision with only doubles when zooming. Backends can then use whatever precision needed when calculating.

# Feature Requests

* Show benchmark toplist.
* Selects needs to support mobile.

# Bugs

* Backend needs state, connecting, ready, disconnected.
* Worker count is not updated when backend is configured.
 