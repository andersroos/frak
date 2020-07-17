#pragma once

#include <cstring>
#include <cerrno>
#include <stdexcept>
#include <sstream>

#include "string.hpp"

#define THROW( EXCEPTION, ... ) \
   throw rig::make_exception<EXCEPTION>(rig::format(#__VA_ARGS__), __FILE__, __LINE__)

#define THROW_E( EXCEPTION, ... ) \
   throw rig::make_exception<EXCEPTION>(rig::format(#__VA_ARGS__), __FILE__, __LINE__, errno)

// TODO rig is not the best name, change it to something.
namespace rig {

   using namespace std;

   template <typename T> T make_exception(string message, string file, int line, int errno_=0)
   {
      T exception;
      exception.message = message;
      exception.file = file;
      exception.line = line;
      exception.errno_ = errno_;
      return exception;
   }

   struct BaseException : public virtual exception
   {
      string message;
      string file;
      int line;
      int errno_;

      virtual const char* what() const throw() {
         try {
            std::stringstream ss;

            ss << message;

            if (not file.empty() or line or errno_) {
               ss << " (";
               if (errno_) {
                  ss << "errno " << errno_ << " '" << strerror(errno_) << "' ";
               }
               if (not file.empty() and line) {
                  ss << "at " << file << ":" << line;
               }
               ss << ")";
            }

            _what = ss.str();
            return _what.c_str();
         }
         catch (...) {
            return "failed to format exception";
         }
      }

   private:
      mutable string _what;
   };

   struct OsError : public BaseException {};
   struct ValueError : public BaseException {};
}

