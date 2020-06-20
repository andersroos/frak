#pragma once

#include <stdint.h>
#include <emscripten/bind.h>
#include <algorithm>
#include <math.h>
#include <limits>
#include <iostream>
#include "color_mapper.hpp"

struct Statistics {
   uint32_t max_depth = 0;
   uint32_t min_depth = 0xffffffff;
   double   sum_depth = 0;
   float    avg_depth = 0;
   uint32_t count = 0; // count of all pixels with depth (not infinite)
   uint32_t infinite_count = 0;
   uint32_t histogram_max_depth = 0;
   uint32_t histogram_count = 0; // count of pixels shown in histogram
   uint32_t histogram_max_value = 0;
   float    histogram_bucket_size = std::numeric_limits<float>::max();
   vector<uint32_t> histogram = vector<uint32_t>(128, 0);
};

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

   // TODO Returning by value like this creates a memory leak, let js send an array to be filled.
   Statistics get_statistics() const {
      Statistics res;

      // first pass calculate basics
      uint64_t sum_depth = 0;
      for (uint32_t i = 0; i < y_size * x_size; ++i) {
         auto& depth = data[i];

         if (depth >= INFINITE) {
            if (depth == INFINITE) {
               ++res.infinite_count;
            }
         }
         else {
            ++res.count;
            res.max_depth = max(res.max_depth, depth);
            res.min_depth = min(res.min_depth, depth);
            sum_depth += depth;
         }
      }
      res.sum_depth = sum_depth;
      
      if (res.count == 0) {
         res.min_depth = 0;
         res.histogram_bucket_size = 0;
      }
      else {
         res.avg_depth = float(res.sum_depth) / res.count;

         uint32_t max_depth = res.max_depth;

         // second pass build histogram (using multple passes to only cover X% of data)
         while (true) {
            // calculate a target bucket size
            float new_histogram_bucket_size = std::max(1.0f, float(max_depth - res.min_depth) / res.histogram.size());
            if (new_histogram_bucket_size - res.histogram_bucket_size > -0.00001) {
               // if it did not change or changed for the worse we are done
               break;
            }
            res.histogram_bucket_size = new_histogram_bucket_size;

            // calculate new histogram with new histogram_bucket_size
            for (uint32_t i = 0; i < res.histogram.size(); ++i) {
               res.histogram[i] = 0;
            }
            res.histogram_count = 0;
            for (uint32_t i = 0; i < y_size * x_size; ++i) {
               auto& depth = data[i];
               if (depth >= INFINITE) continue;
               uint32_t index = floor((depth - res.min_depth) / res.histogram_bucket_size);
               if (index < res.histogram.size()) {
                  ++res.histogram_count;
                  ++res.histogram[index];
               }
            }

            // find a new max_depth based on histogram
            double limit = double(res.count) * 0.998; // 99.8% will make bucket size 1 on full fractal.
            uint32_t count = 0;
            uint32_t index = 0;
            while (index < res.histogram.size() && count < limit) {
               count += res.histogram[index];
               ++index;
            }
            max_depth = res.min_depth + index * res.histogram_bucket_size;
         }
         // finally set the histogram_max_depth
         res.histogram_max_depth = std::max(max_depth, uint32_t(res.min_depth + res.histogram.size()));

         // calculate max value so client can scale the diagriam easily
         for (auto& value : res.histogram) {
            res.histogram_max_value = std::max(value, res.histogram_max_value);
         }
      }

      return res;
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
