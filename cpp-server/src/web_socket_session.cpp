#include <unistd.h>
#include <sstream>
#include <netinet/in.h>
#include <unordered_map>
#include <chrono>
#include <algorithm>
#include <openssl/sha.h>
#include <b64/encode.h>
#include "web_socket_session.hpp"
#include "rig/exception.hpp"
#include "rig/log.hpp"
#include "web_socket_message.hpp"

using namespace std;


inline void copy_n_masked(basic_stringstream<uint8_t>& in, const uint64_t& count,
                          basic_stringstream<uint8_t>& out, const uint8_t mask[4])
{
   istreambuf_iterator<uint8_t> in_iterator(in);
   ostreambuf_iterator<uint8_t> out_iterator(out);
   for (uint64_t i = 0; i < count; ++i) {
      *out_iterator = mask[i % 4] ^ *in_iterator;
      ++out_iterator;
      ++in_iterator;
   }
}

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
      if (received == -1) THROW(rig::OsError, "receive timeout in handshake");
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
   if (not request.good()) THROW(rig::OsError, "got empty handshake request");
   unordered_map<string, string> headers;
   string line;
   while (getline(request, line, '\n').good()) {
      auto res = line.find(':');
      if (res == string::npos) {
         // This is not a header line.
         continue;
      }
      string key(line.substr(0, res));
      string value(rig::trim(line.substr(res + 1, line.size() - 1)));
      headers[key] = value;
   }

   // Check connection headers.
   if (headers["Connection"] != "Upgrade") THROW(rig::OsError, "expected connection upgrade request, closing");
   if (headers["Upgrade"] != "websocket") THROW(rig::OsError, "expected upgrading to websocket, closing");

   // Calculate accept key.
   string secret(headers["Sec-WebSocket-Key"] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
   unsigned char digest[SHA_DIGEST_LENGTH];
   SHA1((const unsigned char *) secret.c_str(), secret.length(), digest);

   // Base64 encode it.
   base64::encoder encoder;
   istringstream is(string((const char *) digest,
   sizeof(digest)));
   ostringstream accept_key_os;
   encoder.encode(is, accept_key_os);
   string accept_key = rig::trim(accept_key_os.str()); // Fore some reason a newline is appended to the digest.

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
      if (sent == -1) THROW(rig::OsError, "send timeout in handshake");
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

void WebSocketSession::receive(WebSocketMessage& message) {
   message.data = basic_stringstream<uint8_t>();
   uint8_t message_opcode = 0x00;

   while (true) {
      // Continue until we have a complete message.

      basic_stringstream<uint8_t> data(_incoming_data);
      uint8_t data_length = _incoming_data.size();

      uint8_t header_length;
      uint64_t payload_length;
      uint8_t opcode;
      uint8_t masking_key[4];
      bool fin;

      do {
         uint8_t buf[4096];

         // Get data into buffer until we have a full data frame.
         auto received = recv(_socket, buf, sizeof(buf), 0);
         if (received == -1) {
            THROW_E(rig::OsError, "receive timeout");
         }
         data.write(buf, received);
         data_length += received;

         // Try to parse header and decide what to do.

         header_length = 2;
         if (data_length < header_length) continue; // We need at least two bytes to start.

         data.seekg(0);
         uint8_t byte;
         byte = data.get();
         fin = byte & 0x80u;
         opcode = byte & 0x0fu;
         byte = data.get();
         bool mask = byte & 0x80u;

         payload_length = byte & 0x7fu;

         uint8_t payload_length_length = 0;
         if (payload_length == 126) {
            payload_length_length = 2;
         } else if (payload_length == 127) {
            payload_length_length = 8;
         }
         header_length += payload_length_length;
         if (data_length < header_length) continue;

         if (payload_length_length) {
            payload_length = 0;
            for (uint8_t i = 0; i < payload_length_length; ++i) {
               payload_length <<= 8u;
               payload_length |= data.get();
            }
         }

         if (not mask) THROW(rig::OsError, "expected mask to be set by server");

         header_length += 4;
         if (data_length < header_length) continue;

         for (uint8_t& item : masking_key) {
            item = data.get();
         }

         LOG_INFO("got header, fin %d, opcode 0x%02x, payload_length %d, mask_key 0x%08x", fin, opcode, payload_length,
                  masking_key);

         // In practice we will most likely get the whole message at once, so to make the code simple re-parse the
         // header until we have the whole data frame.
      }
      while (data_length < header_length + payload_length);

      // Now we have a complete data fram, handle the different opcodes.

      if ((opcode == 0x00) == (message_opcode == 0x00)) {
         THROW(rig::OsError, "unexpecetd opcode, opcode 0x%x, message_opcode 0x%x", opcode, message_opcode);
      }
      if (message_opcode == 0x00) {
         message_opcode = opcode;
      }

      if (message_opcode == 0x01 or message_opcode == 0x02) {
         message.binary = message_opcode == 0x02;

         copy_n_masked(data, payload_length, message.data, masking_key);
      }
      else if (message_opcode == 0x0A) {
         basic_stringstream<uint8_t> pong_data;
         copy_n_masked(data, payload_length, message.data, masking_key);
         LOG_INFO("got ping, not sending pong");
         // TODO pong(pong_data);
      }
      else {
         // Ignore opcode, just skip the data.
         data.seekg(payload_length, ios_base::cur);
      }

      if (fin) {
         // This is a complete message, save remaining data.
         _incoming_data.assign(istreambuf_iterator<uint8_t>(data), istreambuf_iterator<uint8_t>());
         return;
      }

      // Keep accumulating data for full message.
   }
}

void WebSocketSession::close() {
   if (_socket != -1) {
      LOG_INFO("closing connection");
      ::close(_socket);
      _socket = -1;
   }
}
