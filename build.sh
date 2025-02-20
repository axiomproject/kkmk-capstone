#!/bin/bash

# Install dependencies
npm run install-all

# Build frontend
npm run build

# Copy frontend build to backend
cp -r frontend/dist backend/public
