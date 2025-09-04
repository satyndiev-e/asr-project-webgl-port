# ASR - WebGL Educational Graphics Engine
A progressive WebGL-based graphics engine designed for educational purposes, ported from the original OpenGL implementation to provide cross-platform compatibility and simplified setup for computer graphics courses.

OpenGL engine [link](https://github.com/toksaitov/asr-project).

## Overview
ASR (AUCA Simple Renderer) is a step-by-step graphics engine that introduces fundamental 3D graphics concepts through incremental versions. Each version builds upon the previous one, making it easy for learning computer graphics programming without complex development environment setup.

## ASR 1.0 - Basic 2D Graphics
  - Simple 2D geometry rendering
  - Basic vertex and fragment shaders
  - Foundation for understanding graphics pipeline

## ASR 1.1 - 3D Graphics
  - 3D geometry support with proper depth testing
  - Index buffer implementation for efficient rendering
  - Keyboard input handling for interactive applications
  - Matrix transformations (model, view, projection)
  - Camera controls and 3D navigation

## ASR 1.2 - Texture Support
  - Texture loading and binding
  - UV coordinate mapping
  - Base64 image encoding for serverless operation

## ASR 1.3 - Advanced Rendering
  - Instancing for efficient rendering
  - Complete lighting system implementation
  - Material property system

## ASR 2.0 - Complete Game Demonstration
  - DOOM-style game implementation
  - Demonstrates practical application of all engine features

## Dependencies
**gl-matrix**: Vector and matrix math library loaded from Cloudflare CDN
**Modern Web Browser**: Chrome, Firefox, Safari, or Edge with WebGL support

## Setup and Usage
### Version 1.0 - 1.3
  1. Clone the repository to your local environment
  2. Open your desired version folder
  3. In HTML file change the test file name for the name you want to run
  4. Open the HTML file directly in your web browser
  5. No server setup required - works with file:// protocol

### Version 2.0
  1. Clone the repository to your local environment
  2. Install 'Live Server' from Extensions if you are using VS Code. <br/>For other editors, you'll need to run a local server (e.g., npm install -g http-server, then run http-server in your project directory).
  3. Run the HTML file
<img width="1425" height="796" alt="Screenshot 2025-09-04 at 21 02 27" src="https://github.com/user-attachments/assets/279dc9a5-b044-4933-81ac-de269a8f31a9" />

## Debugging Tips
  1. Browser Developer Tools
  2. Browser Extension Spector.js

## Summary
This WebGL implementation is based on the original OpenGL ASR Engine, adapted to provide better accessibility for educational environments while maintaining the core learning objectives and progressive structure that made the original effective for graphics programming education.






