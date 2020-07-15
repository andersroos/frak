#include "log.hpp"

#include <cstdarg>
#include <iostream>
#include <unistd.h>
#include <cstring>

using namespace std;

namespace rig {

   ostream *log_out = nullptr;

   void set_log_output(ostream *stream) {
      log_out = stream;
   }

   void log(const int level, const char *file, int line, const char *format, ...) {

      va_list va_args;
      va_start(va_args, format);

      //
      // va_args
      //

      // message

      char message[2048];
      const char *lvl;
      vsnprintf(message, sizeof(message), format, va_args);

      // timestamp

      time_t t;
      time(&t);
      struct tm ti{};
      struct tm *timeinfo = gmtime_r(&t, &ti);
      char timestamp[20];
      if (timeinfo && !strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", timeinfo)) {
         // Don't throw an exception here, because it is nice to have the log line printed anyway.
         timestamp[0] = '\0';
      }

      // level

      switch (level) {
         case LEVEL_INFO:
            lvl = "INFO    ";
            break;
         case LEVEL_WARNING:
            lvl = "WARNING ";
            break;
         case LEVEL_ERROR:
            lvl = "ERROR   ";
            break;
         default:
            lvl = "ERROR";
      }

      // file

      if (strlen(file) > 24) {
         file += strlen(file) - 24;
      }

      // Write the message in one go to make it thread safe.

      char buf[4096];
      snprintf(buf, sizeof(buf),
               "%s %s [%d/0x%016lx %24s:%-3d]: %s\n",
               timestamp, lvl, getpid(), pthread_self(), file, line, message);

      auto out = log_out ? log_out : &cerr;
      *out << buf;
      out->flush();

      //
      // va_args
      //

      va_end(va_args);
   }
}