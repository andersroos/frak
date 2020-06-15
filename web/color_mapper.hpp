#pragma once

#include <stdint.h>
#include <stdlib.h>
#include <algorithm>
#include <string>

const uint32_t NOT_CALCULATED = 0xffffffff;
const uint32_t CALCULATING =    0xfffffffe;
const uint32_t NOT_FINAL =      0xfffffffd;
const uint32_t FAIL =           0xfffffffc;
const uint32_t INFINITE =       0xfffffffb;

const uint32_t MAX_COL = 64;

const int32_t RED_MASK = 0xff0000;
const int32_t GREEN_MASK = 0xff00;
const int32_t BLUE_MASK = 0xff;

const uint32_t col_from = 0x101010;
const uint32_t col_to = 0xf0f0f0;

using namespace std;

/*
 * Maps coordinates x, y, depth, time to color in 34 bit abrg (hi -> lo).
 *
 * Color specs are written in 24 bit rgb (hi -> lo) on the folowing format:
 *    <format> := <flags> ";" <color-sequences>
 *    <flags> := <flag> ";" <flag>
 *    <flag> := "wraps" | "cycle"
 *    <color-sequence> := <color-sequence> "-" <color> | <color-sequence> "-#" <gradient count> "-" <color>
 *    <color> := <string>
 *    <gradient count> := <integer>
 *  
 *  Example of length 84 (dark grey to white (long) to red (short) to dark grey (short)
 *    wraps;101010-#64-ffffff-#8-ff0000-#8-202020
 */


// Return a pulsing color based on col.
uint32_t pulse_col32(int32_t col24, int32_t time_ms) {
   int32_t dim = abs(int32_t(time_ms % 1024) - 512) >> 4;
   int32_t red = max(0, ((col24 & RED_MASK) >> 16) - dim);
   int32_t green = max(0, ((col24 & GREEN_MASK) >> 8) - dim);
   int32_t blue = max(0, (col24 & BLUE_MASK) - dim);
   return 0xff000000 | (blue << 16) | (green << 8) | red;
}

struct ColorMapper {

   void set_spec(string spec) {
      // TODO
   }

   uint32_t get_color(uint32_t x, uint32_t y, uint32_t depth, int32_t time_ms) {
      if (depth >= INFINITE) {
         switch (depth) {
            case NOT_CALCULATED: return ((x >> 3) & 1) == ((y >> 3) & 1) ? 0xff080808 : 0xff181818;
            case CALCULATING: return pulse_col32(0xffffff, time_ms);
            case NOT_FINAL: return pulse_col32(0x00ff00, time_ms);
            case FAIL: return pulse_col32(0xff0000, time_ms);
            case INFINITE: return 0xff000000;
            return 0xffff00ff;
         }
      }

      // Hardcoded spec.
      
      uint32_t col = depth % MAX_COL;

      float fraction = float(col) / MAX_COL;

      uint32_t res = 0xff000000;
      res |= (uint32_t(float(int32_t(col_to & RED_MASK) - int32_t(col_from & RED_MASK)) * fraction + (col_from & RED_MASK)) & RED_MASK) >> 16;
      res |= uint32_t(float(int32_t(col_to & GREEN_MASK) - int32_t(col_from & GREEN_MASK)) * fraction + (col_from & GREEN_MASK)) & GREEN_MASK;
      res |= (uint32_t(float(int32_t(col_to & BLUE_MASK) - int32_t(col_from & BLUE_MASK)) * fraction + (col_from & BLUE_MASK)) & BLUE_MASK) << 16;
      return res;
   }
   
   
};
