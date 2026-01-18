# Find all NAM (Neural Amp Modeler) source files recursively
file(GLOB_RECURSE NAM_SOURCES ../NAM/*.cpp ../NAM/*.c ../NAM*.h)

# Include necessary directories for compilation
include_directories(..)
include_directories(${NAM_DEPS_PATH}/eigen)
include_directories(${NAM_DEPS_PATH}/nlohmann)

# Define compilation flags for Web Audio compatibility
# Web Audio API only supports 32-bit float processing
add_definitions(-DNAM_SAMPLE_FLOAT)
# Disable Eigen's stack allocation limit to prevent stack overflow
add_definitions(-DEIGEN_STACK_ALLOCATION_LIMIT=0)

# Group NAM source files in the IDE
source_group(NAM ${CMAKE_CURRENT_SOURCE_DIR} FILES ${NAM_SOURCES})

# =============================================================================
# NAM Multi-Instance Module
# =============================================================================
# Minimal WASM module with multi-instance support for Web Audio integration.

add_executable(nam nam-multi-instance.cpp ${NAM_SOURCES})

target_compile_features(nam PUBLIC cxx_std_17)

set_target_properties(nam
	PROPERTIES
	CXX_VISIBILITY_PRESET hidden
	INTERPROCEDURAL_OPTIMIZATION TRUE
	PREFIX ""
	COMPILE_FLAGS "-Os"
)

# Configure Emscripten linker flags
set_target_properties(nam PROPERTIES LINK_FLAGS "\
-Os \
-sEXPORTED_FUNCTIONS=_nam_createInstance,_nam_destroyInstance,_nam_getInstanceCount,_nam_loadModel,_nam_unloadModel,_nam_hasModel,_nam_process,_nam_setSampleRate,_nam_getSampleRate,_nam_setMaxBufferSize,_nam_getMaxBufferSize,_nam_getModelLoudness,_nam_hasModelLoudness,_nam_reset,_malloc,_free \
-sEXPORTED_RUNTIME_METHODS=ccall,cwrap,stringToUTF8,lengthBytesUTF8 \
-sENVIRONMENT=web,worker \
-sALLOW_MEMORY_GROWTH \
-sINITIAL_MEMORY=64MB \
-sMAXIMUM_MEMORY=512MB \
-sMODULARIZE \
-sEXPORT_ES6=1 \
-sEXPORT_NAME=createNamModule \
--no-entry \
")

if (NOT MSVC)
	target_compile_options(nam PRIVATE
		-Wall -Wextra -Wpedantic -Wstrict-aliasing -Wunreachable-code -Weffc++ -Wno-unused-parameter
		"$<$<CONFIG:DEBUG>:-Og;-ggdb;-Werror>"
		"$<$<CONFIG:RELEASE>:-Os>"
	)
endif()

# Windows-specific definitions
if (CMAKE_SYSTEM_NAME STREQUAL "Windows")
	target_compile_definitions(nam PRIVATE NOMINMAX WIN32_LEAN_AND_MEAN)
endif()
