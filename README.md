# DNS Manager

A simple tool to easily manage your system's DNS settings on Linux.

## Features

- Set DNS to Cloudflare (1.1.1.1) with one click
- Configure custom DNS servers
- Backup and restore original DNS settings
- Monitor DNS configuration changes
- Desktop integration for easy access
- Terminal and GUI friendly

## Installation

### Prerequisites

- Ubuntu or another Debian-based Linux distribution
- Bun.js runtime (for development)
- PolicyKit (for privilege elevation)

### Building from Source

1. Clone this repository:
   ```
   git clone <repository-url>
   cd tool
   ```

2. Build the application:
   ```
   chmod +x build.sh
   ./build.sh
   ```
   This creates an executable binary called `dns`.

3. Install desktop integration:
   ```
   chmod +x install-desktop.sh
   ./install-desktop.sh
   ```
   This creates a desktop entry so you can launch DNS Manager from your applications menu.

## Usage

### Desktop Application (Recommended)

After running the installation script, you can find "DNS Manager" in your applications menu:

1. Open your applications menu
2. Search for "DNS Manager"
3. Click on the icon to launch

The application will automatically request root privileges using PolicyKit.

### Command Line Usage

For terminal users, you can run DNS Manager directly:

```
sudo ./dns
```

Or use command-line options:
```
sudo ./dns set           # Set DNS to Cloudflare (1.1.1.1)
sudo ./dns set 8.8.8.8   # Set DNS to Google DNS
sudo ./dns restore       # Restore original settings
sudo ./dns status        # Show current DNS configuration
sudo ./dns watch         # Watch for changes to resolv.conf
```

### Interactive Menu

When launched without command-line arguments, DNS Manager shows an interactive menu:

1. Set DNS to Cloudflare (1.1.1.1)
2. Set DNS to custom IP
3. Restore original DNS settings
4. Show current DNS configuration
5. Watch for changes to resolv.conf
0. Exit

## Troubleshooting

### Terminal Not Visible

If you click on the DNS Manager icon but don't see a terminal window:

1. Check that your desktop environment supports the "Terminal=true" option in .desktop files
2. Try launching from the terminal directly with `sudo ./dns`
3. Make sure PolicyKit is installed: `sudo apt install policykit-1`

### Permission Denied

If you get permission errors:

1. Make sure the binary is executable: `chmod +x dns`
2. Use sudo: `sudo ./dns`
3. Install PolicyKit: `sudo apt install policykit-1`

### Desktop Entry Not Working

If the DNS Manager doesn't appear in your applications menu:

1. Update the desktop database: `update-desktop-database ~/.local/share/applications/`
2. Try logging out and back in
3. Check for errors in the .desktop file: `desktop-file-validate ~/.local/share/applications/dns-manager.desktop`

## Uninstalling

To remove the desktop integration:
```
rm ~/.local/share/applications/dns-manager.desktop
update-desktop-database ~/.local/share/applications/
```

To completely remove DNS Manager, delete the entire tool directory.

## License

This project is open-source software.
