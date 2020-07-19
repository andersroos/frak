#pragma once

#include <queue>
#include <mutex>
#include <memory>

using namespace std;


struct Block {

   Block(string  id,
         uint32_t x_start,
         uint32_t y_start,
         uint32_t y_size,
         uint32_t x_size,
         int64_t x0_start_index,
         double x0_delta,
         int64_t y0_start_index,
         double y0_delta,
         uint32_t max_n)
      :
      id(move(id)),
      x_start(x_start),
      y_start(y_start),
      y_size(y_size),
      x_size(x_size),
      y0_delta(y0_delta),
      x0_delta(x0_delta),
      y0_start_index(y0_start_index),
      x0_start_index(x0_start_index),
      max_n(max_n)
   {}

   string id;
   uint32_t x_start;
   uint32_t y_start;
   uint32_t y_size;
   uint32_t x_size;
   double y0_delta;
   double x0_delta;
   int64_t y0_start_index;
   int64_t x0_start_index;
   uint32_t max_n;
};


struct BlockQueue {

   void put(unique_ptr<Block> block) {
      scoped_lock lock(_mutex);
      _queue.emplace(move(block));
   }

   unique_ptr<Block> pop() {
      scoped_lock lock(_mutex);
      if (_queue.empty()) return unique_ptr<Block>();
      auto block = move(_queue.front());
      _queue.pop();
      LOG_INFO("popped block queue, size %d", _queue.size());
      return block;
   }

   void clear() {
      scoped_lock lock(_mutex);
      while (not _queue.empty()) _queue.pop();
   }

   uint32_t size() {
      scoped_lock lock(_mutex);
      return _queue.size();
   }

private:

   mutex _mutex;

   queue<unique_ptr<Block>> _queue;
};



