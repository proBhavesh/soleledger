#!/bin/bash

# Method 1: Update resolv.conf directly
echo "Updating resolv.conf with Google DNS..."
echo "nameserver 8.8.8.8
nameserver 8.8.4.4" | sudo tee /etc/resolv.conf > /dev/null

# Method 2: Try systemd-resolved if available
if command -v systemd-resolve &> /dev/null; then
  echo "Configuring systemd-resolved..."
  sudo systemd-resolve --set-dns=8.8.8.8 --set-dns=8.8.4.4 --interface=eth0
fi

# Method 3: Try wsl.conf approach
echo "Creating wsl.conf with DNS settings..."
echo "[network]
generateResolvConf = false" | sudo tee /etc/wsl.conf > /dev/null

echo "DNS configuration updated! You may need to restart your WSL session for changes to take effect."
echo "Try running 'wsl --shutdown' from Windows PowerShell and then restart WSL."

# Test DNS resolution
echo "Testing DNS resolution..."
ping -c 1 github.com || echo "DNS resolution still failing. Please restart WSL." 