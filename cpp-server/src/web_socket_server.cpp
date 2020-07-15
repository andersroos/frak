#include <arpa/inet.h>
#include "web_socket_server.hpp"
#include "rig/log.hpp"
#include "rig/exception.hpp"

using namespace rig;

WebSocketServer::WebSocketServer(int port)
{
   _socket = socket(AF_INET6, SOCK_STREAM, 0);
   if (_socket == -1) {
      THROW(OsError, "failed to create socket", 1);
   }

   int opt = 1;
   if (setsockopt(_socket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) == -1) {
      THROW_E(OsError, "failed to set socket options");
   }

   struct sockaddr_in6 addr{0};
   addr.sin6_family = AF_INET6;
   addr.sin6_port = htons(port);

   if (bind(_socket, (sockaddr *) &addr, sizeof(sockaddr_in6)) == -1) {
      THROW_E(OsError, "failed to bind to port %d", port);
   }

   if (listen(_socket, 64) == -1) {
      THROW_E(OsError, "could not listen to socket");
   }

   LOG_INFO("listening to tcp port %d", port);
}


WebSocketSession WebSocketServer::accept() const
{
   int server_socket = ::accept(_socket, nullptr, nullptr);
   if (server_socket == -1) {
      THROW_E(OsError, "failed to accept connection");
   }

   LOG_INFO("accepted tcp connection");

   return WebSocketSession(server_socket);
}

