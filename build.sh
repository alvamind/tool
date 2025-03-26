#!/bin/bash

echo "Cleaning up old build artifacts..."
rm -f dns

echo "Building optimized binary..."
bun build ./index.ts \
  --compile \
  --minify \
  --minify-syntax \
  --minify-whitespace \
  --target bun \
  --outfile dns

# Make executable
chmod +x dns

# Show file info
echo -e "\nBuild completed!"
ls -lh dns
echo -e "\nFile details:"
file dns

echo -e "\nTesting binary..."
./dns --help

echo -e "\nTo run with root privileges: sudo ./dns"
