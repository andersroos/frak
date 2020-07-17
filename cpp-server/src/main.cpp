#include <memory>
#include "web_socket_server.hpp"
#include "rig/exception.hpp"
#include "rig/log.hpp"

int main() {
   WebSocketServer server(44002);

   while (true) {
      std::unique_ptr<WebSocketSession> session;
      WebSocketMessage message;
      try {
         session = server.accept();
         session->receive(message);
         LOG_INFO("got message: %s", message.binary ? "true" : "false");
         LOG_INFO("message %s", message.data.str().c_str());
      }
      catch (const rig::OsError& e) {
         LOG_ERROR("connection failed: %s", e.what());
         if (session) session->close();
      }
   }
}
