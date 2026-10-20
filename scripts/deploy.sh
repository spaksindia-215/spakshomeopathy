#!/usr/bin/env bash
set -e

echo "=== 1. Pulling latest changes from GitHub ==="
git pull origin main

echo "=== 2. Installing dependencies ==="
npm ci --include=dev

echo "=== 3. Building Next.js application ==="
rm -rf .next
NODE_ENV=production npm run build

echo "=== 4. Reloading PM2 process ==="
pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs

echo "=== Deployment finished successfully! ==="
