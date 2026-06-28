# PuzzleFace Cam v2

PuzzleFace Cam v2 is a browser-based face puzzle experience that uses in-browser computer vision to detect smiles and peace signs, capture a face frame, and turn it into a shuffled 3x3 puzzle.

## Features

- Real-time camera access
- Face detection with face-api.js
- Smile and peace-sign gesture triggers
- Manual capture fallback
- Puzzle generation from the captured face crop
- Interactive swap-based puzzle solving
- Fully client-side, with no server upload required

## Run locally

1. Open the v2 folder in a browser, or serve it with a simple static server.
2. If you want to use a local server, run:

```bash
python -m http.server 8000
```

3. Then open:

```text
http://localhost:8000
```

## Notes

- The app loads machine learning models from CDN assets.
- Camera permission is required to use the experience.
- For best results, use a modern desktop browser.
