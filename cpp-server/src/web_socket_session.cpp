#include <unistd.h>
#include <sstream>
#include <netinet/in.h>
#include <unordered_map>
#include <chrono>
#include <openssl/sha.h>
#include <b64/encode.h>
#include "web_socket_session.hpp"
#include "rig/exception.hpp"
#include "rig/log.hpp"
#include "web_socket_message.hpp"

using namespace std;


inline void copy_n_masked(stringstream& in, const uint64_t& count,
                          stringstream& out, const uint8_t mask[4])
{
   istreambuf_iterator<char> in_iterator(in);
   ostreambuf_iterator<char> out_iterator(out);
   for (uint64_t i = 0; i < count; ++i) {
      *out_iterator = mask[i % 4] ^ uint8_t(*in_iterator);
      ++out_iterator;
      ++in_iterator;
   }
}

const uint8_t OPCODE_CONTINUATION = 0x00;
const uint8_t OPCODE_TEXT = 0x01;
const uint8_t OPCODE_BINARY = 0x02;
const uint8_t OPCODE_CLOSE = 0x08;
const uint8_t OPCODE_PING = 0x09;
// const uint8_t OPCODE_PONG = 0x0A;


WebSocketSession::WebSocketSession(int socket) : _socket(socket)
{
   // Try to synchronously perform a websocket handshake within reasonable time, will accept all paths, will not try
   // to check anything, just establish the connection trusting the client.

   try {
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
         if (received == -1) THROW(rig::OsError, "field to receive from socket in handshake");
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
         auto sent = ::send(_socket, response_buf.c_str(), response_buf.size(), 0);
         if (sent == -1) THROW(rig::OsError, "send failed in handshake");
         response_buf.erase(0, sent);
      }
      LOG_INFO("handshake completed");

      // Change back to a more normal socket timeout.
      {
         struct timeval timeout{};
         timeout.tv_sec = 7200;
         timeout.tv_usec = 0;
         if (setsockopt(_socket, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout))) {
            THROW_E(rig::OsError, "failed to set receive timeout on socket");
         }
         if (setsockopt(_socket, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout))) {
            THROW_E(rig::OsError, "failed to set send timeout on socket");
         }
      }
   }
   catch (rig::OsError& e) {
      ::close(_socket);
      _socket = -1;
      throw;
   }
}

unique_ptr<WebSocketMessage> WebSocketSession::receive() {
   if (_socket == -1) return unique_ptr<WebSocketMessage>();

   stringstream message_data;
   uint8_t message_opcode = OPCODE_CONTINUATION;

   try {
      while (true) {
         // Continue until we have a complete message.

         stringstream data(_incoming_data);
         data.seekp(0, ios::end);
         uint32_t data_length = _incoming_data.size();
         uint32_t header_length{};
         uint64_t payload_length{};
         uint8_t opcode{};
         uint8_t masking_key[4];
         bool fin;

         do {
            char buf[4096];

            // Get data into buffer until we have a full data frame.
            auto received = recv(_socket, buf, sizeof(buf), 0);
            if (received == -1) {
               THROW_E(rig::OsError, "failed to receive from socket");
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
                  payload_length |= uint8_t(data.get());
               }
            }

            if (not mask) THROW(rig::OsError, "expected mask to be set by server");

            header_length += 4;
            if (data_length < header_length) continue;

            for (uint8_t &item : masking_key) {
               item = data.get();
            }

            // In practice we will most likely get the whole message at once, so to make the code simple re-parse the
            // header until we have the whole data frame.
         } while (data_length < header_length + payload_length);

         // LOG_INFO("complete data frame, fin %d, opcode 0x%02x, payload_length %d, header_length %d, data_length %d, mask_key 0x%08x",
         //          fin, opcode, payload_length, header_length, data_length, masking_key);

         // Now we have a complete data frame, handle the different opcodes.
         if ((opcode == OPCODE_CONTINUATION) == (message_opcode == OPCODE_CONTINUATION)) {
            THROW(rig::OsError, "unexpected opcode, opcode 0x%x, message_opcode 0x%x", opcode, message_opcode);
         }
         if (message_opcode == OPCODE_CONTINUATION) {
            message_opcode = opcode;
         }

         if (message_opcode == OPCODE_TEXT or message_opcode == OPCODE_BINARY) {
            copy_n_masked(data, payload_length, message_data, masking_key);
         } else if (message_opcode == OPCODE_PING) {
            LOG_ERROR("got ping, closing connection");
            close();
            return unique_ptr<WebSocketMessage>();
         } else if (message_opcode == OPCODE_CLOSE) {
            close();
            return unique_ptr<WebSocketMessage>();
         } else {
            LOG_ERROR("got opcode 0x%x, closing connection", message_opcode);
            close();
            return unique_ptr<WebSocketMessage>();
         }

         // Save remaining data for next data frame.
         _incoming_data.assign(istreambuf_iterator<char>(data), istreambuf_iterator<char>());

         if (fin) {
            // This is a complete message return it.
            return make_unique<WebSocketMessage>(
               make_unique<string>(message_data.str()),
               message_opcode == OPCODE_BINARY
            );
         }

         // Keep accumulating data for full message.
      }
   }
   catch (rig::OsError& e) {
      ::close(_socket);
      _socket = -1;
      throw;
   }
}

bool WebSocketSession::send(const unique_ptr<WebSocketMessage>& message) {
   if (_socket == -1) return false;

   const uint64_t length = message->data->length();

   // Send header first, then payload.

   stringstream header;
   header.put(0x80u | (message->binary ? OPCODE_BINARY : OPCODE_TEXT));
   if (length < 126) {
      header.put(length & 0x7fu);
   }
   else if (length <= 0xffff) {
      header.put(126);
      for (int i = 1; i >= 0; --i) {
         header.put((length >> (i * 8u)) & 0xffu);
      }
   }
   else {
      header.put(127);
      for (int i = 7; i >= 0; --i) {
         header.put((length >> (i * 8u)) & 0xffu);
      }
   }
   {
      auto sent = ::send(_socket, header.str().c_str(), header.tellp(), 0);
      if (sent == -1) {
         if (_socket == -1) return false;
         THROW(rig::OsError, "send failed");
      }
   }

   // Send payload.

   auto data_pointer = message->data->c_str();
   uint32_t remaining = length;

   while (remaining != 0) {
      auto sent = ::send(_socket, data_pointer , remaining, 0);
      if (sent == -1) {
         if (_socket == -1) return false;
         THROW(rig::OsError, "send failed");
      }
      data_pointer += sent;
      remaining -= sent;
   }

   return true;
}


void WebSocketSession::close() {
   if (_socket == -1) return;
   LOG_INFO("closing connection");
   uint8_t close_frame[] = {0x80u | OPCODE_CLOSE, 0};
   ::send(_socket, close_frame, sizeof(close_frame), 0);
   ::close(_socket);
   _socket = -1;
}

