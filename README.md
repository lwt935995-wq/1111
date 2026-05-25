# Speak & Pull - Text Ribbon Physics

An immersive, physics-based interactive experience where users can physically pull the words they speak out of their own mouth like a continuous ribbon of tape.

## Features

- **Speech Recognition**: Continuous speech-to-text using Web Speech API
- **Hand Tracking**: MediaPipe Holistic for face and hand detection
- **Verlet Physics**: 2D spring-mass system for realistic ribbon simulation
- **Pinch Gestures**: Grab and pull text with pinch detection
- **Infinite Loop Mode**: When all words are pulled, smoothly transition to endless repetition
- **Surreal Aesthetics**: Heavy, moody visual filters for artistic vibe

## How It Works

1. **Speak**: Your words are continuously transcribed via Web Speech API
2. **Flow**: Characters flow out from your mouth at ~30 characters per second
3. **Grab**: Pinch your thumb and index finger near the text ribbon to grab
4. **Pull**: Manually pull the ribbon of text, or let it dangle under gravity
5. **Loop**: Keep pulling and your last phrase repeats infinitely

## Project Structure

```
.
├── index.html              # Main HTML file
├── style.css              # Styling and filters
├── js/
│   ├── verlet-physics.js  # Physics engine implementation
│   ├── speech-engine.js   # Speech recognition and queue management
│   ├── hand-tracking.js   # MediaPipe integration
│   └── main.js            # Main application orchestration
└── README.md
```

## Technologies

- **HTML5**: Canvas for rendering
- **CSS3**: Filters for visual effects
- **Vanilla JavaScript**: No build tools
- **MediaPipe**: Face and hand tracking
- **Web Speech API**: Speech recognition

## Setup

1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. Allow camera and microphone access when prompted
4. Speak naturally and use hand gestures to interact

## Browser Requirements

- Modern browser with:
  - Camera access support
  - Web Speech API support
  - Canvas support
  - WebGL (for MediaPipe)

## Credits

Built with:
- MediaPipe (hand/face tracking)
- Web Speech API (speech recognition)
- Custom Verlet physics engine
