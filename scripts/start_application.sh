#!/bin/bash

cd /var/www/html || { echo "Error: Unable to navigate to /var/www/html"; exit 1; }
npm install ioredis
npm install

# Ensure proper permissions
sudo chown -R ec2-user:ec2-user /var/www/html

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing PM2..."
    sudo npm install -g pm2
else
    echo "PM2 is already installed."
fi

if sudo pm2 list | grep -q "whiteboard"; then
    # Check if the process is actually online
    if sudo pm2 list | grep "whiteboard" | grep -q "online"; then
        echo "Whiteboard application is running and online."
    else
        echo "Whiteboard application exists but is not online. Restarting..."
        sudo pm2 delete whiteboard
        sudo pm2 start server.js --name whiteboard --env PORT=80
    fi
else
    echo "Starting whiteboard application..."
    sudo pm2 start server.js --name whiteboard --env PORT=80
fi

# Then start your application

exit 0