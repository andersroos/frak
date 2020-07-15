#pragma once

#include <string>

struct WebSocketSession {

   explicit WebSocketSession(int socket);

   void log_error_and_close(std::string message);

private:
   int _socket;

};


