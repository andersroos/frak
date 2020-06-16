#include "screen.hpp"
#include <emscripten/bind.h>


EMSCRIPTEN_BINDINGS(corelib) {
   emscripten::class_<Screen>("Screen")
      .constructor<uint32_t, uint32_t>()
      .function("setFlags", &Screen::set_flags)
      .function("removeGradients", &Screen::remove_gradients)
      .function("addGradient", &Screen::add_gradient)
      .function("paint", &Screen::paint)
      .function("clear", &Screen::clear)
      .function("fillRect", &Screen::fill_rect)
      .function("refImageBytes", &Screen::ref_image_bytes)
      .function("refData", &Screen::ref_data)
      ;
}
