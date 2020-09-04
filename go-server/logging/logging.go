package logging

import (
	"fmt"
	log "github.com/sirupsen/logrus"
	"os"
	"strings"
)

var Logger *log.Logger

func init() {
	Logger = log.New()
	Logger.SetOutput(os.Stdout)
	Logger.SetLevel(log.InfoLevel)
	Logger.SetReportCaller(true)
	Logger.SetFormatter(&LogFormatter{})
}

type LogFormatter struct{}

const CALLER_LEN = 30

func (f LogFormatter) Format(entry *log.Entry) ([]byte, error) {
	t := entry.Time.UTC()
	time := fmt.Sprintf("%d-%02d-%02d %02d:%02d:%02d.%06dZ", t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), t.Second(), t.Nanosecond()/1e3)

	var color int32
	switch entry.Level {
	case log.WarnLevel: color = 33
	case log.ErrorLevel, log.FatalLevel, log.PanicLevel: color = 31
	default: color = 0
	}
	level := fmt.Sprintf("\x1b[%dm%- 7s\x1b[0m", color, strings.ToUpper(entry.Level.String()))

	caller := fmt.Sprintf("%s:%d", entry.Caller.File, entry.Caller.Line)
	if len(caller) > CALLER_LEN {
		caller = "..." + caller[len(caller)-(CALLER_LEN - 3):]
	}

	logline := fmt.Sprintf("%s %- 7s [% *s]: %s\n", time, level, CALLER_LEN, caller, entry.Message)

	return []byte(logline), nil
}
