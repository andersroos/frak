#include <stdint.h>
#include <emscripten/bind.h>

using namespace emscripten;

/*

  https://stackoverflow.com/questions/15865923/interaction-with-c-classes-in-emscripten

  Compile:
  docker run --rm -u $(id -u):$(id -g) -v $(pwd):/src -v /tmp/emcc-cache:/emsdk_portable/.data/cache -it trzeci/emscripten em++ screen.cpp -o screen.js --bind

  Memory views:
  https://emscripten.org/docs/porting/connecting_cpp_and_javascript/embind.html
*/

const uint32_t rgb_red = 0xff0000;
const uint32_t rgb_green = 0xff00;
const uint32_t rgb_blue = 0xff;

const uint32_t max_col = 64;

const uint32_t col_from = 0xf0f0f0;
const uint32_t col_to = 0x101010;

// Convert 24 bit rgb (hi -> lo) col to 32 bit abrg (hi -> lo).
uint32_t make_32_col(uint32_t col) {
   return 0xff000000
      | ((rgb_red & col) >> 16)
      | (rgb_green & col)
      | ((rgb_blue & col) << 16);
}

struct Screen {

   Screen(uint32_t x_size, uint32_t y_size) : x_size(x_size), y_size(y_size) {
      data = new uint32_t[y_size * x_size];
      image = new uint32_t[y_size * x_size];

      not_calculated = make_32_col(0x101010);
      calculating = make_32_col(0xffffff);
      not_final = make_32_col(0x00ff00);
      fail = make_32_col(0xff0000);
      infinite = make_32_col(0x000000);
   }

   uint32_t map_color(uint32_t count) const {
      if (count >= 0xfffffffb) {
         switch (count) {
            case 0xffffffff: return not_calculated;
            case 0xfffffffe: return calculating;
            case 0xfffffffd: return not_final;
            case 0xfffffffc: return fail;
            case 0xfffffffb: return infinite;
            return fail;
         }
      }

      uint32_t col = count % max_col;

      float fraction = float(col) / max_col;

      uint32_t res = 0xff000000;
      res |= (uint32_t(float(int32_t(col_to & rgb_red) - int32_t(col_from & rgb_red)) * fraction + (col_from & rgb_red)) & rgb_red) >> 16;
      res |= uint32_t(float(int32_t(col_to & rgb_green) - int32_t(col_from & rgb_green)) * fraction + (col_from & rgb_green)) & rgb_green;
      res |= (uint32_t(float(int32_t(col_to & rgb_blue) - int32_t(col_from & rgb_blue)) * fraction + (col_from & rgb_blue)) & rgb_blue) << 16;
      return res;
   }

   void clear() {
      for (uint32_t i = 0; i < y_size * x_size; ++i) {
         data[i] = 0xffffffff;
      }
   }

   val get_image_bytes_ref() {
      return val(typed_memory_view(x_size * y_size * 4, (uint8_t*) image));
   }

   val get_data_bytes_ref() {
      return val(typed_memory_view(x_size * y_size,  data));
   }
   
   void map_colors() {
      for (uint32_t i = 0; i < y_size * x_size; ++i) {
         image[i] = map_color(data[i]);
      }
   }

   ~Screen() {
      delete[] data;
      delete[] image;
   }

   uint32_t not_calculated;
   uint32_t calculating;
   uint32_t not_final;
   uint32_t fail;
   uint32_t infinite;
   
   uint32_t x_size;
   uint32_t y_size;
   
   uint32_t* data;
   uint32_t* image;
};

EMSCRIPTEN_BINDINGS(screen) {
    class_<Screen>("Screen")
       .constructor<uint32_t, uint32_t>()
       .function("mapColors", &Screen::map_colors)
       .function("clear", &Screen::clear)
       //.function("putData", &Screen::putData)
       .function("getImageBytesRef", &Screen::get_image_bytes_ref)
       .function("getDataBytesRef", &Screen::get_data_bytes_ref)
       // .property("x_size", &Screen::get_x_size)
       ;
}
