#include "screen.hpp"
#include <emscripten/bind.h>


EMSCRIPTEN_BINDINGS(corelib) {
   emscripten::class_<Screen>("Screen")
      .constructor<uint32_t, uint32_t>()
      .function("setColorMap", &Screen::set_color_map)
      .function("paint", &Screen::paint)
      .function("clear", &Screen::clear)
      .function("refImageBytes", &Screen::ref_image_bytes)
      .function("refDataBytes", &Screen::ref_data_bytes)
      ;
}