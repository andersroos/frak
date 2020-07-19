#pragma once


#include <sstream>
#include <jsoncpp/json/json.h>
#include <memory>
#include "rig/exception.hpp"

struct WebSocketMessage {

   std::unique_ptr<std::string> data;

   bool binary;

   Json::Value json_value;

   explicit WebSocketMessage(const std::string& text_message) : data(std::make_unique<std::string>(text_message)), binary(false) {}

   explicit WebSocketMessage(std::unique_ptr<std::string> data, bool binary=false) : binary(binary) {
      this->data.swap(data);
   }

   std::string op() {
      if (binary) return "block-completed";
      return json()->get("op", "").asString();
   }

   std::string id() {
      return json()->get("id", "").asString();
   }

   Json::Value* json() {
      if (json_value.empty()) {
         Json::Reader reader;
         if (!reader.parse(*data, json_value, false)) {
            THROW(rig::ValueError, "failed to parse as json '%s': %s",
                  request_data.c_str(), reader.getFormattedErrorMessages().c_str());
         }
      }
      return &json_value;
   }
};




