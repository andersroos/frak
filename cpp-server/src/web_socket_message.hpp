#pragma once


#include <sstream>
#include <jsoncpp/json/json.h>
#include <memory>
#include "rig/exception.hpp"

struct WebSocketMessage {

   std::unique_ptr<std::string> data;

   bool binary;

   WebSocketMessage() : data(std::make_unique<std::string>("")), binary(false) {}

   WebSocketMessage(const std::string& text_message) : data(std::make_unique<std::string>(text_message)), binary(false) {}

   WebSocketMessage(std::unique_ptr<std::string>& data, bool binary=false) : binary(binary) {
      this->data.swap(data);
   }

   Json::Value json() {
      Json::Value value;
      Json::Reader reader;
      if (!reader.parse(*data, value, false)) {
         THROW(rig::ValueError, "failed to parse as json '%s': %s",
               request_data.c_str(), reader.getFormattedErrorMessages().c_str());
      }
      return value;
   }
};




