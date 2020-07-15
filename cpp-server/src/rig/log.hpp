#pragma once

#include <iostream>

#define LEVEL_INFO 0
#define LEVEL_WARNING 1
#define LEVEL_ERROR 2

#define LOG_INFO(FORMAT, ...)    rig::log(LEVEL_INFO, __FILE__, __LINE__, FORMAT, ##__VA_ARGS__)
#define LOG_WARNING(FORMAT, ...) rig::log(LEVEL_WARNING, __FILE__, __LINE__, FORMAT, ##__VA_ARGS__)
#define LOG_ERROR(FORMAT, ...)   rig::log(LEVEL_ERROR, __FILE__, __LINE__, FORMAT, ##__VA_ARGS__)

namespace rig {

   // Log, but use the macros above instead.
   void log(const int level, const char *file, int line, const char *format, ...);

   // Set the output stream for the log.
   void set_log_output(std::ostream *out);

}
