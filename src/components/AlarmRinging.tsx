/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Brain, Code, Camera, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Alarm, ChallengeType } from '../types';
import { generateMathProblem, generateMemorySequence, CODING_QUESTIONS, getRandomCameraObject } from '../services/challengeService';
import { verifyImage } from '../services/geminiService';
import { formatTime12h } from '../utils';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { nativeAlarmService } from '../services/nativeAlarmService';

interface AlarmRingingProps {
  alarm: Alarm;
  onComplete: () => void;
}

const PUZZLE_OPTIONS: { type: ChallengeType; label: string; Icon: typeof Calculator; color: string; active: string }[] = [
  { type: 'math', label: 'Math', Icon: Calculator, color: 'text-emerald-400', active: 'border-emerald-500 bg-emerald-500/15 text-emerald-100' },
  { type: 'memory', label: 'Memory', Icon: Brain, color: 'text-blue-400', active: 'border-blue-500 bg-blue-500/15 text-blue-100' },
  { type: 'coding', label: 'Code', Icon: Code, color: 'text-purple-400', active: 'border-purple-500 bg-purple-500/15 text-purple-100' },
  { type: 'camera', label: 'Camera', Icon: Camera, color: 'text-orange-400', active: 'border-orange-500 bg-orange-500/15 text-orange-100' },
];

export const AlarmRinging: React.FC<AlarmRingingProps> = ({ alarm, onComplete }) => {
  const { time, period } = formatTime12h(alarm.time);
  const [challengeType, setChallengeType] = useState<ChallengeType | null>(
    alarm.challengeType === 'random' ? null : alarm.challengeType as ChallengeType
  );
  
  const [status, setStatus] = useState<'idle' | 'wrong' | 'correct' | 'verifying'>('idle');
  const [input, setInput] = useState('');
  const [mathProblem, setMathProblem] = useState<{ question: string; answer: string } | null>(null);
  const [memorySequence, setMemorySequence] = useState<number[]>([]);
  const [memoryIndex, setMemoryIndex] = useState(-1);
  const [codingQuestion, setCodingQuestion] = useState<{ question: string; answer: string } | null>(null);
  const [cameraObject, setCameraObject] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [showSequence, setShowSequence] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const memoryIntervalRef = useRef<number | null>(null);
  const memoryTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      KeepAwake.keepAwake().catch(console.error);
    }

    return () => {
      if (Capacitor.isNativePlatform()) {
        KeepAwake.allowSleep().catch(() => {});
      }
      stopCamera();
    };
  }, []);

  useEffect(() => {
    clearMemoryTimers();
    stopCamera();
    setStatus('idle');
    setInput('');
    setCameraError('');
    setShowSequence(false);

    if (!challengeType) return;

    if (challengeType === 'math') {
      setMathProblem(generateMathProblem(alarm.difficulty));
    } else if (challengeType === 'memory') {
      const seq = generateMemorySequence(alarm.difficulty);
      setMemorySequence(seq);
      startMemorySequence(seq);
    } else if (challengeType === 'coding') {
      const q = CODING_QUESTIONS[Math.floor(Math.random() * CODING_QUESTIONS.length)];
      setCodingQuestion(q);
    } else if (challengeType === 'camera') {
      setCameraObject(getRandomCameraObject());
      startCamera();
    }

    return () => {
      clearMemoryTimers();
      stopCamera();
    };
  }, [challengeType]);

  const clearMemoryTimers = () => {
    if (memoryIntervalRef.current !== null) {
      window.clearInterval(memoryIntervalRef.current);
      memoryIntervalRef.current = null;
    }
    if (memoryTimeoutRef.current !== null) {
      window.clearTimeout(memoryTimeoutRef.current);
      memoryTimeoutRef.current = null;
    }
  };

  const startMemorySequence = (seq: number[]) => {
    clearMemoryTimers();
    setShowSequence(true);
    setMemoryIndex(-1);
    let i = 0;
    memoryIntervalRef.current = window.setInterval(() => {
      if (i >= seq.length) {
        clearMemoryTimers();
        memoryTimeoutRef.current = window.setTimeout(() => {
          setShowSequence(false);
          setMemoryIndex(0);
        }, 1000);
        return;
      }
      setMemoryIndex(i);
      i++;
    }, 1000);
  };

  const startCamera = async () => {
    try {
      setCameraError('');
      console.log('[Camera] Starting camera...');
      
      if (!navigator.mediaDevices?.getUserMedia) {
        console.error('[Camera] getUserMedia not available');
        setCameraError('Camera API is not available on this device/browser.');
        return;
      }

      // Try rear camera first, fall back to any camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
      } catch (rearErr) {
        console.warn('[Camera] Rear camera failed, trying any camera:', rearErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      console.log('[Camera] Got stream with', stream.getVideoTracks().length, 'video tracks');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        console.log('[Camera] Video element playing');
      }
    } catch (err: any) {
      const msg = err?.message || err?.name || String(err);
      console.error('[Camera] Access error:', msg, err);
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        setCameraError('Camera permission denied. Please allow camera access in your device settings, then restart the app.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(`Camera error: ${msg}`);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleMathSubmit = () => {
    if (input === mathProblem?.answer) {
      handleSuccess();
    } else {
      handleFailure();
    }
  };

  const handleMemoryClick = (num: number) => {
    if (num === memorySequence[memoryIndex]) {
      if (memoryIndex === memorySequence.length - 1) {
        handleSuccess();
      } else {
        setMemoryIndex(prev => prev + 1);
      }
    } else {
      handleFailure();
      startMemorySequence(memorySequence);
    }
  };

  const handleCodingSubmit = () => {
    if (input.toLowerCase().trim() === codingQuestion?.answer.toLowerCase()) {
      handleSuccess();
    } else {
      handleFailure();
    }
  };

  const handleCameraCapture = async () => {
    console.log('[Capture] Starting capture...');
    console.log('[Capture] videoRef:', !!videoRef.current, 'canvasRef:', !!canvasRef.current);
    
    if (!videoRef.current || !canvasRef.current) {
      setCameraError('Camera not ready. Tap "Enable Camera" first.');
      return;
    }

    if (!videoRef.current.videoWidth || videoRef.current.videoWidth === 0) {
      console.warn('[Capture] videoWidth is 0, camera may still be initializing');
      setCameraError('Camera is still starting. Please wait a moment and try again.');
      return;
    }
    
    setStatus('verifying');
    setCameraError('');
    
    try {
      const context = canvasRef.current.getContext('2d');
      if (!context) {
        setCameraError('Could not get canvas context.');
        setStatus('idle');
        return;
      }
      
      const maxSize = 1024;
      const scale = Math.min(1, maxSize / Math.max(videoRef.current.videoWidth, videoRef.current.videoHeight));
      canvasRef.current.width = Math.round(videoRef.current.videoWidth * scale);
      canvasRef.current.height = Math.round(videoRef.current.videoHeight * scale);
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      
      console.log('[Capture] Canvas size:', canvasRef.current.width, 'x', canvasRef.current.height);
      
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
      console.log('[Capture] Image data URL length:', dataUrl.length);
      console.log('[Capture] Looking for object:', cameraObject);
      
      const verification = await verifyImage(dataUrl, cameraObject);
      console.log('[Capture] Verification result:', verification);
      
      if (verification.isValid) {
        handleSuccess();
      } else {
        if (verification.error) {
          setCameraError(verification.error);
        } else {
          setCameraError(`Could not detect "${cameraObject}". Point the camera directly at the object and try again.`);
        }
        handleFailure();
      }
    } catch (err: any) {
      console.error('[Capture] Error during capture/verify:', err);
      setCameraError(`Verification failed: ${err?.message || 'Unknown error'}`);
      setStatus('idle');
    }
  };

  const handleSuccess = async () => {
    setStatus('correct');
    // STOP THE NATIVE ALARM SOUND SERVICE
    if (Capacitor.isNativePlatform()) {
      await nativeAlarmService.stopService();
    }
    setTimeout(onComplete, 1500);
  };

  const handleFailure = () => {
    setStatus('wrong');
    setInput('');
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-zinc-950 overflow-y-auto text-white"
    >
      <div className="min-h-full w-full max-w-md mx-auto flex flex-col justify-center px-4 py-8">
        <div className="text-center mb-5">
          <h1 className="text-6xl font-black mb-2">{time} <span className="text-2xl text-zinc-500">{period}</span></h1>
          <p className="text-zinc-400 uppercase tracking-widest text-sm">{alarm.label || 'Alarm'}</p>
        </div>

        <Card className="w-full bg-zinc-900 border-zinc-800">
          <CardContent className="p-6 flex flex-col items-center">
          <div className="w-full grid grid-cols-4 gap-2 mb-6">
            {PUZZLE_OPTIONS.map(({ type, label, Icon, active }) => {
              const selected = challengeType === type;
              return (
                <button
                  key={type}
                  onClick={() => setChallengeType(type)}
                  className={`h-16 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors ${
                    selected ? active : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="mb-6 p-4 bg-zinc-800 rounded-full">
            {challengeType === 'math' && <Calculator className="w-8 h-8 text-emerald-400" />}
            {challengeType === 'memory' && <Brain className="w-8 h-8 text-blue-400" />}
            {challengeType === 'coding' && <Code className="w-8 h-8 text-purple-400" />}
            {challengeType === 'camera' && <Camera className="w-8 h-8 text-orange-400" />}
            {!challengeType && <AlertCircle className="w-8 h-8 text-zinc-400" />}
          </div>

          <h2 className="text-xl font-medium mb-6 text-center">
            {!challengeType && 'Choose a puzzle'}
            {challengeType === 'math' && `Solve: ${mathProblem?.question}`}
            {challengeType === 'memory' && (showSequence ? 'Watch the sequence' : 'Repeat the sequence')}
            {challengeType === 'coding' && codingQuestion?.question}
            {challengeType === 'camera' && `Take a photo of a ${cameraObject}`}
          </h2>

          {challengeType === 'math' && (
            <div className="w-full space-y-4">
              <input 
                type="number" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-zinc-800 border-none rounded-xl p-4 text-2xl text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="?"
                autoFocus
              />
              <Button onClick={handleMathSubmit} className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-500">
                Submit
              </Button>
            </div>
          )}

          {challengeType === 'memory' && (
            <div className="w-full">
              {showSequence ? (
                <div className="flex justify-center items-center h-32">
                  <motion.div 
                    key={memoryIndex}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-6xl font-bold text-blue-400"
                  >
                    {memorySequence[memoryIndex]}
                  </motion.div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <Button 
                      key={num} 
                      variant="secondary" 
                      className="h-16 text-xl bg-zinc-800 hover:bg-zinc-700 text-white border-none"
                      onClick={() => handleMemoryClick(num)}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {challengeType === 'coding' && (
            <div className="w-full space-y-4">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-zinc-800 border-none rounded-xl p-4 text-xl text-center focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Your answer"
                autoFocus
              />
              <Button onClick={handleCodingSubmit} className="w-full h-14 text-lg bg-purple-600 hover:bg-purple-500">
                Submit
              </Button>
            </div>
          )}

          {challengeType === 'camera' && (
            <div className="w-full space-y-4 flex flex-col items-center">
              <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                {cameraError && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center gap-3">
                    <Camera className="w-10 h-10 text-orange-400" />
                    <p className="text-sm text-zinc-200">{cameraError}</p>
                    <Button onClick={startCamera} variant="secondary" size="sm">
                      Enable Camera
                    </Button>
                  </div>
                )}
                {status === 'verifying' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <Button 
                onClick={handleCameraCapture} 
                disabled={status === 'verifying'}
                className="w-full h-14 text-lg bg-orange-600 hover:bg-orange-500"
              >
                Capture Photo
              </Button>
            </div>
          )}

          <AnimatePresence>
            {status === 'wrong' && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="mt-6 flex items-center text-red-400 gap-2"
              >
                <AlertCircle className="w-5 h-5" />
                <span>Incorrect! Try again.</span>
              </motion.div>
            )}
            {status === 'correct' && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="mt-6 flex items-center text-emerald-400 gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Success! Alarm off.</span>
              </motion.div>
            )}
          </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};
