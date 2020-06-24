#include "screen.hpp"
#include <emscripten/bind.h>


EMSCRIPTEN_BINDINGS(corelib) {

   emscripten::register_vector<uint32_t>("vector<uint32_t>");
   
   emscripten::value_object<Statistics>("Statistics")
      .field("maxDepth", &Statistics::max_depth)
      .field("minDepth", &Statistics::min_depth)
      .field("sumDepth", &Statistics::sum_depth)
      .field("count", &Statistics::count)
      .field("infiniteCount", &Statistics::infinite_count)
      .field("histogramMaxDepth", &Statistics::histogram_max_depth)
      .field("histogramMaxValue", &Statistics::histogram_max_value)
      .field("histogramCount", &Statistics::histogram_count)
      .field("histogramBucketSize", &Statistics::histogram_bucket_size)
      .field("histogram", &Statistics::histogram)
      ;

   emscripten::class_<Screen>("Screen")
      .constructor<uint32_t, uint32_t>()
      .function("setCycleInterval", &Screen::set_cycle_interval)
      .function("removeGradients", &Screen::remove_gradients)
      .function("addGradient", &Screen::add_gradient)
      .function("paint", &Screen::paint)
      .function("getColorRgb", &Screen::get_color_rgb)
      .function("clear", &Screen::clear)
      .function("fillRect", &Screen::fill_rect)
      .function("refImageBytes", &Screen::ref_image_bytes)
      .function("refData", &Screen::ref_data)
      .function("getStatistics", &Screen::get_statistics)
      ;

}
