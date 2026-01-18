cmake_minimum_required(VERSION 3.10)

project(NAM VERSION 1.0.0)

set(CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/cmake")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if (CMAKE_SYSTEM_NAME STREQUAL "Darwin")
	include_directories(SYSTEM /usr/local/include)
elseif (CMAKE_SYSTEM_NAME STREQUAL "Linux")
	link_libraries(stdc++fs)
elseif (CMAKE_SYSTEM_NAME STREQUAL "Windows")
	add_compile_definitions(NOMINMAX WIN32_LEAN_AND_MEAN)
elseif (NOT CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
	message(FATAL_ERROR "Unrecognized Platform! This project is designed for Emscripten WASM builds.")
endif()

set(NAM_DEPS_PATH "${CMAKE_CURRENT_SOURCE_DIR}/Dependencies")

# WASM build only
if (DEFINED EMSCRIPTEN)
	add_subdirectory(wasm)
else()
	message(WARNING "Non-Emscripten build detected. Use 'emcmake cmake ..' for WASM builds.")
endif()
