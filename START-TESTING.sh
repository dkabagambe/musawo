#!/bin/bash
# Start testing setup for S3 E2E tests

echo "🚀 Starting Musawo Testing Environment..."
echo ""
echo "Step 1: Building Next.js app..."
npm run build

echo ""
echo "Step 2: Starting server on http://localhost:3000..."
npm start
