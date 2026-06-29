import { APP_CONFIG } from './config.js';
import { createState } from './state.js';
import { createUiController } from './ui.js';

export class PuzzleFaceApp {
  constructor() {
    this.state = createState();
    this.ui = createUiController();
    this.handposeModel = null;
    this.currentGestureType = null;
    this.wasPinching = false;
    this.elements = this.ui.elements;
  }

  async init() {
    this.ui.showLoading();
    this.ui.setCaptureButtonDisabled(true);

    try {
      await this.loadModels();
      await this.startCamera();
    } catch (error) {
      console.error(error);
      this.ui.updateStatus('Gagal memuat aplikasi.', 'text-red-400');
      this.ui.showModal('Error', 'Aplikasi gagal memulai. Periksa konsol browser.', 'error');
    }
  }

  async loadModels() {
    this.ui.setLoadingStep(1, 3, 'Memuat Detektor Wajah');
    await faceapi.nets.tinyFaceDetector.loadFromUri(APP_CONFIG.MODEL_URL);

    this.ui.setLoadingStep(2, 3, 'Memuat Analisis Ekspresi');
    await faceapi.nets.faceExpressionNet.loadFromUri(APP_CONFIG.MODEL_URL);

    this.ui.setLoadingStep(3, 3, 'Memuat Model Pelacakan Tangan');
    await tf.setBackend('webgl');
    await tf.ready();
    this.handposeModel = await handpose.load();

    this.state.modelsLoaded = true;
    this.ui.hideLoading();
  }

  async startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    });

    this.elements.video.srcObject = stream;
    this.elements.video.onloadedmetadata = () => {
      this.elements.overlay.width = this.elements.video.videoWidth;
      this.elements.overlay.height = this.elements.video.videoHeight;
      this.state.cameraActive = true;
      this.ui.setCaptureButtonDisabled(false);
      this.ui.updateStatus('Lihat ke kamera dan senyum atau tunjukkan tanda damai!', 'text-green-400');
      this.detectFaceLoop();
      this.detectHandLoop();
    };
  }

  detectFaceLoop() {
    if (!this.state.cameraActive || this.state.puzzleActive) return;

    if (this.state.faceDetectionInProgress) {
      window.requestAnimationFrame(() => this.detectFaceLoop());
      return;
    }

    this.state.faceDetectionInProgress = true;
    const ctx = this.elements.overlay.getContext('2d');
    ctx.clearRect(0, 0, this.elements.overlay.width, this.elements.overlay.height);

    Promise.resolve(faceapi.detectSingleFace(this.elements.video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions())
      .then((detection) => {
        if (detection) {
          this.state.faceBox = detection.detection.box;
          const box = detection.detection.box;
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          const smileConfidence = detection.expressions.happy;
          ctx.fillStyle = '#3b82f6';
          ctx.font = '16px Inter';
          ctx.fillText(`Senyum: ${(smileConfidence * 100).toFixed(0)}%`, box.x, box.y - 5);

          if (smileConfidence > APP_CONFIG.SMILE_THRESHOLD) {
            this.handleGestureDetected('smile');
          } else {
            this.handleGestureBroken('smile');
          }
        } else {
          this.state.faceBox = null;
          this.handleGestureBroken('smile');
        }
      })
      .catch((error) => {
        console.error('Face detection error:', error);
      })
      .finally(() => {
        this.state.faceDetectionInProgress = false;
        window.requestAnimationFrame(() => this.detectFaceLoop());
      });
  }

  detectHandLoop() {
    if (!this.state.cameraActive || this.state.puzzleActive) return;

    if (this.state.handDetectionInProgress || !this.handposeModel) {
      window.setTimeout(() => this.detectHandLoop(), 50);
      return;
    }

    this.state.handDetectionInProgress = true;

    Promise.resolve(this.handposeModel.estimateHands(this.elements.video))
      .then((predictions) => {
        if (predictions.length > 0) {
          const landmarks = predictions[0].landmarks;
          const isFingerExtended = (tipIdx, mcpIdx) => landmarks[tipIdx][1] < landmarks[mcpIdx][1] - 20;
          const isFingerCurled = (tipIdx, mcpIdx) => landmarks[tipIdx][1] > landmarks[mcpIdx][1] - 10;

          const indexUp = isFingerExtended(8, 5);
          const middleUp = isFingerExtended(12, 9);
          const ringDown = isFingerCurled(16, 13);
          const pinkyDown = isFingerCurled(20, 17);

          if (indexUp && middleUp && ringDown && pinkyDown) {
            this.handleGestureDetected('peace');
          } else {
            this.handleGestureBroken('peace');
          }
        } else {
          this.handleGestureBroken('peace');
        }
      })
      .catch((error) => {
        console.error('Hand detection error:', error);
      })
      .finally(() => {
        this.state.handDetectionInProgress = false;
        window.setTimeout(() => this.detectHandLoop(), 50);
      });
  }

  handleGestureDetected(type) {
    this.ui.setBadgeActive(this.elements.badgeSmile, type === 'smile');
    this.ui.setBadgeActive(this.elements.badgePeace, type === 'peace');

    if (this.currentGestureType && this.currentGestureType !== type) {
      this.state.isGesturing = false;
    }

    this.currentGestureType = type;

    if (!this.state.isGesturing) {
      this.state.isGesturing = true;
      this.state.gestureStartTime = performance.now();
      this.ui.showCountdown('1.0');
    }

    const elapsed = performance.now() - this.state.gestureStartTime;
    const remaining = Math.max(0, APP_CONFIG.REQUIRED_GESTURE_TIME_MS - elapsed);
    this.elements.countdownText.textContent = (remaining / 1000).toFixed(1);

    if (elapsed >= APP_CONFIG.REQUIRED_GESTURE_TIME_MS) {
      this.state.isGesturing = false;
      this.ui.hideCountdown();
      this.ui.setBadgeActive(this.elements.badgeSmile, false);
      this.ui.setBadgeActive(this.elements.badgePeace, false);
      this.takeSnapshot();
    }
  }

  handleGestureBroken(type) {
    this.ui.setBadgeActive(type === 'smile' ? this.elements.badgeSmile : this.elements.badgePeace, false);

    if (this.currentGestureType === type && this.state.isGesturing) {
      this.state.isGesturing = false;
      this.currentGestureType = null;
      this.ui.hideCountdown();
    }
  }

  bindEvents() {
    this.elements.btnCapture.addEventListener('click', () => {
      if (this.state.cameraActive && !this.state.puzzleActive) {
        this.takeSnapshot();
      }
    });

    this.elements.btnReset.addEventListener('click', () => this.resetApp());
    this.elements.btnCloseModal.addEventListener('click', () => this.ui.closeModal());
  }

  takeSnapshot() {
    if (!this.state.cameraActive) return;

    this.state.puzzleActive = true;
    this.ui.updateStatus('Memproses gambar...', 'text-blue-400');

    const ctx = this.elements.overlay.getContext('2d');
    ctx.clearRect(0, 0, this.elements.overlay.width, this.elements.overlay.height);
    this.ui.hideCountdown();

    const capCanvas = this.elements.captureCanvas;
    const capCtx = capCanvas.getContext('2d');

    const vw = this.elements.video.videoWidth;
    const vh = this.elements.video.videoHeight;
    capCanvas.width = vw;
    capCanvas.height = vh;

    capCtx.translate(vw, 0);
    capCtx.scale(-1, 1);
    capCtx.drawImage(this.elements.video, 0, 0, vw, vh);
    capCtx.setTransform(1, 0, 0, 1, 0, 0);

    let cropX = 0;
    let cropY = 0;
    let cropSize = Math.min(vw, vh);

    if (this.state.faceBox) {
      const boxXFlipped = vw - this.state.faceBox.x - this.state.faceBox.width;
      const cx = boxXFlipped + (this.state.faceBox.width / 2);
      const cy = this.state.faceBox.y + (this.state.faceBox.height / 2);
      let requestedSize = Math.max(this.state.faceBox.width, this.state.faceBox.height) + (APP_CONFIG.PADDING * 2);
      cropSize = Math.min(requestedSize, vw, vh);
      cropX = Math.max(0, Math.min(cx - cropSize / 2, vw - cropSize));
      cropY = Math.max(0, Math.min(cy - cropSize / 2, vh - cropSize));
    } else {
      cropX = (vw - cropSize) / 2;
      cropY = (vh - cropSize) / 2;
    }

    this.generatePuzzle(capCanvas, cropX, cropY, cropSize);
  }

  generatePuzzle(sourceCanvas, sx, sy, size) {
    this.state.pieces = [];
    while (this.elements.puzzleGrid.children.length > 1) {
      this.elements.puzzleGrid.removeChild(this.elements.puzzleGrid.lastChild);
    }

    const pieceSizeSource = size / APP_CONFIG.GRID_SIZE;
    const totalPieces = APP_CONFIG.GRID_SIZE * APP_CONFIG.GRID_SIZE;

    for (let i = 0; i < totalPieces; i++) {
      const row = Math.floor(i / APP_CONFIG.GRID_SIZE);
      const col = i % APP_CONFIG.GRID_SIZE;

      const pieceCanvas = document.createElement('canvas');
      pieceCanvas.width = APP_CONFIG.PIECE_SIZE;
      pieceCanvas.height = APP_CONFIG.PIECE_SIZE;
      const pieceCtx = pieceCanvas.getContext('2d');

      const srcX = sx + (col * pieceSizeSource);
      const srcY = sy + (row * pieceSizeSource);

      pieceCtx.drawImage(sourceCanvas, srcX, srcY, pieceSizeSource, pieceSizeSource, 0, 0, pieceCanvas.width, pieceCanvas.height);

      this.state.pieces.push({
        id: `piece-${i}`,
        originalIndex: i,
        currentIndex: i,
        canvas: pieceCanvas
      });
    }

    const indices = Array.from({ length: totalPieces }, (_, k) => k);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const shuffledPieces = new Array(totalPieces);
    this.state.pieces.forEach((piece, i) => {
      piece.currentIndex = indices[i];
      shuffledPieces[indices[i]] = piece;
    });

    this.state.pieces = shuffledPieces;
    this.renderPuzzle();

    this.ui.setCaptureButtonDisabled(true);
    this.ui.setResetVisible(true);
    this.ui.setPuzzleSectionActive(true);
    this.ui.setPuzzleCopy('Selesaikan Puzzle!', 'Klik dua bagian atau gunakan jari telunjuk + cubit untuk menukar.');
    this.ui.updateStatus('Puzzle Dibuat! Tukar bagian untuk menyelesaikan.', 'text-blue-400');
    this.detectPuzzleHandLoop();
  }

  renderPuzzle() {
    this.ui.renderPuzzleGrid(this.state.pieces, this.state.selectedPieceIndex, (index) => this.handlePieceClick(index));
  }

  handlePieceClick(clickedIndex) {
    if (!this.state.puzzleActive || this.state.animating) return;

    const clickedPiece = this.state.pieces[clickedIndex];

    if (this.state.selectedPieceIndex === null) {
      this.state.selectedPieceIndex = clickedIndex;
      clickedPiece.canvas.classList.add('selected');
      this.renderPuzzle();
    } else {
      if (this.state.selectedPieceIndex === clickedIndex) {
        clickedPiece.canvas.classList.remove('selected');
        this.state.selectedPieceIndex = null;
        this.renderPuzzle();
        return;
      }

      const index1 = this.state.selectedPieceIndex;
      const index2 = clickedIndex;
      [this.state.pieces[index1], this.state.pieces[index2]] = [this.state.pieces[index2], this.state.pieces[index1]];
      this.state.selectedPieceIndex = null;
      this.renderPuzzle();
      this.checkWin();
    }
  }

  checkWin() {
    const isSolved = this.state.pieces.every((piece, idx) => piece.originalIndex === idx);

    if (isSolved) {
      this.state.puzzleActive = false;
      this.wasPinching = false;
      this.ui.hideFingerCursor();
      this.ui.clearPuzzleHighlight();
      this.ui.setPuzzleCopy('Selesai!', 'Kerja bagus! Klik ulangi untuk mencoba lagi.');
      this.ui.updateStatus('Puzzle Selesai!', 'text-green-400');
      this.state.pieces.forEach((piece) => piece.canvas.style.border = '2px solid #22c55e');
      this.ui.showModal('Puzzle Selesai! 🎉', 'Anda berhasil menyatukan kembali wajah Anda. Ingin mencoba ekspresi lain?', 'success');
    }
  }

  detectPuzzleHandLoop() {
    if (!this.state.puzzleActive || !this.state.cameraActive) {
      this.ui.hideFingerCursor();
      this.ui.clearPuzzleHighlight();
      return;
    }

    if (this.state.handDetectionInProgress || !this.handposeModel) {
      window.setTimeout(() => this.detectPuzzleHandLoop(), 50);
      return;
    }

    this.state.handDetectionInProgress = true;

    Promise.resolve(this.handposeModel.estimateHands(this.elements.video))
      .then((predictions) => {
        if (predictions.length > 0 && this.state.puzzleActive) {
          const landmarks = predictions[0].landmarks;
          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];

          const vw = this.elements.video.videoWidth;
          const vh = this.elements.video.videoHeight;

          const mx = Math.max(0, Math.min(vw, vw - indexTip[0]));
          const my = Math.max(0, Math.min(vh, indexTip[1]));

          const nx = mx / vw;
          const ny = my / vh;

          const col = Math.min(APP_CONFIG.GRID_SIZE - 1, Math.floor(nx * APP_CONFIG.GRID_SIZE));
          const row = Math.min(APP_CONFIG.GRID_SIZE - 1, Math.floor(ny * APP_CONFIG.GRID_SIZE));
          const cellIndex = row * APP_CONFIG.GRID_SIZE + col;

          this.ui.showFingerCursor();
          this.ui.updateFingerCursor(nx * 100, ny * 100);
          this.ui.highlightPuzzleCell(cellIndex);

          const dx = thumbTip[0] - indexTip[0];
          const dy = thumbTip[1] - indexTip[1];
          const distance = Math.sqrt(dx * dx + dy * dy);

          const isPinching = distance < APP_CONFIG.PINCH_THRESHOLD;

          if (isPinching && !this.wasPinching) {
            this.wasPinching = true;
            this.handlePieceClick(cellIndex);
          } else if (!isPinching) {
            this.wasPinching = false;
          }
        } else {
          this.ui.hideFingerCursor();
          this.ui.clearPuzzleHighlight();
          this.wasPinching = false;
        }
      })
      .catch((error) => {
        console.error('Puzzle hand detection error:', error);
      })
      .finally(() => {
        this.state.handDetectionInProgress = false;
        if (this.state.puzzleActive) {
          window.setTimeout(() => this.detectPuzzleHandLoop(), 50);
        }
      });
  }

  resetApp() {
    this.state.puzzleActive = false;
    this.state.selectedPieceIndex = null;
    this.state.pieces = [];
    this.currentGestureType = null;
    this.wasPinching = false;

    while (this.elements.puzzleGrid.children.length > 1) {
      this.elements.puzzleGrid.removeChild(this.elements.puzzleGrid.lastChild);
    }
    this.ui.hideFingerCursor();
    this.ui.clearPuzzleHighlight();
    this.ui.setResetVisible(false);
    this.ui.setPuzzleSectionActive(false);
    this.ui.setPuzzleCopy('Area Puzzle', 'Tangkap wajah untuk menghasilkan puzzle.');
    this.ui.updateStatus('Lihat ke kamera dan senyum atau tunjukkan tanda damai!', 'text-green-400');
    this.ui.setCaptureButtonDisabled(false);
    this.ui.hideCountdown();
    this.ui.setBadgeActive(this.elements.badgeSmile, false);
    this.ui.setBadgeActive(this.elements.badgePeace, false);
  }

  start() {
    this.bindEvents();
    this.init();
  }
}
