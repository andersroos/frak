cmake_minimum_required(VERSION 3.10)

project(frak-cpp-server VERSION 0.0.0)

set(CMAKE_CXX_FLAGS "-O3 -Wall")
set(CMAKE_CXX_FLAGS_DEBUG  "-g")
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED True)

file(GLOB SOURCES src/*.cpp src/rig/*.cpp)

link_libraries(crypto b64)

add_executable(cpp-server ${SOURCES})

