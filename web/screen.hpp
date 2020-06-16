#pragma once

#include <stdint.h>
#include <emscripten/bind.h>

#include "color_mapper.hpp"

struct Screen {

   Screen(uint32_t x_size, uint32_t y_size) : x_size(x_size), y_size(y_size) {
      data = new uint32_t[y_size * x_size];
      image = new uint32_t[y_size * x_size];
   }

   void set_flags(std::string flags) {
      color_mapper.set_flags(flags);
   }

   void remove_gradients() {
      color_mapper.remove_gradients();
   }

   void add_gradient(uint32_t rgb_fr, uint32_t count, uint32_t rgb_to) {
      color_mapper.add_gradient(rgb_fr, count, rgb_to);
   }
   

   void paint(int32_t time) {
      for (uint32_t y = 0; y < y_size; ++y) {
         for (uint32_t x = 0; x < x_size; ++x) {
            uint32_t index = y * x_size + x;
            image[index] = color_mapper.get_color(x, y, data[index], time);
         }
      }
   }

   void fill_rect(uint32_t x_start, uint32_t x_delta, uint32_t y_start, uint32_t y_delta, uint32_t depth) {
      for (uint32_t y = 0; y < y_delta; ++y) {
         for (uint32_t x = 0; x < x_delta; ++x) {
            data[(y + y_start) * x_size + x + x_start] = depth;
         }
      }
   }
   
   void clear() {
      for (uint32_t i = 0; i < y_size * x_size; ++i) {
         data[i] = NOT_CALCULATED;
      }
   }

   emscripten::val ref_image_bytes() {
      return emscripten::val(emscripten::typed_memory_view(x_size * y_size * 4, (uint8_t*) image));
   }

   emscripten::val ref_data() {
      return emscripten::val(emscripten::typed_memory_view(x_size * y_size,  data));
   }
   
   ~Screen() {
      delete[] data;
      delete[] image;
   }
   
   uint32_t x_size;
   uint32_t y_size;

   ColorMapper color_mapper;
   
   uint32_t* data;
   uint32_t* image;
};





