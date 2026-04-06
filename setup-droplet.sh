#!/bin/bash
# Shannon - DigitalOcean Droplet Setup Script
# Run this after SSH'ing into a fresh Ubuntu 24.04 Droplet
# Usage: ssh root@<droplet-ip> 'bash -s' < setup-droplet.sh

set -euo pipefail

echo "=== Shannon Droplet Setup ==="

# 1. Install Docker
echo "[1/6] Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 2. Install Docker Compose plugin
echo "[2/6] Installing Docker Compose plugin..."
apt-get install -y docker-compose-plugin

# 3. Install Node.js 22 + pnpm (for CLI)
echo "[3/6] Installing Node.js 22 + pnpm..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs git
npm install -g pnpm@10.33.0

# 4. Clone Shannon
echo "[4/6] Cloning Shannon..."
git clone https://github.com/keygraph/shannon.git /opt/shannon
cd /opt/shannon

# 5. Create .env (user must fill in API key)
echo "[5/6] Creating .env template..."
cat > /opt/shannon/.env << 'EOF'
ANTHROPIC_API_KEY=your-key-here
EOF
echo "WARNING: Edit /opt/shannon/.env and add your real ANTHROPIC_API_KEY before running scans!"

# 6. Build worker image + start Temporal
echo "[6/6] Building Docker image and starting Temporal..."
docker build -t shannon-worker .
docker compose up -d

# Wait for Temporal to be ready
echo "Waiting for Temporal to become healthy..."
for i in $(seq 1 30); do
  if docker exec shannon-temporal temporal operator cluster health --address localhost:7233 2>/dev/null | grep -q SERVING; then
    echo "Temporal is SERVING!"
    break
  fi
  sleep 5
done

# Configure firewall
echo "Configuring firewall..."
ufw allow 22/tcp    # SSH
ufw allow 8233/tcp  # Temporal Web UI (optional, remove if not needed)
ufw --force enable

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit /opt/shannon/.env and set your ANTHROPIC_API_KEY"
echo "  2. Run a scan:"
echo "     cd /opt/shannon"
echo "     export SHANNON_LOCAL=1"
echo "     ./shannon start -u <target-url> -r <repo-path>"
echo ""
echo "Temporal Web UI: http://$(curl -s ifconfig.me):8233"
echo ""
