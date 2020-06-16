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

const uint32_t MAX_COL = 128;

const int32_t R_MASK = 0xff0000;
const int32_t G_MASK = 0xff00;
const int32_t B_MASK = 0xff;

const uint32_t R_RGB_SHIFT = 16;
const uint32_t G_RGB_SHIFT = 8;
const uint32_t B_RGB_SHIFT = 0;

const uint32_t R_ABGR_SHIFT = 0;
const uint32_t G_ABGR_SHIFT = 8;
const uint32_t B_ABGR_SHIFT = 16;

const uint32_t ALPHA = 0xff000000;

const uint32_t col_fr = 0xffffff;
const uint32_t col_to = 0xff0000;

using namespace std;

/*
 * Maps coordinates x, y, depth, time to color in 34 bit abrg (hi -> lo).
 *
 * Color specs are written in 24 bit rgb (hi -> lo) on the folowing format:
 *    <format> := <flags> ";" <color-sequences>
 *    <flags> := <flag> ";" <flag>
 *    <flag> := "wrap" | "cycle" | "stretch"
 *    <color-sequence> := <color-sequence> "-" <color> | <color-sequence> "-#" <gradient count> "-" <color>
 *    <color> := <string>
 *    <gradient count> := <integer>
 *  
 *  Example of length 84 (dark grey to white (long) to red (short) to dark grey (short)
 *    wraps;101010-#64-ffffff-#8-ff0000-#8-202020
 */


// Return a pulsing color based on col.
uint32_t pulse_col32(int32_t rgb, int32_t time_ms) {
   int32_t dim = abs(int32_t(time_ms % 1024) - 512) >> 3;
   int32_t r = max(0, ((rgb & R_MASK) >> 16) - dim);
   int32_t g = max(0, ((rgb & G_MASK) >> 8) - dim);
   int32_t b = max(0, (rgb & B_MASK) - dim);
   return 0xff000000 | (b << 16) | (g << 8) | r;
}

struct Gradient {

   //
   // Gradient of length from rgb_fr (inclusive) to rgb_to (exclusive)
   //
   Gradient(uint32_t start_depth, uint32_t length, uint32_t rgb_fr, uint32_t rgb_to) :
      start_depth(start_depth),
      length(length),
      r_fr((rgb_fr & R_MASK) >> R_RGB_SHIFT),
      g_fr((rgb_fr & G_MASK) >> G_RGB_SHIFT),
      b_fr((rgb_fr & B_MASK) >> B_RGB_SHIFT)
   {
      r_delta = ((rgb_to & R_MASK) >> R_RGB_SHIFT) - int32_t(r_fr);
      g_delta = ((rgb_to & G_MASK) >> G_RGB_SHIFT) - int32_t(g_fr);
      b_delta = ((rgb_to & B_MASK) >> B_RGB_SHIFT) - int32_t(b_fr);
   }

   bool in_range(uint32_t depth) {
      return start_depth <= depth && depth < start_depth + length;
   }

   uint32_t get_color(uint32_t depth) {
      uint32_t col = depth - start_depth;
      float fraction = float(col) / length;

      uint32_t res = ALPHA;
      res |= (uint32_t(r_delta * fraction + r_fr) & 0xff) << R_ABGR_SHIFT;
      res |= (uint32_t(g_delta * fraction + g_fr) & 0xff) << G_ABGR_SHIFT;
      res |= (uint32_t(b_delta * fraction + b_fr) & 0xff) << B_ABGR_SHIFT;
      return res;
   }

   int32_t r_delta;
   int32_t g_delta;
   int32_t b_delta;

   uint32_t r_fr;
   uint32_t g_fr;
   uint32_t b_fr;
   
   uint32_t start_depth;
   uint32_t length;
};

struct ColorMapper {

   ColorMapper() : spec(0, 16, 0x008080, 0xffffff) {}
   
   void set_spec(string spec) {
      
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

      if (!spec.in_range(depth)) {
         return pulse_col32(0x00ff00, time_ms);
      }
      return spec.get_color(depth);
   }

   bool cycle; // TODO
   bool wrap;  // TODO
   bool stretch; // TODO
   vector<Gradient> gradients;
};
