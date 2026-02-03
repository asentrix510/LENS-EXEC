/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CAMERA_WIDTH?: string
  readonly VITE_CAMERA_HEIGHT?: string
  readonly VITE_CAMERA_FRAME_RATE?: string
  readonly VITE_CAMERA_FACING_MODE?: string
  readonly VITE_LLM_API_KEY?: string
  readonly VITE_LLM_MODEL?: string
  readonly VITE_LLM_MAX_TOKENS?: string
  readonly VITE_LLM_TEMPERATURE?: string
  readonly VITE_LLM_TIMEOUT?: string
  readonly VITE_ENABLE_SIMULATION?: string
  readonly VITE_DEBUG_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}