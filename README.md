# DLP Identity Verification Frontend

A modern Next.js application with shadcn/ui components for secure liveness detection and identity verification.

## Features

- 🎥 **Real-time Liveness Detection** - WebSocket connection to liveness service
- 📱 **Camera Integration** - Access user camera for face detection
- 🆔 **ID Card Upload** - Drag & drop ID card image upload
- 🔐 **Multi-Model Verification** - Uses VGG-Face, Facenet512, and ArcFace consensus
- ✨ **Beautiful UI** - Modern design with Framer Motion animations
- 🎯 **Success Animations** - Engaging feedback with glow effects and pulse animations
- 📊 **Real-time Progress** - Live progress tracking during verification
- 🚨 **Error Handling** - Comprehensive error states and recovery

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Modern component library
- **Framer Motion** - Smooth animations
- **Lucide React** - Beautiful icons
- **WebSocket** - Real-time communication

## Prerequisites

Make sure you have the following services running:

1. **Liveness Service** - Running on `http://localhost:8000`
   - WebSocket endpoint: `ws://localhost:8000/stream-liveness`
   
2. **Verification Service** - Running on `http://localhost:8001`
   - REST endpoint: `http://localhost:8001/session-verify`

## Installation

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## Usage Flow

### 1. Camera Access
- Click "Start Camera" to request camera permissions
- WebSocket connection established to liveness service

### 2. Liveness Detection
- Look at camera and move naturally
- Real-time progress bar shows detection status
- Need 5 consecutive "real" frames for verification
- Success triggers automatic progression to next step

### 3. ID Card Upload
- Drag & drop or click to upload ID card image
- Supports common image formats (JPG, PNG, etc.)
- Preview shows selected file name

### 4. Identity Verification
- Combines liveness session with ID card
- Multi-model consensus verification
- Real-time processing with loading indicators

### 5. Results
- **Success**: Animated success screen with verification details
- **Failure**: Clear error message with retry option
- **Metrics**: Shows confidence scores, processing time, model used

## Configuration

### Service Endpoints

Update these URLs in `components/verification-app.tsx` if your services run on different ports:

```typescript
// Liveness WebSocket
const wsUrl = `ws://localhost:8000/stream-liveness`

// Verification API
const response = await fetch('http://localhost:8001/session-verify', {
  method: 'POST',
  body: formData,
})
```

### Camera Settings

Modify camera constraints in the `startCamera` function:

```typescript
const stream = await navigator.mediaDevices.getUserMedia({ 
  video: { 
    width: 640, 
    height: 480,
    facingMode: 'user'  // 'environment' for back camera
  } 
})
```

## Customization

### Styling
- Modify `tailwind.config.js` for custom colors/animations
- Update `app/globals.css` for global styles
- Components use CSS variables for theming

### Animations
- Success pulse: `animate-success-pulse`
- Verification glow: `animate-verification-glow`
- Custom animations in `tailwind.config.js`

### Thresholds
- Liveness frames required: Change `consecutiveFrames < 5`
- Progress calculation: Modify `(data.consecutive_real || 0) * 20`

## Development

### Project Structure
```
frontend/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── ui/               # shadcn/ui components
│   └── verification-app.tsx  # Main app component
├── hooks/
│   └── use-toast.ts      # Toast notifications
├── lib/
│   └── utils.ts          # Utility functions
└── package.json
```

### Key Components

- **VerificationApp** - Main application logic and state management
- **Button, Card, Progress** - shadcn/ui components
- **Toaster** - Toast notification system

### State Management

The app uses React hooks for state:
- `step` - Current verification step
- `sessionId` - Liveness session identifier
- `idCardFile` - Uploaded ID card file
- `verificationResult` - Final verification outcome

## Troubleshooting

### Camera Issues
- Ensure HTTPS or localhost for camera access
- Check browser permissions
- Verify camera is not in use by other applications

### WebSocket Connection
- Confirm liveness service is running on port 8000
- Check browser console for connection errors
- Verify WebSocket endpoint URL

### Verification Failures
- Ensure verification service is running on port 8001
- Check network requests in browser dev tools
- Verify session ID is properly passed

### Build Issues
- Run `npm install` to ensure all dependencies
- Clear `.next` folder and rebuild
- Check Node.js version compatibility

## Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

3. **Environment Variables**
   Create `.env.local` for production URLs:
   ```
   NEXT_PUBLIC_LIVENESS_WS_URL=wss://your-domain.com/stream-liveness
   NEXT_PUBLIC_VERIFICATION_API_URL=https://your-domain.com/session-verify
   ```

## Security Considerations

- Camera access requires HTTPS in production
- WebSocket connections should use WSS in production
- Implement proper CORS policies on backend services
- Consider rate limiting for API endpoints
- Validate file uploads on both client and server

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

Requires modern browser features:
- WebRTC for camera access
- WebSocket for real-time communication
- File API for image uploads
