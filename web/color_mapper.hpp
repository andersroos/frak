#pragma once

#include <stdint.h>
#include <stdlib.h>
#include <algorithm>
#include <string>
#include <sstream>

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
 *    <flags> := <flags> ":" <flag>
 *    <flag> := "wrap" | "cycle" | "stretch"
 *    <color-sequence> := <color> | (<color> "-#" <count>) "-" <color-sequences>
 *  
 *  Example of length 16 (dark grey to white (long) to red (short)
 *    wraps;101010-#9-ffffff-#4-ff0000
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

   uint32_t end() const {
      return start_depth + length;
   }
   
   bool in_range(uint32_t depth) {
      return start_depth <= depth && depth < start_depth + length;
   }

   uint32_t get_color_abgr(uint32_t depth) {
      uint32_t col = depth - start_depth;
      float fraction = float(col) / length;

      uint32_t res = ALPHA;
      res |= (uint32_t(r_delta * fraction + r_fr) & 0xff) << R_ABGR_SHIFT;
      res |= (uint32_t(g_delta * fraction + g_fr) & 0xff) << G_ABGR_SHIFT;
      res |= (uint32_t(b_delta * fraction + b_fr) & 0xff) << B_ABGR_SHIFT;
      return res;
   }

   uint32_t get_color_rgb(uint32_t depth) {
      uint32_t col = depth - start_depth;
      float fraction = float(col) / length;

      uint32_t res = 0;
      res |= (uint32_t(r_delta * fraction + r_fr) & 0xff) << R_RGB_SHIFT;
      res |= (uint32_t(g_delta * fraction + g_fr) & 0xff) << G_RGB_SHIFT;
      res |= (uint32_t(b_delta * fraction + b_fr) & 0xff) << B_RGB_SHIFT;
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

uint32_t fail_color(uint32_t time_ms) {
   return pulse_col32(0xff0000, time_ms);
}

struct ColorMapper {

   ColorMapper() {}

   void set_cycle_interval(float cycle_interval) {
      this->cycle_interval = cycle_interval;
   }

   void set_color_offset(uint32_t color_offset) {
      this->color_offset = color_offset;
   }
   
   void remove_gradients() {
      gradients.clear();
   }
   
   void add_gradient(uint32_t rgb_fr, uint32_t count, uint32_t rgb_to) {
      uint32_t end = 0;
      if (not gradients.empty()) {
         end = gradients.back().end();
      }
      Gradient gradient(end, count, rgb_fr, rgb_to);
      gradients.push_back(gradient);
   }
   
   uint32_t constrain_depth(uint32_t depth, int32_t time_ms) {
      depth = depth - color_offset;
      
      if (cycle_interval != 0) {
         depth = depth + uint32_t(float(time_ms) / cycle_interval);
      }

      return depth % gradients.back().end();
   }
   
   uint32_t get_color_rgb(uint32_t depth, int32_t time_ms) {
      if (gradients.empty()) {
         return  0x000000;
      }

      depth = constrain_depth(depth, time_ms);

      for (auto i = gradients.begin(); i != gradients.end(); ++i) {
         if (i->in_range(depth)) {
            return i->get_color_rgb(depth);
         }
      }
      return 0x000000;
      
   }
   
   uint32_t get_color_abgr(uint32_t x, uint32_t y, uint32_t depth, int32_t time_ms) {
      if (depth >= INFINITE) {
         switch (depth) {
            case NOT_CALCULATED: return ((x >> 3) & 1) == ((y >> 3) & 1) ? 0xff080808 : 0xff181818;
            case CALCULATING: return pulse_col32(0xffffff, time_ms);
            case NOT_FINAL: return pulse_col32(0x0080ff, time_ms);
            case FAIL: return fail_color(time_ms);
            case INFINITE: return 0xff000000;
            return 0xffff00ff;
         }
      }

      if (gradients.empty()) {
         return fail_color(time_ms);
      }

      depth = constrain_depth(depth, time_ms);
      
      for (auto i = gradients.begin(); i != gradients.end(); ++i) {
         if (i->in_range(depth)) {
            return i->get_color_abgr(depth);
         }
      }
      return pulse_col32(0x00ff00, time_ms);
   }

   uint32_t color_offset;
   float cycle_interval;
   vector<Gradient> gradients;
};

   
