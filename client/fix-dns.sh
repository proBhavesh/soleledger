#!/bin/bash

# Backup original resolv.conf if it doesn't exist
if [ ! -f /etc/resolv.conf.bak ]; then
  sudo cp /etc/resolv.conf /etc/resolv.conf.bak
fi

# Create a new resolv.conf with Google DNS
echo "Creating new resolv.conf with Google DNS..."
echo "nameserver 8.8.8.8
nameserver 8.8.4.4" | sudo tee /etc/resolv.conf > /dev/null

# Run the original command
echo "DNS configuration updated! Starting application..."
pnpm dev 