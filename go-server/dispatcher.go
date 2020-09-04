package main

import (
	"github.com/gorilla/websocket"
	"runtime"
)

type Dispatcher struct {
	conn *websocket.Conn
}

// Incoming message op codes.
const (
	ABORT = "ABORT"
	START = "START"
)

// Outgoing message op codes.
const (
	CONFIG = "CONFIG"
    BLOCK_STARTED = "block-started"
	ABORTED = "aborted"
    COMPLETED = "completed"
)

type IncomingMessage struct {
	Op           string
	Id           string
	XSize        uint32  `json:"x_size"`
	YSize        uint32  `json:"y_size"`
	BlockXSize   uint32  `json:"block_x_size"`
	BlockYSize   uint32  `json:"block_y_size"`
	MaxN         uint32  `json:"max_n"`
	X0StartIndex int64   `json:"x0_start_index"`
	Y0StartIndex int64   `json:"y0_start_index"`
	X0Delta      float64 `json:"x0_delta"`
	Y0Delta      float64 `json:"y0_delta"`
	Workers      uint32
}

func NewDispatcher(conn *websocket.Conn) *Dispatcher {
	d := &Dispatcher{conn}

	logger.Info("sending config message")
	err := d.conn.WriteJSON(map[string]interface{}{
		"op": CONFIG,
		"endian": "little",
		"max_workers": runtime.NumCPU(),
	})
	if err != nil {
		panic(err)
	}

	return d
}

// Make sure connection gets closed and all workers aborted.
func (d *Dispatcher) Close() {
	if d == nil {
		return
	}

	// TODO Abort.

	err := d.conn.Close()
	if err == nil {
		logger.Infof("closed websocket %s", d.conn.UnderlyingConn().RemoteAddr())
	}
}


func (d *Dispatcher) Run() {
	// Handle incoming messages.
	go func() {
		defer d.Close()

		for {
			var message IncomingMessage
			err := d.conn.ReadJSON(&message)
			if err != nil {
				logger.Errorf("got error when reading: %v", err)
				return
			}

			switch message.Op {
			//case ABORT: d.Abort(message)
			//case START: d.Start(message)
			default:
				logger.Warnf("got bad opcode %v, closing", message.Op)
				return
			}

			logger.Infof("got message: %v", message)
		}
	}()
}

