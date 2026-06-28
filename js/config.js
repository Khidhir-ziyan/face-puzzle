export const APP_CONFIG = {
  REQUIRED_GESTURE_TIME_MS: 1000,
  SMILE_THRESHOLD: 0.75,
  GRID_SIZE: 3,
  PADDING: 20,
  MODEL_URL: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/',
  PIECE_SIZE: 150
};

export const INITIAL_STATE = {
  modelsLoaded: false,
  cameraActive: false,
  puzzleActive: false,
  faceBox: null,
  pieces: [],
  selectedPieceIndex: null,
  animating: false,
  isGesturing: false,
  gestureStartTime: 0,
  currentGestureType: null,
  faceDetectionInProgress: false,
  handDetectionInProgress: false
};
