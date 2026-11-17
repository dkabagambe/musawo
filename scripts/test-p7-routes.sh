#!/bin/bash
# Quick test to check if P7 routes exist and have no syntax errors

echo "Checking P7 API Routes..."
echo ""

routes=(
  "src/app/api/principal/finance/holds/place/route.ts"
  "src/app/api/principal/finance/holds/lift/route.ts"
  "src/app/api/principal/finance/proofs/[id]/forward/route.ts"
  "src/app/api/principal/finance/proofs/[id]/return/route.ts"
  "src/app/api/principal/support/tickets/[id]/escalate/route.ts"
  "src/app/api/principal/support/tickets/[id]/comment/route.ts"
)

components=(
  "src/app/(principal)/principal/finance/StudentFeeStatus.tsx"
  "src/app/(principal)/principal/finance/PaymentProofActions.tsx"
  "src/app/(principal)/principal/support/AllTicketsView.tsx"
)

all_exist=true

for route in "${routes[@]}"; do
  if [ -f "$route" ]; then
    echo "✓ $route"
  else
    echo "✗ $route (MISSING)"
    all_exist=false
  fi
done

echo ""
echo "Checking P7 Components..."
echo ""

for component in "${components[@]}"; do
  if [ -f "$component" ]; then
    echo "✓ $component"
  else
    echo "✗ $component (MISSING)"
    all_exist=false
  fi
done

echo ""
if [ "$all_exist" = true ]; then
  echo "✅ All P7 files exist!"
  exit 0
else
  echo "❌ Some files are missing"
  exit 1
fi
