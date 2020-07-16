#pragma once

#include <string>

struct WebSocketSession {

   explicit WebSocketSession(int socket);

   void log_error_and_close(const std::string &message) const;

private:
   int _socket;

};


