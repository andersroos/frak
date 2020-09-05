package main

import (
	"encoding/json"
	"github.com/gorilla/websocket"
)

type Block struct {
	Id           string
	XStart       uint32
	YStart       uint32
	YSize        uint32
	XSize        uint32
	Y0Delta      float64
	X0Delta      float64
	Y0StartIndex int64
	X0StartIndex int64
	MaxN         uint32
}

func (d *Dispatcher) Work(blocks chan Block, blockCompleted func()) {

	for block := range blocks {

		start, _ := json.Marshal(map[string]interface {}{
			"op": BLOCK_STARTED,
			"id": block.Id,
			"x_start": block.XStart,
			"y_start": block.YStart,
			"x_size": block.XSize,
			"y_size": block.YSize,
		})
		d.outgoing <- OutgoingMessage{websocket.TextMessage, start}

		if d.aborting.Load().(bool) {
			return
		}

		blockCompleted()
	}
}
