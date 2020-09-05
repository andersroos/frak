package main

import (
	"encoding/json"
	"github.com/gorilla/websocket"
	"runtime"
	"sync"
	"sync/atomic"
)

// Outgoing message op codes.
const (
	CONFIG        = "config"
	BLOCK_STARTED = "block-started"
	ABORTED       = "aborted"
	COMPLETED     = "completed"
)

type OutgoingMessage struct {
	messageType int
	data        []byte
}

// Incoming message op codes.
const (
	ABORT = "abort"
	START = "start"
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

type Dispatcher struct {
	conn     *websocket.Conn
	outgoing chan OutgoingMessage
	working  sync.WaitGroup
	aborting atomic.Value
}

func NewDispatcher(conn *websocket.Conn) *Dispatcher {
	d := &Dispatcher{conn: conn, outgoing: make(chan OutgoingMessage, 256)}

	d.aborting.Store(false)

	logger.Info("sending config message")
	err := d.conn.WriteJSON(map[string]interface{}{
		"op":          CONFIG,
		"endian":      "little",
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

	d.Abort(nil)

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

			logger.Infof("got message: %v", message)

			switch message.Op {
			case ABORT: d.Abort(&message)
			case START: d.Start(&message)
			default:
				logger.Warnf("got bad opcode %v, closing", message.Op)
				return
			}
		}
	}()

	// Handle outgoing messages.
	go func() {
		defer d.Close()

		for message := range d.outgoing {
			err := d.conn.WriteMessage(message.messageType, message.data)
			if err != nil {
				logger.Errorf("got error when writing: %v", err)
				return
			}
		}
	}()
}

func (d *Dispatcher) Start(message *IncomingMessage) {
	logger.Infof("starting  %s %d %d", message.Id, message.Workers, message.MaxN)

	count := message.YSize / message.BlockYSize * message.XSize / message.BlockXSize
	blocks := make(chan Block, count)
	for y := uint32(0); y < message.YSize; y += message.BlockYSize {
		for x := uint32(0); x < message.XSize; x += message.BlockXSize {
			select {
			case blocks <- Block{
				Id:           message.Id,
				XStart:       x,
				YStart:       y,
				YSize:        message.BlockYSize,
				XSize:        message.BlockXSize,
				Y0Delta:      message.X0Delta,
				X0Delta:      message.Y0Delta,
				Y0StartIndex: message.Y0StartIndex + int64(y),
				X0StartIndex: message.X0StartIndex + int64(x),
				MaxN:         message.MaxN,
			}:
			default:
				panic("blocks channel full before starting calculation, probably bad size")
			}
		}
	}
	close(blocks)

	var completed uint32
	atomic.StoreUint32(&completed, 0)

	for i := uint32(0); i < message.Workers; i++ {
		d.working.Add(1)
		go func() {
			defer d.working.Done()
			d.Work(blocks, func() { atomic.AddUint32(&completed, 1) })
		}()
	}
	go func() {
		d.working.Wait()
		if atomic.LoadUint32(&completed) == count {
			logger.Infof("completed %s", message.Id)
			// TODO Send completed.
		}
	}()
}

func (d *Dispatcher) Abort(message *IncomingMessage) {
	d.aborting.Store(true)
	d.working.Wait()

	if message != nil {
		data, _ := json.Marshal(map[string]interface{}{
			"op": ABORTED,
			"id": message.Id,
		})
		d.outgoing <- OutgoingMessage{websocket.TextMessage, data}
	}
	d.aborting.Store(false)
}
