#include <unistd.h>
#include <sstream>
#include <netinet/in.h>
#include <unordered_map>
#include <chrono>
#include <algorithm>
#include <openssl/sha.h>
#include <openssl/bio.h>
#include <openssl/evp.h>
#include "web_socket_session.hpp"
#include "rig/exception.hpp"
#include "rig/log.hpp"

using namespace std;

WebSocketSession::WebSocketSession(int socket) : _socket(socket)
{
   // Try to synchronously perform a websocket handshake within reasonable time, will accept all paths, will not try
   // to check anything, just establish the connection trusting the client.

   struct timeval timeout{};
   timeout.tv_sec = 2;
   timeout.tv_usec = 0;
   if (setsockopt(_socket, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout))) {
      THROW_E(rig::OsError, "failed to set receive timeout on socket");
   }
   if (setsockopt(_socket, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout))) {
      THROW_E(rig::OsError, "failed to set send timeout on socket");
   }

   char buf[2048];

   // Read request.
   stringstream data;
   while (true) {
      auto received = recv(_socket, buf, sizeof(buf), 0);
      if (received == -1) {
         log_error_and_close("receive timeout in handshake, closing"); return;
      }
      data.write(buf, received);
      data.seekg(-4, stringstream::end);
      data.read(buf, 4);
      if (strncmp("\r\n\r\n", buf, 4) == 0) {
         // We have end of http request, read is complete.
         break;
      }
   }

   // Parse request.

   data.seekg(0);
   if (not data.good()) {
      log_error_and_close("got empty request, closing"); return;
   }

   unordered_map<string, string> headers;
   string line;
   while (getline(data, line, '\n').good()) {
      auto res = line.find(':');
      if (res == string::npos) {
         // This is not a header line.
         continue;
      }
      string key(line.substr(0, res));
      string value(line.substr(res + 1, line.size() - 1));
      value.erase(value.begin(), find_if(value.begin(), value.end(), [](int c){return not isspace(c);}));
      value.erase(find_if(value.rbegin(), value.rend(), [](int c){return not isspace(c);}).base(), value.end());
      headers[key] = value;
   }

   // Check connection headers.
   if (headers["Connection"] != "Upgrade") {
      log_error_and_close("expeceted connection upgrade request, closing"); return;
   }
   if (headers["Upgrade"] != "websocket") {
      log_error_and_close("expected upgrading to websocket, closing"); return;
   }

   // Calculate accept key.
   // string secret(headers["Sec-WebSocket-Key"] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
   string secret("dGhlIHNhbXBsZSBub25jZQ==258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
   unsigned char digest[SHA_DIGEST_LENGTH];
   SHA1((const unsigned char*) secret.c_str(), secret.length(), digest);
   string accept_key((const char*) digest, sizeof(digest));

   // Base64 encode it.
   BIO *bio, *b64;
   b64 = BIO_new(BIO_f_base64());
   bio = BIO_new_fp(stdout, BIO_NOCLOSE);
   BIO_push(b64, bio);
   BIO_write(b64, digest, sizeof(digest));
   BIO_flush(b64);
   BIO_free_all(b64);

   cerr << accept_key << endl;
//   while (!= -) {
//   if (not request.good()) return error_response("missing version");
//   if (version != "HTTP/1.1") return error_response("only http/1.1 is supported");
//
//
//
//   data.seekg(0);
//   if (not data.good()) {
//      LOG_ERROR("got empty request");
//      close(_socket);
//      return;
//   }
//
//
//   auto start = 0U;
//   auto end = s.find(delim);
//   while (end != std::string::npos) {
//      std::cout << s.substr(start, end - start) << std::endl;
//      start = end + delim.length();
//      end = s.find(delim, start);
//   }
//
//   std::string method;
//   std::string url;
//   std::string version;
//
//   data.seekg(0);
//   if (not data.good()) {
//      log_error_and_close("got empty request"); return;
//   }
//
//   getline(data, method, ' ');
//   if (not request.good()) return error_response("missing method");
//   if (method != "GET") return error_response("only get is supported");
//
//   std::getline(request, url, ' ');
//   if (not request.good()) return error_response("missing url");
//
//   std::getline(request, version, '\r');
//   if (not request.good()) return error_response("missing version");
//   if (version != "HTTP/1.1") return error_response("only http/1.1 is supported");
//
//   std::string cb;
//
//   auto index = url.find("callback=");
//   if (index != std::string::npos and index > 0 and (url[index - 1] == '?' or url[index - 1] == '&')) {
//      auto end = url.find('&', index + 9);
//      if (end == std::string::npos) {
//         cb = url.substr(index + 9);
//      }
//      else {
//         cb = url.substr(index + 9, end - index - 9);
//      }
//   }
}

void WebSocketSession::log_error_and_close(std::string message) {
   LOG_ERROR(message.c_str());
   close(_socket);
}
