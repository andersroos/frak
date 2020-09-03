package main

import (
  log "github.com/sirupsen/logrus"
)

func main() {
	logger := log.New()
	logger.Print("info", "startup")
}
