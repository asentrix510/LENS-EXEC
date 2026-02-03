# LENS-EXEC - AR Code Analysis System

A web-based augmented reality application that uses computer vision and AI to scan physical code, analyze it, and provide real-time visual feedback through AR overlays.

## Features

- 📷 **Camera-based Code Scanning** - Automatically detect code in your physical environment
- 🤖 **AI-Powered Analysis** - Use multimodal LLMs to analyze code for errors and improvements
- 🥽 **Augmented Reality Overlays** - See analysis results overlaid directly on your code
- 🔍 **Real-time Processing** - Get instant feedback as you work
- 🛡️ **Security-First** - Optional code simulation with security risk detection
- 🌐 **Web-based** - No installation required, runs in modern browsers

## Technology Stack

- **Frontend**: TypeScript + Vite
- **AR**: WebXR Device API
- **3D Rendering**: Three.js
- **Computer Vision**: OpenCV.js
- **OCR**: Tesseract.js
- **AI Integration**: OpenAI GPT-4V / Anthropic Claude 3.5 / Google Gemini
- **Testing**: Jest + fast-check (property-based testing)

## Requirements

- Modern web browser with WebXR support (Chrome, Edge, Firefox)
- HTTPS connection (required for camera access)
- Device with camera (desktop webcam or mobile camera)
- Internet connection for AI analysis

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd lens-exec

# Install dependencies
npm install
```

### Development

```bash
# Start development server (with HTTPS for camera access)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint
```

### Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

### LLM API Setup

1. Get an API key from your preferred LLM provider:
   - [OpenAI](https://platform.openai.com/api-keys) for GPT-4V
   - [Anthropic](https://console.anthropic.com/) for Claude 3.5
   - [Google AI](https://ai.google.dev/) for Gemini

2. Configure the API key in your environment or application settings

### Camera Settings

The application will automatically request camera permissions and use optimal settings for code detection. You can customize camera preferences in the system configuration.

## Usage

1. **Grant Permissions**: Allow camera access when prompted
2. **Start Scanning**: Click the scan button to begin code detection
3. **Position Code**: Point your camera at physical code (printed or on screen)
4. **View Analysis**: See AI-powered analysis overlaid on your code
5. **Interact**: Toggle different types of feedback (errors, suggestions, simulation)

## Architecture

The system follows a modular architecture:

- **ARSystem**: Main controller orchestrating all components
- **CameraManager**: Handles camera access and video stream
- **ComputerVisionModule**: Detects code regions using OpenCV.js
- **OCREngine**: Extracts text from detected regions using Tesseract.js
- **LLMIntegration**: Analyzes code using multimodal language models
- **WebXRSessionManager**: Manages AR session and tracking
- **OverlayRenderer**: Renders visual feedback in AR space
- **UIController**: Manages user interface and controls

## Testing

The project uses a comprehensive testing strategy:

- **Unit Tests**: Test individual components and functions
- **Property-Based Tests**: Validate universal properties using fast-check
- **Integration Tests**: Test complete workflows and component interactions

```bash
# Run all tests
npm test

# Run specific test file
npm test -- CameraManager.test.ts

# Run tests with coverage
npm test -- --coverage
```

## Browser Support

- Chrome 79+ (recommended)
- Edge 79+
- Firefox 98+
- Safari 15.4+ (limited WebXR support)

## Security

- HTTPS required for camera access and WebXR features
- Code simulation includes security risk detection
- No code is stored permanently - all processing is session-based
- API keys should be properly secured and not exposed in client code

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Troubleshooting

### Camera Access Issues
- Ensure you're using HTTPS (required for camera access)
- Check browser permissions for camera access
- Try refreshing the page if camera fails to initialize

### WebXR Not Working
- Verify your browser supports WebXR
- Some features may fall back to 2D overlay mode
- Check device compatibility for AR features

### Performance Issues
- Close other applications using the camera
- Reduce camera resolution in settings if needed
- Ensure good lighting for better code detection

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Open an issue on the project repository