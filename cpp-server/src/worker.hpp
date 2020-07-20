#pragma once


#include <atomic>
#include <queue>
#include <utility>
#include "message_queue.hpp"
#include "block_queue.hpp"

#define PUT_UINT32( BUFFER, INT ) \
    BUFFER.put(char(uint8_t((INT >>  0u) & 0xffu))); \
    BUFFER.put(char(uint8_t((INT >>  8u) & 0xffu))); \
    BUFFER.put(char(uint8_t((INT >> 16u) & 0xffu))); \
    BUFFER.put(char(uint8_t((INT >> 24u) & 0xffu)));


using namespace std;

void work(atomic<bool>* abort, BlockQueue* block_queue, MessageQueue* message_queue) {

   unique_ptr<Block> block;
   while ((block = block_queue->pop())) {
      message_queue->put(make_unique<WebSocketMessage>(rig::format(
         R"({"op": "block-started", "id": "%s", "x_start": %ld, "y_start": %ld, "x_size": %d, "y_size": %d})",
         block->id.c_str(), block->x_start, block->y_start, block->x_size, block->y_size
      )));

      stringstream buffer;

      buffer.write(block->id.c_str(), block->id.length());
      for (uint32_t i = block->id.length(); i < 16; ++i) buffer.put(0);
      PUT_UINT32(buffer, block->x_start);
      PUT_UINT32(buffer, block->y_start);
      PUT_UINT32(buffer, block->x_size);
      PUT_UINT32(buffer, block->y_size);

      uint32_t count = 0;
      for (uint32_t yi = 0; yi < block->y_size; ++yi) {
         for (uint32_t xi = 0; xi < block->x_size; ++xi) {

            if (abort->load()) {
               return;
            }

            double y0 = block->y0_delta * double(block->y0_start_index + yi);
            double x0 = block->x0_delta * double(block->x0_start_index + xi);
            uint32_t n = 0;
            double xn = x0;
            double yn = y0;
            for (; n < block->max_n; ++n) {
               double xn2 = xn * xn;
               double yn2 = yn * yn;
               if ((xn2 + yn2) >= 4) {
                  break;
               }
               double next_xn = xn2 - yn2 + x0;
               double next_yn = 2 * xn * yn + y0;
               xn = next_xn;
               yn = next_yn;
            }
            uint32_t depth = (n >= block->max_n) ? 0xfffffffb : n;
            PUT_UINT32(buffer, depth);
            ++count;
         }
      }
      auto data = make_unique<string>(buffer.str());
      message_queue->put(make_unique<WebSocketMessage>(move(data), true));
   }
}

/*
id: 16
x_start: 4
y_start: 4
x_size: 4
y_size: 4
=> offset to data 32;
 */
