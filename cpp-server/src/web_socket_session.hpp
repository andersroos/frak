#pragma once

#include <string>
#include <atomic>
#include "web_socket_message.hpp"

struct WebSocketSession {

   explicit WebSocketSession(int socket);

   // Block until one message is received, returns null if connection was closed while waiting. Receive should
   // always be called in the same thread. Send and close can be called from any thread. Throws OsError on any error.
   std::unique_ptr<WebSocketMessage> receive();

   // Send websocket message. Returns false if connection was closed. Throws OsError on any other error.
   bool send(const std::unique_ptr<WebSocketMessage>& message);

   // Close the connection.
   void close();

   virtual ~WebSocketSession() {
      close();
   }

private:
   std::atomic<int> _socket;

   // Unhandled incoming data kept between receive calls.
   mutable std::string _incoming_data;

};


