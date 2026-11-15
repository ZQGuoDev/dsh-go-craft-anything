#!/usr/bin/env bash
set -euo pipefail
GHIDRA_INSTALL_DIR=${GHIDRA_INSTALL_DIR:-/opt/ghidra}
cd "$GHIDRA_INSTALL_DIR/Ghidra/Features/Decompiler/src/decompile/cpp"
# Official release Makefile has x86-only default ARCH_TYPE; empty overrides it for native ARM64 GCC.
make -j2 ghidra_opt ARCH_TYPE= OSDIR=linux_arm_64
mkdir -p "$GHIDRA_INSTALL_DIR/Ghidra/Features/Decompiler/os/linux_arm_64"
install -m755 ghidra_opt "$GHIDRA_INSTALL_DIR/Ghidra/Features/Decompiler/os/linux_arm_64/decompile"
make -j2 sleigh_opt ARCH_TYPE= OSDIR=linux_arm_64
install -m755 sleigh_opt "$GHIDRA_INSTALL_DIR/Ghidra/Features/Decompiler/os/linux_arm_64/sleigh"
cd "$GHIDRA_INSTALL_DIR/GPL/DemanglerGnu"
mkdir -p os/linux_arm_64
gcc -O2 -std=gnu17 -DHAVE_STDLIB_H -DHAVE_STRING_H -I src/demangler_gnu_v2_41/headers src/demangler_gnu_v2_41/c/*.c -o os/linux_arm_64/demangler_gnu_v2_41
gcc -O2 -std=gnu17 -DMAIN_CPLUS_DEM -DHAVE_STDLIB_H -DHAVE_STRING_H -I src/demangler_gnu_v2_24/headers src/demangler_gnu_v2_24/c/*.c -o os/linux_arm_64/demangler_gnu_v2_24
