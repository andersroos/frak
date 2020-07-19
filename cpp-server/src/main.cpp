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
   session->send(WebSocketMessage("hej"));
   session->close();
}

int main() {
   WebSocketServer server(44002);

   std::cerr << uint32_t(uint8_t(-1)) << std::endl;

   while (true) {
      std::unique_ptr<WebSocketSession> session;
      WebSocketMessage message;
      try {
         session = server.accept();
         new std::thread(close_it, session.get());
         while (session->receive(message)) {
            LOG_INFO("got %s message", message.binary ? "binary" : "text");
            LOG_INFO("message data: %s", message.data->c_str());
         }
      }
      catch (const rig::OsError& e) {
         LOG_ERROR("connection failed: %s", e.what());
      }
   }
}
