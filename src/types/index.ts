/**
 * Core type definitions for LENS-EXEC AR Code Analysis System
 */

// Geometric types
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
  timestamp: number;
}

// Code analysis types
export interface CodeRegion {
  id: string;
  boundingBox: Rectangle;
  confidence: number;
  extractedText: string;
  detectionTimestamp: number;
  trackingHistory: Position[];
}

export interface CodeIssue {
  type: 'syntax' | 'logic' | 'style' | 'security';
  severity: 'low' | 'medium' | 'high';
  lineNumber?: number;
  description: string;
  suggestedFix?: string;
}

export interface CodeSuggestion {
  type: 'improvement' | 'optimization' | 'best-practice';
  description: string;
  lineNumber?: number;
  suggestedCode?: string;
}

export interface ExecutionResult {
  output: string;
  errors: string[];
  executionTime: number;
  memoryUsage?: number;
}

export interface AnalysisResult {
  codeRegionId: string;
  language: string;
  errors: CodeIssue[];
  suggestions: CodeSuggestion[];
  simulationResult?: ExecutionResult;
  analysisTimestamp: number;
}

// AR and rendering types
export interface OverlayContent {
  text?: string;
  html?: string;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
}

export interface AROverlay {
  id: string;
  type: 'error' | 'suggestion' | 'simulation' | 'status';
  position: Vector3;
  content: OverlayContent;
  visibility: boolean;
  trackingTarget?: CodeRegion;
}

// System configuration types
export interface CameraConfig {
  width: number;
  height: number;
  frameRate: number;
  facingMode: 'user' | 'environment';
}

export interface LLMConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface SystemConfig {
  camera: CameraConfig;
  llm: LLMConfig;
  enableSimulation: boolean;
  debugMode: boolean;
}

// Event types
export interface SystemEvent {
  type: string;
  timestamp: number;
  data?: any;
}

export interface CameraEvent extends SystemEvent {
  type: 'camera-permission-granted' | 'camera-permission-denied' | 'camera-error' | 'camera-ready';
}

export interface AnalysisEvent extends SystemEvent {
  type: 'analysis-started' | 'analysis-completed' | 'analysis-failed';
  codeRegionId?: string;
  result?: AnalysisResult;
  error?: Error;
}

// Error types
export interface SystemError extends Error {
  code: string;
  component: string;
  recoverable: boolean;
  timestamp: number;
}