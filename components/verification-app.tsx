'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RiSecurePaymentFill } from 'react-icons/ri'
import { Camera, Upload, CheckCircle, AlertCircle, Loader2, Eye, FileImage, LoaderIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'

const BASE_URL = 'https://liveness-service-999275183993.us-central1.run.app'

interface LivenessResult {
  status: string
  message: string
  session_id?: string
  best_frame?: string
  best_frame_confidence?: number
  verification_result?: any
  consecutive_real?: number
  error?: string
}

interface VerificationResult {
  verified: boolean
  recognito_result: string
  session_id: string
  request_id: string
  performance: {
    total_duration: number
    validation_duration: number
    verification_duration: number
  }
  messages: {
    db: string
    liveness_validation: string
    id_card_validation: string
    portrait_extraction: string
    verification: string
  }
  recognito_response?: any
  message: string
}

type VerificationStep = 'camera' | 'liveness' | 'upload' | 'verifying' | 'success' | 'error'

export default function VerificationApp() {
  const [step, setStep] = useState<VerificationStep>('camera')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [idCardFile, setIdCardFile] = useState<File | null>(null)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [livenessProgress, setLivenessProgress] = useState(0)
  const [consecutiveFrames, setConsecutiveFrames] = useState(0)
  const [videoReady, setVideoReady] = useState(false)
  const [wsReady, setWsReady] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  const { toast } = useToast()

  // WebSocket connection to liveness service
  const connectWebSocket = useCallback(() => {
    // const wsUrl = `wss://0da7bca81cc9.ngrok-free.app/stream-liveness`
    const wsUrl = `wss://${BASE_URL.replace('https://', '')}/stream-liveness`
    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onopen = () => {
      console.log('WebSocket connected to:', wsUrl)
      setWsReady(true)
      // toast({
      //   title: "Camera Connected",
      //   description: "Ready for liveness detection",
      // })
    }

    wsRef.current.onmessage = (event) => {
      try {
        const data: LivenessResult = JSON.parse(event.data)
        console.log('WebSocket message:', data)

        if (data.status === 'CONNECTED') {
          setStep('liveness')
          // toast({
          //   title: "Camera Connected",
          //   description: "Ready for liveness detection",
          // })
        } else if (data.status === 'ANALYZING') {
          setConsecutiveFrames(data.consecutive_real || 0)
          setLivenessProgress(Math.min((data.consecutive_real || 0) * 20, 100))
        } else if (data.status === 'VERIFIED') {
          setSessionId(data.session_id || null)
          if (!wsRef.current) return
          wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data)
            console.log('📡 WS message received:', data)
            
            if (data.status === 'SUCCESS') {
              console.log('✅ Liveness SUCCESS - session_id:', data.session_id)
              setSessionId(data.session_id || null)
              setStep('upload')
              stopCamera()
              toast({
                title: "Liveness Check Passed! 👤",
                description: "Face verification successful. Please upload your ID card to complete verification.",
              })
              // toast removed
            } else if (data.status === 'TIMEOUT' || data.error) {
              console.log('❌ Liveness failed:', data.message || data.error)
              setError(data.message || data.error || 'Liveness detection failed')
              setStep('error')
            }
          }
        } else if (data.status === 'TIMEOUT' || data.error) {
          setError(data.message || data.error || 'Liveness detection failed')
          setStep('error')
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    }

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error)
      setWsReady(false)
      setError('Connection to liveness service failed')
      setStep('error')
    }

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected')
      setWsReady(false)
    }
  }, [])

  // Start camera
  const startCamera = useCallback(async () => {
    console.log('🚀 startCamera function called!')
    // Close any existing WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      setWsReady(false)
    }
    try {
      console.log('🎥 Requesting camera access...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      })
      
      console.log('✅ Camera access granted, stream:', stream)
      console.log('📊 Stream tracks:', stream.getTracks().map(track => ({
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState,
        label: track.label
      })))
      
      if (videoRef.current) {
        console.log('📺 Setting up video stream...')
        console.log('📺 videoRef.current exists:', !!videoRef.current)
        videoRef.current.srcObject = stream
        streamRef.current = stream
        console.log('📺 streamRef.current set to:', !!streamRef.current)
        
        // Clear any existing timers
        if (intervalRef.current) {
          clearTimeout(intervalRef.current)
        }
        
        // Set up video ready detection
        const handleVideoReady = () => {
          console.log('✅ Video is ready to play')
          setVideoReady(true)
        }
        
        // Add multiple event listeners for debugging
        videoRef.current.onloadstart = () => console.log('🔄 Video loadstart')
        videoRef.current.onloadeddata = () => console.log('📊 Video loadeddata')
        videoRef.current.oncanplay = () => {
          console.log('▶️ Video canplay event')
          handleVideoReady()
        }
        videoRef.current.oncanplaythrough = () => console.log('🎬 Video canplaythrough')
        videoRef.current.onplaying = () => console.log('🎥 Video playing event')
        videoRef.current.onloadedmetadata = () => {
          console.log('📋 Video metadata loaded, dimensions:', {
            videoWidth: videoRef.current?.videoWidth,
            videoHeight: videoRef.current?.videoHeight,
            duration: videoRef.current?.duration
          })
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                console.log('✅ Video playing successfully')
                setVideoReady(true)
              })
              .catch((error) => {
                console.error('❌ Video play failed:', error)
                // Still set ready even if autoplay fails
                setVideoReady(true)
              })
          }
        }
        
        // Add error handler
        videoRef.current.onerror = (e) => {
          console.error('❌ Video error:', e)
          console.error('❌ Video error details:', videoRef.current?.error)
        }
        
        // Fallback: set ready after a reasonable delay
        const fallbackTimer = setTimeout(() => {
          console.log('⏰ Fallback: Setting video ready after timeout')
          setVideoReady(true)
        }, 3000)
        
        // Store timer reference for cleanup
        intervalRef.current = fallbackTimer
      }
      
      // Connect WebSocket after camera is set up
      connectWebSocket()
    } catch (err) {
      console.error('❌ Camera access denied:', err)
      setError('Camera access is required for liveness detection')
      setStep('error')
    }
  }, [connectWebSocket])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: any) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setVideoReady(false)
  }, [])

  // Start liveness detection
  const startLivenessDetection = useCallback(() => {
    if (!wsRef.current || !videoRef.current || !canvasRef.current) return

    console.log('Starting liveness detection, sending start_verification')
    // Send start verification command
    wsRef.current.send(JSON.stringify({ command: 'start_verification' }))

    // Start sending frames
    intervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || !wsRef.current) return

      console.log('Attempting to send frame')
      const canvas = canvasRef.current
      const video = videoRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      canvas.toBlob((blob) => {
        if (!blob || !wsRef.current) return

        console.log('Blob created, size:', blob.size)
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          console.log('Base64 length:', base64.length, 'readyState:', wsRef.current?.readyState)
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ frame: base64 }))
            console.log('Frame sent to WebSocket')
          }
        }
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.8)
    }, 200) // Send frame every 200ms
  }, [])

  // Handle ID card upload
  const handleIdCardUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIdCardFile(file)
    }
  }, [])

  // Submit verification
  const submitVerification = useCallback(async () => {
    console.log('🔍 Submit verification called')
    console.log('🔍 sessionId:', sessionId)
    console.log('🔍 idCardFile:', idCardFile)
    
    if (!sessionId || !idCardFile) {
      console.log('❌ Missing sessionId or idCardFile')
      return
    }

    setStep('verifying')
    
    try {
      const formData = new FormData()
      formData.append('session_id', sessionId)
      formData.append('id_card', idCardFile)

      console.log(`📡 Fetching to ${BASE_URL}/session-verify`)
      const response = await fetch(`${BASE_URL}/session-verify`, {
        method: 'POST',
        body: formData,
      })

      console.log('📡 Response status:', response.status)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result: VerificationResult = await response.json()
      console.log('📡 Response result:', result)

      if (result.verified) {
        setVerificationResult(result)
        setStep('success')
        toast({
          title: "🎉 Identity Verification Complete!",
          description: `${result.message} (${result.recognito_result})`,
          duration: 6000, // Show for 6 seconds
        })
      } else {
        setError(result.message || 'Verification failed')
        setStep('error')
      }
    } catch (err) {
      console.error('❌ Verification error:', err)
      setError('Failed to verify identity')
      setStep('error')
    }
  }, [sessionId, idCardFile, toast])

  // Reset verification
  const resetVerification = useCallback(() => {
    setStep('camera')
    setSessionId(null)
    setIdCardFile(null)
    setVerificationResult(null)
    setError(null)
    setLivenessProgress(0)
    setConsecutiveFrames(0)
    setVideoReady(false)
    setWsReady(false)
    stopCamera()
    if (wsRef.current) {
      wsRef.current.close()
    }
  }, [stopCamera])

  // Start liveness detection when video becomes ready
  useEffect(() => {
    console.log('useEffect check: videoReady', videoReady, 'step', step, 'wsReady', wsReady)
    if (videoReady && step === 'liveness' && wsReady) {
      console.log('Video is ready, starting liveness detection')
      startLivenessDetection()
    }
  }, [videoReady, step, wsReady, startLivenessDetection])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [stopCamera])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-20 mb-16"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
            <RiSecurePaymentFill className="h-8 w-8 text-blue-600" />
             Verify-dlp
          </h1>
          <p className="text-gray-600">Secure liveness detection and ID verification</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'camera' && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="max-w-md mx-auto">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Camera className="h-5 w-5" />
                    Camera Access
                  </CardTitle>
                  <CardDescription>
                    We need access to your camera for liveness detection
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button 
                    onClick={startCamera}
                    size="lg" 
                    className="w-full"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Start Verification
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'liveness' && (
            <motion.div
              key="liveness"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="max-w-2xl mx-auto">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Eye className="h-5 w-5" />
                    Liveness Detection
                  </CardTitle>
                  <CardDescription>
                    Look at the camera and move naturally. Keep your face in the frame.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative mx-auto w-fit">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="rounded-lg border-4 border-blue-500 w-80 h-60 object-cover bg-gray-900"
                      style={{ transform: 'scaleX(-1)' }} // Mirror the video for better UX
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 border-4 border-blue-500 rounded-lg animate-pulse pointer-events-none" />
                    
                    {/* Loading overlay */}
                    {!videoReady && (
                      <div className="absolute inset-0 bg-gray-900 rounded-lg flex items-center justify-center text-white">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-sm">Initializing camera...</p>
                          <p className="text-xs text-gray-400 mt-1">Please allow camera access, by clicking the "Start Verification" button</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{consecutiveFrames}/5 frames</span>
                    </div>
                    <Progress value={livenessProgress} className="h-2" />
                  </div>
                  
                  <p className="text-center text-sm text-gray-600">
                    {consecutiveFrames < 5 
                      ? "Move your face closer, then slowly pull back..." 
                      : "Almost done! Keep looking at the camera..."}
                  </p>
                  
                  {/* Debug info */}
                  {/* <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                    <p>Debug: Video Ready: {videoReady ? '✅' : '❌'}</p>
                    <p>Stream: {streamRef.current ? '✅ Active' : '❌ None'}</p>
                    <p>Stream Tracks: {streamRef.current?.getTracks().length || 0}</p>
                    <p>Video Element: {videoRef.current ? '✅ Exists' : '❌ None'}</p>
                    <p>Video srcObject: {videoRef.current?.srcObject ? '✅ Set' : '❌ None'}</p>
                    <p>Video ReadyState: {videoRef.current?.readyState || 'N/A'}</p>
                    <p>Video Dimensions: {videoRef.current?.videoWidth}x{videoRef.current?.videoHeight || 'N/A'}</p>
                    <div className="mt-2 space-x-2">
                      {!videoReady && (
                        <button 
                          onClick={() => {
                            console.log('🔧 Manual override: Setting video ready')
                            setVideoReady(true)
                          }}
                          className="px-2 py-1 bg-blue-500 text-white text-xs rounded"
                        >
                          Force Video Ready
                        </button>
                      )}
                    </div>
                  </div> */}
                  
                  <div className="text-center mt-4">
                    <button 
                      onClick={() => {
                        console.log('🎥 Manually calling startCamera...')
                        startCamera()
                      }}
                      className="px-2 py-1 border border-gray-300 text-gray-700 text-xs rounded"
                    >
                      Start Verification
                    </button>
                  </div>
                  
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="max-w-md mx-auto">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <FileImage className="h-5 w-5" />
                    Upload ID Card
                  </CardTitle>
                  <CardDescription>
                    Upload a clear photo of your government-issued ID
                  </CardDescription>
                  <div className="mt-2 text-xs text-gray-500 text-left">
                    <p className="font-medium mb-1"> For best results:</p>
                    <ul className="space-y-1">
                      <li>• Ensure good lighting with no shadows on the face</li>
                      <li>• Hold camera steady and keep ID card flat</li>
                      <li>• Make sure the entire ID card is visible and in focus</li>
                      <li>• Avoid glare, blurry images, or tilted photos</li>
                    </ul>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleIdCardUpload}
                      className="hidden"
                      id="id-upload"
                    />
                    <label htmlFor="id-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        {idCardFile ? idCardFile.name : "Click to upload ID card"}
                      </p>
                    </label>
                  </div>
                  
                  {idCardFile && (
                    <Button onClick={submitVerification} size="lg" className="w-full">
                      <RiSecurePaymentFill className="h-4 w-4 mr-2" />
                      Verify Identity
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'verifying' && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="max-w-md mx-auto">
                <CardContent className="text-center py-12">
                  <LoaderIcon className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
                  <h3 className="text-lg font-semibold mb-2">Verifying Identity</h3>
                  <p className="text-gray-600">Please wait while we verify your identity...</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'success' && verificationResult && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", duration: 0.6 }}
            >
              <Card className="max-w-lg mx-auto overflow-hidden shadow-2xl border-0 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600">
                <div className="absolute inset-0 bg-gradient-to-r from-green-300/20 via-transparent to-emerald-300/20" />
                <CardContent className="relative text-center py-12 px-8">
                  {/* Animated Success Icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      type: "spring", 
                      duration: 0.8,
                      delay: 0.2 
                    }}
                    className="relative mb-6"
                  >
                    <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-20" />
                    <div className="relative bg-white rounded-full p-4 shadow-lg">
                      <CheckCircle className="h-12 w-12 text-green-300" />
                    </div>
                  </motion.div>

                  {/* Success Title */}
                  <motion.h3 
                    className="text-3xl font-bold text-white mb-3 drop-shadow-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Verification Successful!
                  </motion.h3>

                  <motion.p 
                    className="text-green-100 mb-6 text-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    Your identity has been securely verified and authenticated
                  </motion.p>

                  {/* Enhanced Verification Details */}
                  <motion.div
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <h4 className="text-white font-semibold mb-4 text-lg">Verification Details</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-white font-medium">Result</span>
                        </div>
                        <span className="text-green-200 font-bold text-right">
                          {verificationResult.recognito_result}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <RiSecurePaymentFill className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-white font-medium">Duration</span>
                        </div>
                        <span className="text-blue-200 font-bold text-right">
                          {verificationResult.performance.total_duration.toFixed(1)}s
                        </span>
                      </div>

                      {/* <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                            <FileImage className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-white font-medium">Session ID</span>
                        </div>
                        <span className="text-purple-200 font-mono text-xs text-right">
                          {verificationResult.session_id.slice(0, 12)}...
                        </span>
                      </div> */}
                    </div>
                  </motion.div>

                  {/* Action Buttons */}
                  <motion.div 
                    className="space-y-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <Button 
                      onClick={resetVerification} 
                      className="w-full bg-white text-green-600 hover:bg-green-50 font-semibold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
                    >
                      <RiSecurePaymentFill className="h-5 w-5 mr-2" />
                      Verify Another Identity
                    </Button>

                 
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="max-w-md mx-auto border-red-500 bg-red-50">
                <CardContent className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Verification Failed</h3>
                  <p className="text-red-700 mb-4">{error}</p>
                  <Button onClick={resetVerification} variant="outline" className="w-full">
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
