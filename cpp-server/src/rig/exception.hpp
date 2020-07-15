#pragma once

#include <cstring>
#include <cerrno>
#include <stdexcept>
#include <sstream>

#include "string.hpp"

#define THROW( EXCEPTION, ... ) \
   throw EXCEPTION().message(rig::format(__VA_ARGS__)).file(__FILE__).line(__LINE__)

#define THROW_E( EXCEPTION, ... ) \
   throw EXCEPTION().message(rig::format(__VA_ARGS__)).file(__FILE__).line(__LINE__).err(errno)

namespace rig {

   using namespace std;

   // Base exception that can be used as a builder to make it easier to make subclasses.
   struct BaseException : public virtual exception
   {
      virtual BaseException message(string message) {
         _message = message;
         return *this;
      }

      virtual BaseException file(string file) {
         _file = file;
         return *this;
      }

      virtual BaseException line(int line) {
         _line = line;
         return *this;
      }

      virtual BaseException err(int errno_) {
         _errno_ = errno_;
         return *this;
      }

      virtual const char* what() const throw() {
         try {
            std::stringstream ss;

            ss << _message;

            if (!_file.empty() or _line or _errno_) {
               ss << " (";
               if (_errno_) {
                  ss << "errno " << _errno_ << " '" << strerror(_errno_) << "' ";
               }
               if (!_file.empty() and _line) {
                  ss << "at " << _file << ":" << _line;
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
      string _message;
      string _file;
      int _line;
      int _errno_;
   };

   struct OsError : public BaseException {};
}

