#!/bin/bash

# Get the absolute path to the dns executable
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DNS_PATH="${SCRIPT_DIR}/dns"
DESKTOP_FILE="${SCRIPT_DIR}/dns-manager.desktop"

# Update the desktop file with the correct path
sed -i "s|Exec=pkexec .*|Exec=pkexec ${DNS_PATH}|g" "${DESKTOP_FILE}"

# Copy to applications folder
mkdir -p ~/.local/share/applications/
cp "${DESKTOP_FILE}" ~/.local/share/applications/

echo "Desktop entry installed. You should now see DNS Manager in your applications menu."
echo "You may need to log out and back in for the changes to take effect."

# Make the desktop file executable
chmod +x ~/.local/share/applications/dns-manager.desktop

# Update desktop database
update-desktop-database ~/.local/share/applications/ 2>/dev/null || true
