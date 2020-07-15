#pragma once

#include <string.h>
#include <stdarg.h>


using namespace std;

namespace rig {

   string format(const char* format, ...)
   {
      va_list args;
      va_start(args, format);

      size_t len = strlen(format);

      char message[len + (1 << 16)];

      int res = vsnprintf(message, sizeof(message), format, args);
      message[sizeof(message) - 1] = 0;

      if (res < 0 or uint32_t(res) >= sizeof(message) - 1) {
         throw runtime_error("format failed, total message too large or other error");
      }

      va_end(args);

      return string(message);
   }


}