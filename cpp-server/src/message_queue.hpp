#pragma once

#include <queue>
#include <mutex>
#include <condition_variable>
#include "web_socket_message.hpp"

using namespace std;

struct MessageQueue {

   // Put a message into the queue.
   void put(unique_ptr<WebSocketMessage> message) {
      LOG_INFO("putting: %s", message->data->c_str());
      scoped_lock lock(_mutex);
      _queue.emplace(move(message));
      _condition.notify_one();
   }

   // Get next message, blocks until next message arrives if empty.
   unique_ptr<WebSocketMessage> pop() {
      unique_lock lock(_mutex);
      while (_queue.empty()) _condition.wait(lock);
      auto message = move(_queue.front());
      LOG_INFO("popping (size %d): %s", _queue.size(), message->data->c_str());
      _queue.pop();
      return message;
   }

   // Remove all messages from the queue.
   void clear() {
      scoped_lock lock(_mutex);
      while (not _queue.empty()) _queue.pop();
   }

private:

   mutex _mutex;

   condition_variable _condition;

   queue<unique_ptr<WebSocketMessage>> _queue;
};


