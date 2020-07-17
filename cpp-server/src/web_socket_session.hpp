#pragma once

#include <string>
#include "web_socket_message.hpp"

struct WebSocketSession {

   explicit WebSocketSession(int socket);

   // Block until one message is received.
   void receive(WebSocketMessage& message);

   void close();


private:
   int _socket;

   // Unhandled incoming data kept between receive calls.
   std::basic_string<uint8_t> _incoming_data;

};


