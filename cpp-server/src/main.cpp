#include <memory>
#include <thread>
#include <chrono>
#include "web_socket_server.hpp"
#include "rig/exception.hpp"
#include "rig/log.hpp"

using namespace std::literals;

void close_it(WebSocketSession* session) {
   std::this_thread::sleep_for(4s);
   WebSocketMessage message("hej");
   session->send(message);
   session->close();
}

int main() {
   WebSocketServer server(44002);

   while (true) {
      std::unique_ptr<WebSocketSession> session;
      WebSocketMessage message;
      try {
         session = server.accept();
         new std::thread(close_it, session.get());
         while (session->receive(message)) {
            LOG_INFO("got message: %s", message.binary ? "true" : "false");
            LOG_INFO("message %s", message.data.str().c_str());
         }
      }
      catch (const rig::OsError& e) {
         LOG_ERROR("connection failed: %s", e.what());
      }
   }
}
