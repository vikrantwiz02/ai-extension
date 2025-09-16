#!/bin/bash

# Chrome Extension Development Helper Script

echo "🚀 Chrome Extension AI Assistant Development Helper"
echo "=================================================="

case "$1" in
  "build")
    echo "🔨 Building extension..."
    npm run build
    echo "✅ Build complete! Extension ready in 'dist' folder"
    echo "📝 To load in Chrome:"
    echo "   1. Open chrome://extensions/"
    echo "   2. Enable Developer mode"
    echo "   3. Click 'Load unpacked' and select the 'dist' folder"
    ;;
  "dev")
    echo "🔄 Starting development build..."
    npm run build
    echo "👀 Watching for changes... (Press Ctrl+C to stop)"
    echo "💡 After making changes, run './dev.sh build' to rebuild"
    ;;
  "clean")
    echo "🧹 Cleaning build directory..."
    rm -rf dist/
    echo "✅ Clean complete!"
    ;;
  "install")
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed!"
    ;;
  *)
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build   - Build the extension for production"
    echo "  dev     - Build and watch for changes"
    echo "  clean   - Clean the build directory"
    echo "  install - Install npm dependencies"
    echo ""
    echo "Example: ./dev.sh build"
    ;;
esac
