#!/bin/bash

cd /var/www/html || { echo "Error: Unable to navigate to /var/www/html"; exit 1; }

# Check if package.json exists
if ! find . -type f -name "package.json" | grep -q "package.json"; then
    echo "Error: package.json not found. Build skipped."
    exit 1
fi

# Setup Node.js
echo "Setting up Node.js environment..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install system dependencies
echo "Installing system dependencies..."
sudo yum install -y cairo-devel pango-devel libjpeg-turbo-devel giflib-devel

# Install AWS SDK and dependencies
echo "Installing AWS SDK and dependencies..."
sudo -u ec2-user npm install aws-sdk
sudo -u ec2-user npm install

# Install global dependencies
echo "Installing global dependencies..."
sudo npm install -g typescript
sudo npm install -g canvas  # For drawing capabilities
sudo npm install -g socket.io  # For real-time collaboration

# Fix permissions
echo "Setting up permissions..."
sudo chown -R ec2-user:ec2-user /var/www/html/node_modules

npm install aws-sdk

# Test DynamoDB connection
echo "Testing DynamoDB connection..."
node -e "
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: 'eu-west-2' });
dynamoDB.scan({ TableName: 'Whiteboards', Limit: 1 }).promise()
  .then(() => console.log('Successfully connected to DynamoDB'))
  .catch(err => {
    console.error('Failed to connect to DynamoDB:', err);
    process.exit(1);
  });
"

echo "Dependency installation completed successfully."
