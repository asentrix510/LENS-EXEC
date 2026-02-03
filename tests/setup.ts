/**
 * Jest test setup for LENS-EXEC
 * Configures test environment and global mocks
 */

// Mock browser APIs that aren't available in Jest environment
Object.defineProperty(window, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: jest.fn(),
      enumerateDevices: jest.fn(),
    },
    xr: {
      isSessionSupported: jest.fn(),
      requestSession: jest.fn(),
    },
  },
  writable: true,
});

// Mock ImageData constructor
(global as any).ImageData = class ImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight?: number, height?: number) {
    if (typeof dataOrWidth === 'number') {
      // ImageData(width, height)
      this.width = dataOrWidth;
      this.height = widthOrHeight!;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      // ImageData(data, width, height)
      this.data = dataOrWidth;
      this.width = widthOrHeight!;
      this.height = height!;
    }
  }
};

// Mock canvas and WebGL context
(HTMLCanvasElement.prototype.getContext as any) = jest.fn((contextType: string) => {
  if (contextType === '2d') {
    return {
      drawImage: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
    };
  }
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      // Mock WebGL context methods
      createShader: jest.fn(),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      createProgram: jest.fn(),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      useProgram: jest.fn(),
      // Add more WebGL methods as needed
    };
  }
  return null;
});

// Mock HTMLVideoElement methods
HTMLVideoElement.prototype.play = jest.fn(() => Promise.resolve());
HTMLVideoElement.prototype.pause = jest.fn();

// Mock URL.createObjectURL
(global as any).URL = {
  createObjectURL: jest.fn(() => 'mock-url'),
  revokeObjectURL: jest.fn(),
};

// Mock fetch for API calls
(global as any).fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    blob: () => Promise.resolve(new Blob()),
    text: () => Promise.resolve(''),
  })
) as jest.Mock;

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
(global as any).console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Restore console for specific tests if needed
(global as any).restoreConsole = () => {
  (global as any).console = originalConsole;
};

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
  },
  writable: true,
});

// Mock requestAnimationFrame
(global as any).requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => setTimeout(cb, 16));
(global as any).cancelAnimationFrame = jest.fn((id: number) => clearTimeout(id));

// Set up DOM environment
document.body.innerHTML = '<div id="app"></div>';

// Mock OpenCV.js
(global as any).cv = {
  Mat: jest.fn(),
  matFromImageData: jest.fn(),
  cvtColor: jest.fn(),
  adaptiveThreshold: jest.fn(),
  findContours: jest.fn(),
  boundingRect: jest.fn(),
  contourArea: jest.fn(),
  MatVector: jest.fn(),
  COLOR_RGBA2GRAY: 6,
  COLOR_GRAY2RGBA: 8,
  ADAPTIVE_THRESH_GAUSSIAN_C: 1,
  THRESH_BINARY: 0,
  RETR_EXTERNAL: 0,
  CHAIN_APPROX_SIMPLE: 2,
  Size: jest.fn(),
  Rect: jest.fn(),
};

// Mock Tesseract.js
jest.mock('tesseract.js', () => ({
  recognize: jest.fn(() => Promise.resolve({
    data: {
      text: 'mock extracted text',
      confidence: 85,
    },
  })),
  createWorker: jest.fn(() => ({
    load: jest.fn(() => Promise.resolve()),
    loadLanguage: jest.fn(() => Promise.resolve()),
    initialize: jest.fn(() => Promise.resolve()),
    setParameters: jest.fn(() => Promise.resolve()),
    recognize: jest.fn(() => Promise.resolve({
      data: {
        text: 'mock extracted text',
        confidence: 85,
      },
    })),
    terminate: jest.fn(() => Promise.resolve()),
  })),
}));

// Mock Three.js
jest.mock('three', () => ({
  Scene: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
  })),
  PerspectiveCamera: jest.fn(),
  WebGLRenderer: jest.fn(() => {
    const mockCanvas = document.createElement('canvas');
    return {
      domElement: mockCanvas,
      setSize: jest.fn(),
      setClearColor: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn(),
    };
  }),
  Group: jest.fn(() => ({
    add: jest.fn(),
    position: { set: jest.fn() },
    lookAt: jest.fn(),
    children: [],
  })),
  Mesh: jest.fn(() => ({
    position: { set: jest.fn() },
    geometry: { dispose: jest.fn() },
    material: { dispose: jest.fn() },
  })),
  PlaneGeometry: jest.fn(() => ({
    dispose: jest.fn(),
  })),
  MeshBasicMaterial: jest.fn(() => ({
    dispose: jest.fn(),
  })),
  Vector3: jest.fn(),
  Color: jest.fn(),
}));

// Increase test timeout for async operations
jest.setTimeout(10000);