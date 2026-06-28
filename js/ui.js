export function createUiController() {
  const elements = {
    video: document.getElementById('video'),
    overlay: document.getElementById('overlay'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    countdownOverlay: document.getElementById('countdown-overlay'),
    countdownText: document.getElementById('countdown-text'),
    appStatus: document.getElementById('app-status'),
    btnCapture: document.getElementById('btn-capture'),
    btnReset: document.getElementById('btn-reset'),
    puzzleSection: document.getElementById('puzzle-section'),
    puzzleGrid: document.getElementById('puzzle-grid'),
    puzzleTitle: document.getElementById('puzzle-title'),
    puzzleInstructions: document.getElementById('puzzle-instructions'),
    captureCanvas: document.getElementById('capture-canvas'),
    badgeSmile: document.getElementById('badge-smile'),
    badgePeace: document.getElementById('badge-peace'),
    modal: document.getElementById('message-modal'),
    modalContent: document.getElementById('message-modal-content'),
    modalIcon: document.getElementById('message-icon'),
    modalTitle: document.getElementById('message-title'),
    modalBody: document.getElementById('message-body'),
    btnCloseModal: document.getElementById('btn-close-modal')
  };

  function updateStatus(text, colorClass = 'text-blue-400') {
    elements.appStatus.textContent = text;
    elements.appStatus.className = `text-sm font-medium h-5 ${colorClass}`;
  }

  function setLoadingStep(step, total, text) {
    elements.loadingText.textContent = `${text} (${step}/${total})`;
  }

  function showLoading() {
    elements.loadingOverlay.classList.remove('hidden');
  }

  function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
  }

  function setCaptureButtonDisabled(disabled) {
    elements.btnCapture.disabled = disabled;
  }

  function setResetVisible(visible) {
    elements.btnReset.classList.toggle('hidden', !visible);
  }

  function setPuzzleSectionActive(active) {
    elements.puzzleSection.classList.toggle('opacity-50', !active);
    elements.puzzleSection.classList.toggle('pointer-events-none', !active);
  }

  function setBadgeActive(badgeEl, isActive) {
    badgeEl.classList.toggle('active', isActive);
  }

  function showCountdown(value) {
    elements.countdownOverlay.classList.remove('hidden');
    elements.countdownText.textContent = value;
  }

  function hideCountdown() {
    elements.countdownOverlay.classList.add('hidden');
  }

  function showModal(title, body, type = 'info') {
    elements.modalTitle.textContent = title;
    elements.modalBody.textContent = body;
    elements.modalIcon.textContent = type === 'success' ? '🎉' : type === 'error' ? '⚠️' : '🔔';
    elements.modal.classList.remove('hidden');
    void elements.modal.offsetWidth;
    elements.modal.classList.remove('opacity-0');
    elements.modalContent.classList.remove('scale-95');
  }

  function closeModal() {
    elements.modal.classList.add('opacity-0');
    elements.modalContent.classList.add('scale-95');
    window.setTimeout(() => elements.modal.classList.add('hidden'), 300);
  }

  function renderPuzzleGrid(pieces, selectedIndex, onPieceSelect) {
    elements.puzzleGrid.innerHTML = '';

    pieces.forEach((piece, index) => {
      piece.canvas.className = 'puzzle-piece w-full h-full object-cover rounded-sm border-2 border-transparent';
      piece.canvas.dataset.index = String(index);
      piece.canvas.onclick = () => onPieceSelect(index);

      if (selectedIndex === index) {
        piece.canvas.classList.add('selected');
      } else {
        piece.canvas.classList.remove('selected');
      }

      elements.puzzleGrid.appendChild(piece.canvas);
    });
  }

  function setPuzzleCopy(title, instructions) {
    elements.puzzleTitle.textContent = title;
    elements.puzzleInstructions.textContent = instructions;
  }

  return {
    elements,
    updateStatus,
    setLoadingStep,
    showLoading,
    hideLoading,
    setCaptureButtonDisabled,
    setResetVisible,
    setPuzzleSectionActive,
    setBadgeActive,
    showCountdown,
    hideCountdown,
    showModal,
    closeModal,
    renderPuzzleGrid,
    setPuzzleCopy
  };
}
