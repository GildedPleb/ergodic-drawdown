/**
 * r46 U1 (call4): true while a pointer is down on any slider; Cmd/Ctrl+Z is ignored then. Its own
 * module so the app shell can read it without importing Slider (and moving Slider's CSS earlier).
 */
export const sliderHeld = { on: false };
