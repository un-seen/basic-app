
import React, { useEffect } from "react";

export function convertSeconds(seconds: number): string {
    const hours: number = Math.floor(seconds / 3600);
    const minutes: number = Math.floor((seconds % 3600) / 60);
    const remainingSeconds: number = Math.floor(seconds % 60);
  
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
  
  export function getRandomId(): string {
    const limit = 128512;
  
    return String(Math.floor(Math.random() * limit));
  }
  