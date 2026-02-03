# LENS-EXEC Deployment Guide

## Prerequisites

### Browser Requirements
- **Chrome/Edge**: Version 90+ (recommended for WebXR support)
- **Firefox**: Version 88+ (limited WebXR support)
- **Safari**: Version 14+ (no WebXR support, fallback mode only)

### Device Requirements
- **Camera**: Rear-facing camera preferred for code scanning
- **Memory**: Minimum 4GB RAM recommended
- **Network**: Stable internet connection for LLM API calls

### HTTPS Requirement
- **Critical**: Application MUST be served over HTTPS for camera access
- **Development**: Use `localhost` for local development
- **Production**: Valid SSL certificate required

## Environment Configuration

### Required Environment Variables
```bash
# LLM Configuration
LLM_API_KEY=your_api_key_here
LLM_MODEL=gpt-4-vision-preview  # or claude-3-5-sonnet-20241022, gemini-1.5-pro
LLM_MAX_TOKENS=1000
LLM_TEMPERATURE=0.1
LLM_TIMEOUT=30000

# Camera Configuration (optional)
CAMERA_WIDTH=1280
CAMERA_HEIGHT=720
CAMERA_FRAME_RATE=30
CAMERA_FACING_MODE=environment

# Feature Flags (optional)
ENABLE_SIMULATION=false
DEBUG_MODE=false
```

### Supported LLM Providers
1. **OpenAI** (Recommended)
   - Models: `gpt-4-vision-preview`, `gpt-4o`
   - API Key: Get from https://platform.openai.com/

2. **Anthropic**
   - Models: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`
   - API Key: Get from https://console.anthropic.com/

3. **Google**
   - Models: `gemini-1.5-pro`, `gemini-1.5-flash`
   - API Key: Get from https://makersuite.google.com/

## Build and Deployment

### Development Build
```bash
npm install
npm run dev
```

### Production Build
```bash
npm install
npm run build
npm run preview  # Test production build locally
```

### Deployment Options

#### 1. Static Hosting (Recommended)
- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy --prod`
- **GitHub Pages**: Configure with GitHub Actions
- **AWS S3 + CloudFront**: Static website hosting

#### 2. Server Hosting
- **Node.js**: Use `npm run preview` with reverse proxy
- **Docker**: Build container with Nginx
- **CDN**: Deploy built files to any CDN

## Performance Optimization

### Production Optimizations
- Enable gzip/brotli compression
- Configure proper caching headers
- Use CDN for static assets
- Optimize images and fonts

### Runtime Performance
- Target 30 FPS for real-time processing
- Limit concurrent LLM requests (max 3)
- Monitor memory usage (< 500MB recommended)
- Implement request queuing for offline scenarios

## Security Considerations

### API Key Security
- **Never** commit API keys to version control
- Use environment variables or secure key management
- Implement rate limiting for API calls
- Consider server-side proxy for API calls

### Camera Privacy
- Request camera permissions explicitly
- Show clear privacy policy
- Allow users to deny camera access
- Implement fallback modes

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  media-src 'self' blob:;
  connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com;
  worker-src 'self' blob:;
">
```

## Browser Compatibility Testing

### WebXR Support
- Test AR features on supported devices
- Verify fallback mode on unsupported browsers
- Test camera access across different browsers

### Performance Testing
- Test on various device specifications
- Monitor frame rate during extended use
- Verify memory usage doesn't exceed limits

## Monitoring and Analytics

### Error Tracking
- Implement error reporting (e.g., Sentry)
- Monitor API failure rates
- Track camera permission denials

### Performance Monitoring
- Monitor frame rate metrics
- Track API response times
- Monitor memory usage patterns

### User Analytics
- Track feature usage
- Monitor scanning success rates
- Analyze user interaction patterns

## Troubleshooting

### Common Issues

1. **Camera Access Denied**
   - Ensure HTTPS is enabled
   - Check browser permissions
   - Verify camera is not in use by other apps

2. **LLM API Errors**
   - Verify API key is valid
   - Check rate limits
   - Monitor network connectivity

3. **Performance Issues**
   - Reduce camera resolution
   - Limit concurrent processing
   - Clear browser cache

4. **WebXR Not Working**
   - Check browser support
   - Verify device compatibility
   - Use fallback mode

### Debug Mode
Enable debug mode for detailed logging:
```bash
DEBUG_MODE=true npm run dev
```

## Support and Maintenance

### Regular Updates
- Update dependencies monthly
- Monitor security advisories
- Test with latest browser versions

### API Monitoring
- Monitor LLM provider status
- Track API usage and costs
- Implement fallback providers

### User Feedback
- Collect user feedback on accuracy
- Monitor error reports
- Track feature requests

## Compliance and Legal

### Privacy Compliance
- Implement privacy policy
- Handle camera data appropriately
- Comply with GDPR/CCPA if applicable

### Terms of Service
- Define acceptable use
- Clarify data handling
- Set usage limitations

### Third-Party Services
- Review LLM provider terms
- Understand data processing policies
- Implement appropriate disclaimers