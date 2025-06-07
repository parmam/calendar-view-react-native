#!/bin/bash

# Helper script for managing updates in Calendar View App
# Date: $(date +%Y-%m-%d)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to show help
function show_help {
  echo -e "${BLUE}===== Update Scripts for Calendar View App =====${NC}"
  echo ""
  echo "Usage: ./update-scripts.sh [COMMAND] [OPTIONS]"
  echo ""
  echo "Available commands:"
  echo "  update:dev      - Publish update to development channel"
  echo "  update:staging  - Publish update to staging channel"
  echo "  update:prod     - Publish update to production channel"
  echo "  rollout:dev     - Complete a progressive rollout for development"
  echo "  rollout:staging - Complete a progressive rollout for staging"
  echo "  rollout:prod    - Complete a progressive rollout for production"
  echo "  rollback:dev    - Create and publish a rollback update for development"
  echo "  rollback:staging - Create and publish a rollback update for staging"
  echo "  rollback:prod   - Create and publish a rollback update for production"
  echo "  status          - View update status"
  echo "  help            - Show this help"
  echo ""
  echo "Options:"
  echo "  --message, -m   - Message for the update"
  echo "  --id, -i        - Update ID (for rollout, rollback)"
  echo "  --percent, -p   - Percentage for progressive rollout (1-100)"
  echo ""
  echo "Examples:"
  echo "  ./update-scripts.sh update:staging -m \"New feature X\""
  echo "  ./update-scripts.sh update:prod -m \"[v1.0.1] Calendar fix\" -p 20"
  echo "  ./update-scripts.sh rollout:prod -i abc123 -p 100"
  echo "  ./update-scripts.sh rollback:staging -i abc123 -m \"Rollback to stable version\""
  echo ""
}

# Function to publish update
function publish_update {
  local channel=$1
  local message=$2
  local rollout_percent=$3
  
  echo -e "${BLUE}Publishing update to channel: ${GREEN}$channel${NC}"
  
  # Message validation
  if [ -z "$message" ]; then
    echo -e "${RED}Error: A message is required for the update.${NC}"
    echo "Use -m \"Your message here\""
    exit 1
  fi
  
  # Base command
  local cmd="eas update --channel $channel --message \"$message\""
  
  # Add rollout percentage if specified
  if [ ! -z "$rollout_percent" ]; then
    if [ "$rollout_percent" -gt 0 ] && [ "$rollout_percent" -le 100 ]; then
      cmd="$cmd --rollout-percentage $rollout_percent"
      echo -e "${YELLOW}Setting progressive rollout: ${rollout_percent}%${NC}"
    else
      echo -e "${RED}Error: Percentage must be between 1 and 100${NC}"
      exit 1
    fi
  fi
  
  # Execute command
  echo "Executing: $cmd"
  eval $cmd
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Update published successfully!${NC}"
  else
    echo -e "${RED}Error publishing update.${NC}"
    exit 1
  fi
}

# Function to complete a rollout
function complete_rollout {
  local update_id=$1
  local percent=$2
  
  # ID validation
  if [ -z "$update_id" ]; then
    echo -e "${RED}Error: An update ID is required.${NC}"
    echo "Use -i <UPDATE-ID>"
    exit 1
  fi
  
  # Percentage validation
  if [ -z "$percent" ]; then
    percent=100
  fi
  
  if [ "$percent" -gt 0 ] && [ "$percent" -le 100 ]; then
    echo -e "${BLUE}Completing rollout for update: ${GREEN}$update_id${NC}"
    echo -e "${YELLOW}Percentage: ${percent}%${NC}"
    
    # Execute command
    eas update:rollout --id $update_id --percentage $percent
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}Rollout updated successfully!${NC}"
    else
      echo -e "${RED}Error updating rollout.${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Error: Percentage must be between 1 and 100${NC}"
    exit 1
  fi
}

# Function to create and publish a rollback
function create_rollback {
  local update_id=$1
  local message=$2
  local channel=$3
  
  # ID validation
  if [ -z "$update_id" ]; then
    echo -e "${RED}Error: A stable update ID is required for rollback.${NC}"
    echo "Use -i <STABLE-UPDATE-ID>"
    exit 1
  fi
  
  # Message validation
  if [ -z "$message" ]; then
    message="Rollback to stable version ($(date +%Y-%m-%d))"
  fi
  
  local branch_name="rollback-$channel-$(date +%Y%m%d)"
  
  echo -e "${BLUE}Creating rollback branch: ${GREEN}$branch_name${NC}"
  
  # Create branch for rollback
  eas branch:create $branch_name --from $update_id
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Rollback branch created.${NC}"
    
    # Publish rollback update
    echo -e "${BLUE}Publishing rollback update...${NC}"
    eas update --branch $branch_name --message "$message" --channel $channel
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}Rollback published successfully!${NC}"
    else
      echo -e "${RED}Error publishing rollback.${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Error creating rollback branch.${NC}"
    exit 1
  fi
}

# Function to view update status
function show_status {
  echo -e "${BLUE}Getting update status...${NC}"
  
  echo -e "${YELLOW}Last 5 updates:${NC}"
  eas update:list --limit 5
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Error getting updates.${NC}"
    exit 1
  fi
}

# Argument parsing
COMMAND=""
MESSAGE=""
UPDATE_ID=""
PERCENT=""
CHANNEL=""

# Get command
if [ $# -gt 0 ]; then
  COMMAND=$1
  shift
else
  show_help
  exit 0
fi

# Parse options
while [[ $# -gt 0 ]]; do
  key="$1"
  
  case $key in
    -m|--message)
      MESSAGE="$2"
      shift
      shift
      ;;
    -i|--id)
      UPDATE_ID="$2"
      shift
      shift
      ;;
    -p|--percent)
      PERCENT="$2"
      shift
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $key${NC}"
      show_help
      exit 1
      ;;
  esac
done

# Execute corresponding command
case $COMMAND in
  update:dev)
    publish_update "development" "$MESSAGE" "$PERCENT"
    ;;
  update:staging)
    publish_update "staging" "$MESSAGE" "$PERCENT"
    ;;
  update:prod)
    publish_update "production" "$MESSAGE" "$PERCENT"
    ;;
  rollout:dev)
    complete_rollout "$UPDATE_ID" "$PERCENT"
    ;;
  rollout:staging)
    complete_rollout "$UPDATE_ID" "$PERCENT"
    ;;
  rollout:prod)
    complete_rollout "$UPDATE_ID" "$PERCENT"
    ;;
  rollback:dev)
    create_rollback "$UPDATE_ID" "$MESSAGE" "development"
    ;;
  rollback:staging)
    create_rollback "$UPDATE_ID" "$MESSAGE" "staging"
    ;;
  rollback:prod)
    create_rollback "$UPDATE_ID" "$MESSAGE" "production"
    ;;
  status)
    show_status
    ;;
  help)
    show_help
    ;;
  *)
    echo -e "${RED}Unknown command: $COMMAND${NC}"
    show_help
    exit 1
    ;;
esac

exit 0 