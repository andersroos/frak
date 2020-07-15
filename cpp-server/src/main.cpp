#pragma clang diagnostic push
#pragma ide diagnostic ignored "EndlessLoop"

#include "web_socket_server.hpp"

int main() {
   WebSocketServer server(44002);

   while (true) {
      server.accept();
   }
}

#pragma clang diagnostic pop
