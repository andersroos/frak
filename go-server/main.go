package main

import (
	"net/http"
	"github.com/gorilla/websocket"
	"ygram.se/frak/logging"
)

var logger = logging.Logger

var connecting = make(chan *websocket.Conn)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  4096,
    WriteBufferSize: 4096,
    CheckOrigin: func(*http.Request) bool { return true},
}

func handler(writer http.ResponseWriter, request *http.Request) {
	conn, err := upgrader.Upgrade(writer, request, nil)
	if err != nil {
		panic(err)
	}

	logger.Infof("accepted websocket connection %s", conn.UnderlyingConn().RemoteAddr())

	connecting <- conn
}

func main() {

	logger.Info("starting server on 44003")

	go func() {
		err := http.ListenAndServe("0.0.0.0:44003", http.HandlerFunc(handler))
		if err != nil {
			panic(err)
		}
	}()

	var dispatcher *Dispatcher
	for conn := range connecting {
		dispatcher.Close()
		dispatcher = NewDispatcher(conn)
		dispatcher.Run()
	}
}
