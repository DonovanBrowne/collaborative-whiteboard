#!/bin/bash

# Update system packages
sudo yum update -y

# Install Docker
sudo yum install -y docker

# Start Docker service
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker

# Pull the official Redis Docker image
sudo docker pull redis

# Run Redis container on port 6379
sudo docker run --name redis -p 6379:6379 -d redis

# Enable the Docker container to restart automatically
sudo docker update --restart always redis

echo "Docker and Redis installation complete, Redis is running on port 6379."
exit 0
