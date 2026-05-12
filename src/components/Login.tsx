/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LogIn, BellRing } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';

interface LoginProps {
  onLogin: () => void;
  onSkip: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onSkip }) => {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
      <div className="mb-12 text-center">
        <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <BellRing className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tighter mb-2">Wakeup Alarm</h1>
        <p className="text-zinc-500">Wake up your brain, not just your body.</p>
      </div>

      <Card className="w-full max-w-sm border-none shadow-xl">
        <CardContent className="p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold">Welcome Back</h2>
            <p className="text-sm text-zinc-500">Sign in to sync your alarms and track your progress.</p>
          </div>
          
          <div className="space-y-3">
            <Button onClick={onLogin} className="w-full h-12 gap-2 text-lg">
              <LogIn className="w-5 h-5" />
              Sign in with Google
            </Button>
            
            <Button variant="outline" onClick={onSkip} className="w-full h-12 text-zinc-600 border-zinc-200">
              Continue without signing in
            </Button>
          </div>

          <p className="text-[10px] text-center text-zinc-400 uppercase tracking-widest">
            Secure authentication powered by Firebase
          </p>
        </CardContent>
      </Card>

      <div className="mt-12 grid grid-cols-2 gap-8 max-w-md w-full">
        <div className="text-center">
          <p className="text-2xl mb-1">🧠</p>
          <p className="text-xs font-medium text-zinc-600">Mental Alertness</p>
        </div>
        <div className="text-center">
          <p className="text-2xl mb-1">📈</p>
          <p className="text-xs font-medium text-zinc-600">Morning Productivity</p>
        </div>
      </div>
    </div>
  );
};
