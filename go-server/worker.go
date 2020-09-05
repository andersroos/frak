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

func appendUint32(data []byte, val uint32) []byte  {
	return append(
		data,
		uint8(val >> 0),
		uint8(val >> 8),
		uint8(val >> 16),
		uint8(val >> 24),
	)
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

		data := make([]byte, 0, 32 + block.XSize * block.YSize * 4)

		// Put header data in message.

		id := []byte(block.Id)
		data = append(data, id...)
		for ;len(data) < 16; {data = append(data, 0) }

		data = appendUint32(data, block.XStart)
		data = appendUint32(data, block.YStart)
		data = appendUint32(data, block.XSize)
		data = appendUint32(data, block.YSize)

		for yi := uint32(0); yi < block.YSize; yi++ {
			for xi := uint32(0); xi < block.XSize; xi++ {
				if d.aborting.Load().(bool) {
					return
				}

				y0 := block.Y0Delta * float64(block.Y0StartIndex + int64(yi))
				x0 := block.X0Delta * float64(block.X0StartIndex + int64(xi))
				n := uint32(0)
				xn := x0
				yn := y0
				for ; n < block.MaxN; n++ {
					xn2 := xn * xn
					yn2 := yn * yn
					if (xn2 + yn2) >= 4 {
						break
					}
					nextXn := xn2 - yn2 + x0
					nextYn := 2 * xn * yn + y0
					xn = nextXn
					yn = nextYn
				}
				var depth uint32
				if n >= block.MaxN {
					depth = 0xfffffffb
				} else {
					depth = n
				}
				data = appendUint32(data, depth)
			}
		}

		d.outgoing <- OutgoingMessage{websocket.BinaryMessage, data}

		blockCompleted()
	}
}
