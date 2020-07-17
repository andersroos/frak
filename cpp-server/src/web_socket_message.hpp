#pragma once


#include <sstream>
#include <jsoncpp/json/json.h>
#include "rig/exception.hpp"

struct WebSocketMessage {

   std::basic_stringstream<uint8_t> data;

   bool binary;

   Json::Value json() {
      Json::Value value;
      Json::Reader reader;
      if (!reader.parse(reinterpret_cast<const char*>(data.str().c_str()), value, false)) {
         THROW(rig::ValueError, "failed to parse as json '%s': %s",
            request_data.c_str(), reader.getFormattedErrorMessages().c_str());
      }
      return value;
   }

};


