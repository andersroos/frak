#include <unistd.h>
#include <sstream>
#include <netinet/in.h>
#include <unordered_map>
#include <chrono>
#include <algorithm>
#include <openssl/sha.h>
#include <openssl/bio.h>
#include <openssl/evp.h>
#include <b64/encode.h>
#include "web_socket_session.hpp"
#include "rig/exception.hpp"
#include "rig/log.hpp"

using namespace std;

WebSocketSession::WebSocketSession(int socket) : _socket(socket)
{
   // Try to synchronously perform a websocket handshake within reasonable time, will accept all paths, will not try
   // to check anything, just establish the connection trusting the client.

   {
      struct timeval timeout{};
      timeout.tv_sec = 2;
      timeout.tv_usec = 0;
      if (setsockopt(_socket, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout))) {
         THROW_E(rig::OsError, "failed to set receive timeout on socket");
      }
      if (setsockopt(_socket, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout))) {
         THROW_E(rig::OsError, "failed to set send timeout on socket");
      }
   }

   char buf[2048];

   // Read request.
   stringstream request;
   while (true) {
      auto received = recv(_socket, buf, sizeof(buf), 0);
      if (received == -1) {
         log_error_and_close("receive timeout in handshake, closing"); return;
      }
      request.write(buf, received);
      request.seekg(-4, stringstream::end);
      request.read(buf, 4);
      if (strncmp("\r\n\r\n", buf, 4) == 0) {
         // We have end of http request, read is complete.
         break;
      }
   }

   // Parse request.
   request.seekg(0);
   if (not request.good()) {
      log_error_and_close("got empty request, closing"); return;
   }
   unordered_map<string, string> headers;
   string line;
   while (getline(request, line, '\n').good()) {
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
   string secret(headers["Sec-WebSocket-Key"] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
   unsigned char digest[SHA_DIGEST_LENGTH];
   SHA1((const unsigned char*) secret.c_str(), secret.length(), digest);

   // Base64 encode it.
   base64::encoder encoder;
   istringstream is(string((const char*) digest, sizeof(digest)));
   ostringstream accept_key_os;
   encoder.encode(is, accept_key_os);
   string accept_key = accept_key_os.str();

   // Send handshake response.
   stringstream response;
   response << "HTTP/1.1 101 Switching Protocols\r\n";
   response << "Upgrade: websocket\r\n";
   response << "Connection: Upgrade\r\n";
   response << "Sec-WebSocket-Accept: " << accept_key << "\r\n";
   response << "\r\n";
   string response_buf = response.str();

   while (not response_buf.empty()) {
      auto sent = send(_socket, response_buf.c_str(), response_buf.size(), 0);
      if (sent == -1) {
         log_error_and_close("send timeout, closing"); return;
      }
      response_buf.erase(0, sent);
   }
   LOG_INFO("handshake completed");

   // Change back to a more normal socket timeout.
   {
      struct timeval timeout{};
      timeout.tv_sec = 120;
      timeout.tv_usec = 0;
      if (setsockopt(_socket, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout))) {
         THROW_E(rig::OsError, "failed to set receive timeout on socket");
      }
      if (setsockopt(_socket, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout))) {
         THROW_E(rig::OsError, "failed to set send timeout on socket");
      }
   }
}


void WebSocketSession::log_error_and_close(const string &message) const {
   LOG_ERROR(message.c_str());
   close(_socket);
}
