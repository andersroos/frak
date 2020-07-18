#pragma once

#include <string>
#include <atomic>
#include "web_socket_message.hpp"

struct WebSocketSession {

   explicit WebSocketSession(int socket);

   // Block until one message is received, returns false if connection was closed while waiting. Receive should
   // always be called in the same thread. Send and close can be called from any thread. Throws OsError on any error.
   bool receive(WebSocketMessage& message);

   // Send websocket message. Returns false if connection was closed. Throws OsError on any other error.
   bool send(WebSocketMessage& message);

   // Close the connection.
   void close();

private:
   std::atomic<int> _socket;

   // Unhandled incoming data kept between receive calls.
   std::basic_string<uint8_t> _incoming_data;

};


