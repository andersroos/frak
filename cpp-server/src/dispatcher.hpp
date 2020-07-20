#pragma once

#include <utility>
#include <thread>
#include "message_queue.hpp"
#include "web_socket_session.hpp"
#include "rig/log.hpp"
#include "worker.hpp"
#include "block_queue.hpp"


using namespace std;

struct Dispatcher {

   explicit Dispatcher(shared_ptr<WebSocketSession> session) :
      _block_count(),
      _abort(true),
      _destroy(false),
      _session(move(session)),
      _message_queue(),
      _dispatcher_thread()
   {}

   void on_recieve(unique_ptr<WebSocketMessage> message) {
      if (not _dispatcher_thread) _dispatcher_thread = make_unique<thread>(&Dispatcher::run, this);
      _message_queue.put(move(message));
   }

   void run() {
      while (not _destroy) {
         unique_ptr<WebSocketMessage> message = _message_queue.pop();

         if (not message) continue;

         string op = message->op();
         if (op == "abort") {
            abort(true);
         }
         else if (op == "start") {
            start(message);
         }
         else if (op == "block-started") {
            _session->send(message);
         }
         else if (op == "block-completed") {
            _session->send(message);
            if (_block_count-- == 1) {
               _session->send(make_unique<WebSocketMessage>(
                  rig::format(R"({"op": "completed", "id": "%s"})", _id.c_str()))
               );
               LOG_INFO("completed, %s", _id.c_str());
            }
         }
         else {
            LOG_WARNING("unknown op code \"%s\"", op.c_str());
         }
      }
   }

   ~Dispatcher() {
      abort(true);
      _destroy = true;
      _message_queue.put(unique_ptr<WebSocketMessage>());
      if (_dispatcher_thread) _dispatcher_thread->join();
   }

private:

   // Start calculations after aborting.
   void start(const unique_ptr<WebSocketMessage>& message) {
      abort(false);
      _abort = false;
      _id = message->id();
      const Json::Value* json = message->json();
      uint32_t x_size = json->get("x_size", 0).asUInt();
      uint32_t y_size = json->get("y_size", 0).asUInt();
      uint32_t block_x_size = json->get("block_x_size", 0).asUInt();
      uint32_t block_y_size = json->get("block_y_size", 0).asUInt();
      uint32_t max_n = json->get("max_n", 0).asUInt();
      int64_t x0_start_index = json->get("x0_start_index", 0).asInt64();
      int64_t y0_start_index = json->get("y0_start_index", 0).asInt64();
      double x0_delta = json->get("x0_delta", 0).asDouble();
      double y0_delta = json->get("y0_delta", 0).asDouble();
      uint32_t workers = json->get("workers", 0).asUInt();

      for (uint32_t y = 0; y < y_size; y += block_y_size) {
         for (uint32_t x = 0; x < x_size; x += block_x_size) {
            _block_queue.put(make_unique<Block>(
               _id, x, y, block_x_size, block_y_size,
               x0_start_index + x, x0_delta, y0_start_index + y, y0_delta, max_n
            ));
         }
      }
      _block_count = _block_queue.size();

      LOG_INFO("starting, id %s, workers %d, blocks %d", _id.c_str(), workers, _block_count.load());

      for (uint32_t i = 0; i < workers; ++i) {
         _worker_threads.emplace_back(make_unique<thread>(&work, &_abort, &_block_queue, &_message_queue));
      }
   }

   // Abort calculations, block until done.
   void abort(bool send) {
      LOG_INFO("aborting, id %s", _id.c_str());
      _abort = true;
      _block_queue.clear();
      for (auto& worker : _worker_threads) {
         worker->join();
      }
      _worker_threads.clear();
      if (send) _session->send(make_unique<WebSocketMessage>(rig::format(R"({"op": "aborted", "id": "%s"})", _id.c_str())));
   }

   string _id;

   atomic<uint32_t> _block_count;

   atomic<bool> _abort;

   atomic<bool> _destroy;

   shared_ptr<struct WebSocketSession> _session;

   MessageQueue _message_queue;

   unique_ptr<thread> _dispatcher_thread;

   BlockQueue _block_queue;

   vector<unique_ptr<thread>> _worker_threads;
};


