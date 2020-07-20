#include <memory>
#include "web_socket_server.hpp"
#include "rig/exception.hpp"
#include "rig/log.hpp"
#include "dispatcher.hpp"

using namespace std::literals;
using namespace std;

/*
thread
  session
    blocking-receive-without

mutex
  incoming_queue (from session, from workers)

thread
  dispatcher
     checks_incoming_queue blocking (with timeout)
     session send bloking
     create threads on start
     joins threas on abort

mutex
  block queue

threads x 24
   worker
      posts for dispatcher on incoming_queue
      blocking get from block queue
      checks abort flag
      adds start block and end block to incoming_queue
      terminates on abort flag or if queue is empty
 */


int main() {
   WebSocketServer server(44002);

   cerr << thread::hardware_concurrency() << endl;


   while (true) {
      try {
         unique_ptr<WebSocketMessage> message;
         shared_ptr<WebSocketSession> session = server.accept();
         session->send(make_unique<WebSocketMessage>(rig::format(
            R"({"op": "config", "endian": "little", "max_workers": %d})",
            thread::hardware_concurrency()
         )));
         Dispatcher dispatcher(session);
         while ((message = session->receive())) {
            dispatcher.on_recieve(move(message));
         }
      }
      catch (const rig::OsError& e) {
         LOG_ERROR("session failed: %s", e.what());
      }
   }
}
