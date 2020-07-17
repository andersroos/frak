#pragma once

#include <string>

struct WebSocketSession {

   explicit WebSocketSession(int socket);

   // Block until one message is received.
   void receive();

   void close();


private:
   int _socket;

   // Unhandled incoming data kept between receive calls.
   std::basic_string<uint8_t> _incoming_data;

};


