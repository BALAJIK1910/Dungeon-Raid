#!/bin/bash

# Tech Warzone 2026 Backend — Quick Start Script
# This script sets up the backend locally or deploys to Firebase

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Tech Warzone 2026 Backend Setup ===${NC}\n"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${YELLOW}⚠️  Node.js 20+ required. Current: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check Firebase CLI
if ! command -v firebase &> /dev/null; then
  echo -e "${YELLOW}Firebase CLI not found. Installing...${NC}"
  npm install -g firebase-tools
fi
echo -e "${GREEN}✓ Firebase CLI installed${NC}"

# Choose action
echo -e "\n${BLUE}What would you like to do?${NC}"
echo "1. Setup local development (emulator)"
echo "2. Deploy to Firebase"
echo "3. Install dependencies only"

read -p "Enter choice (1-3): " choice

case $choice in
  1)
    echo -e "\n${BLUE}Setting up local development...${NC}"
    cd functions
    npm install
    cd ..
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo -e "${BLUE}Starting Firebase emulators...${NC}"
    firebase emulators:start
    ;;
  2)
    echo -e "\n${BLUE}Preparing for Firebase deployment...${NC}"
    firebase login
    firebase use --add
    cd functions
    npm install
    cd ..
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo -e "${BLUE}Ready to deploy. Run:${NC}"
    echo "  firebase deploy --only functions,firestore:rules,firestore:indexes"
    ;;
  3)
    echo -e "\n${BLUE}Installing dependencies...${NC}"
    cd functions
    npm install
    cd ..
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo -e "Run 'firebase emulators:start' to start local development"
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo -e "\n${GREEN}Setup complete!${NC}"
