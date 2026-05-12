/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card = ({ className, children, ...props }: { className?: string; children: React.ReactNode; [key: string]: any }) => (
  <div className={cn('bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden', className)} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('p-6 border-bottom border-zinc-50', className)}>{children}</div>
);

export const CardContent = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('p-6 pt-0', className)}>{children}</div>
);

export const CardFooter = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('p-6 pt-0 flex items-center', className)}>{children}</div>
);
