#pragma once


#include "web_socket_session.hpp"

struct WebSocketServer {

   // Create a server, start listening to port.
   explicit WebSocketServer(int port);

   // Block until someone connects and return the session.
   std::unique_ptr<WebSocketSession> accept() const;

private:
   int _socket;
};


