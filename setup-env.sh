#!/bin/bash

# GoHighLevel OAuth Setup Script
echo "🚀 Setting up GoHighLevel OAuth credentials..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    touch .env.local
fi

# Function to update or add environment variable
update_env_var() {
    local key=$1
    local value=$2
    
    if grep -q "^${key}=" .env.local; then
        # Update existing variable
        sed -i.bak "s|^${key}=.*|${key}=${value}|" .env.local
        echo "✅ Updated ${key}"
    else
        # Add new variable
        echo "${key}=${value}" >> .env.local
        echo "✅ Added ${key}"
    fi
}

# Update GHL credentials
update_env_var "GHL_CLIENT_ID" "687ac40ba336fa240d35a751-mfkwm6nm"
update_env_var "GHL_CLIENT_SECRET" "0450f3bf-176a-4482-bdfa-d5d3413f4d8d"
update_env_var "NEXT_PUBLIC_GHL_CLIENT_ID" "687ac40ba336fa240d35a751-mfkwm6nm"

# Set app URL if not already set
if ! grep -q "^NEXT_PUBLIC_APP_URL=" .env.local; then
    update_env_var "NEXT_PUBLIC_APP_URL" "https://www.getpromethean.com"
fi

echo ""
echo "✨ Environment variables updated successfully!"
echo ""
echo "Your new GoHighLevel credentials have been set:"
echo "  Client ID: 687ac40ba336fa240d35a751-mfkwm6nm"
echo "  Client Secret: 0450f3bf-176a-4482-bdfa-d5d3413f4d8d"
echo ""
echo "Next steps:"
echo "1. Restart your development server if running locally"
echo "2. If deployed, update your production environment variables"
echo "3. Try connecting to GoHighLevel again"
echo ""

# Clean up backup files
rm -f .env.local.bak 