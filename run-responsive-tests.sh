#!/bin/bash

# Comprehensive Responsive Testing Script
# Tests all pages across multiple viewport sizes

set -e

echo "========================================"
echo "RESPONSIVE DESIGN TEST SUITE"
echo "========================================"
echo ""
echo "Testing viewports:"
echo "  - Mobile (375px, 414px)"
echo "  - Tablet (768px, 1024px)"
echo "  - Desktop (1440px, 1920px, 2560px)"
echo "  - Browsers: Chrome, Firefox, Safari"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
fi

# Create test results directory
mkdir -p test-results

echo -e "${BLUE}Step 1: Starting development server...${NC}"
echo "This will take ~30-45 seconds..."

# Kill any existing dev servers
pkill -f "npm run dev" || true
sleep 2

# Start dev server
npm run dev > /tmp/dev-server.log 2>&1 &
DEV_PID=$!
echo "Dev server started (PID: $DEV_PID)"

# Wait for server to start
echo "Waiting for server to be ready..."
for i in {1..60}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}Server is ready!${NC}"
    break
  fi
  if [ $i -eq 60 ]; then
    echo -e "${RED}Server failed to start${NC}"
    cat /tmp/dev-server.log
    exit 1
  fi
  echo -n "."
  sleep 1
done

echo ""
echo -e "${BLUE}Step 2: Running Playwright tests...${NC}"
echo "This will test all pages across 7 viewport sizes"
echo ""

# Run tests
if npx playwright test \
  --config=playwright.responsive.config.ts \
  --reporter=html \
  --reporter=list; then
  
  TEST_RESULT=$?
  echo ""
  echo -e "${GREEN}========================================"
  echo "✅ ALL TESTS PASSED!"
  echo "========================================${NC}"
  echo ""
  echo "Test Results:"
  echo "  - HTML Report: playwright-report/index.html"
  echo "  - JSON Results: test-results/responsive-results.json"
  echo "  - JUnit XML: test-results/junit-responsive.xml"
  echo ""
  
else
  TEST_RESULT=$?
  echo ""
  echo -e "${RED}========================================"
  echo "❌ SOME TESTS FAILED"
  echo "========================================${NC}"
  echo ""
  echo "Check the HTML report for details:"
  echo "  - playwright-report/index.html"
  echo ""
fi

# Cleanup
echo ""
echo -e "${BLUE}Step 3: Cleaning up...${NC}"
kill $DEV_PID 2>/dev/null || true
sleep 2
echo -e "${GREEN}Done!${NC}"
echo ""

exit $TEST_RESULT
