#include <memory>
#include "web_socket_server.hpp"
#include "rig/exception.hpp"
#include "rig/log.hpp"

int main() {
   WebSocketServer server(44002);

   while (true) {
      std::unique_ptr<WebSocketSession> session;
      try {
         session = server.accept();
         session->receive();
      }
      catch (const rig::OsError& e) {
         LOG_ERROR("connection failed: %s", e.what());
         if (session) session->close();
      }
   }
}
