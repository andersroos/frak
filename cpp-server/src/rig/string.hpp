#pragma once

#include <algorithm>
#include <string>

namespace rig {

   std::string format(const char* format, ...);

   // Return copy of string with no trailing or leading whitespace.
   inline std::string trim(const std::string& str) {
      auto first = std::find_if_not(str.begin(), str.end(), ::isspace);
      auto last = std::find_if_not(str.rbegin(), std::make_reverse_iterator(first), ::isspace).base();
      return std::string(first, last);
   }
}

