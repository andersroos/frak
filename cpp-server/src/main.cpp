#include "web_socket_server.hpp"

int main() {
   WebSocketServer server(44002);

   while (true) {
      server.accept();
   }
}
