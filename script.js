// script.js
// Drop in your RapidAPI key below (or adapt to your own proxy)
const RAPIDAPI_KEY = "61fae66352msh1149b88bc4b338fp1e189djsnef9335f3667c";
const RAPIDAPI_HOST = "spotify-audio-features-track-analysis.p.rapidapi.com";

// mapRange helper
function mapRange(value, inMin, inMax, outMin, outMax) {
  const v = Math.max(Math.min(value, inMax), inMin);
  return ((v - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

// 🎵 Key mapping (C to B = 1–12)
const keyMap = {
  C: 1,
  "C#": 2, Db: 2,
  D: 3,
  "D#": 4, Eb: 4,
  E: 5,
  F: 6,
  "F#": 7, Gb: 7,
  G: 8,
  "G#": 9, Ab: 9,
  A: 10,
  "A#": 11, Bb: 11,
  B: 12,
};

function keyToNumber(key) {
  if (typeof key === "number") return key; // some APIs use numeric keys (0–11)
  return keyMap[key] ?? null;
}

function extractTrackId(input) {
  if (!input) return "";
  const match = input.match(/track\/([A-Za-z0-9]+)/);
  if (match) return match[1];
  const uriMatch = input.match(/spotify:track:([A-Za-z0-9]+)/);
  if (uriMatch) return uriMatch[1];
  return input.trim();
}

async function fetchAudioFeatures(trackId) {
  const url = `https://${RAPIDAPI_HOST}/tracks/spotify_audio_features?spotify_track_id=${encodeURIComponent(trackId)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": RAPIDAPI_HOST,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  console.log("🎧 Spotify Audio Features Data:", data);
  return data;
}

function applyFeatureHeights(features) {
  // bar1 = key
  // bar2 = tempo (BPM)
  // bar3 = duration (ms)
  // bar4 = energy
  // bar5 = valence
  const barDefs = [
    { id: "bar1", value: features.key, inMin: 1, inMax: 12 },
    { id: "bar2", value: features.tempo, inMin: 50, inMax: 200 },
    { id: "bar3", value: features.duration, inMin: 100000, inMax: 600000 },
    { id: "bar4", value: features.energy, inMin: 0, inMax: 1 },
    { id: "bar5", value: features.valence, inMin: 0, inMax: 1 },
  ];

  const outMin = 72;
  const outMax = 190;

  barDefs.forEach((b) => {
    const el = document.getElementById(b.id);
    if (!el) return;

    if (typeof b.value === "undefined" || b.value === null || isNaN(b.value)) {
      el.style.height = `${(outMin + outMax) / 2}px`;
      return;
    }

    const px = mapRange(b.value, b.inMin, b.inMax, outMin, outMax);
    el.style.height = `${Math.round(px)}px`;
  });
}

function showDebug(text) {
  const debug = document.getElementById("debug");
  if (!debug) return;
  debug.style.display = "block";
  debug.innerText = text;
}

document.addEventListener("DOMContentLoaded", () => {
  const fetchBtn = document.getElementById("fetchBtn");
  const trackInput = document.getElementById("trackInput");

  trackInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fetchBtn.click();
  });

  fetchBtn.addEventListener("click", async () => {
    const raw = trackInput.value.trim();
    if (!raw) {
      alert("Paste a Spotify track URL or ID.");
      return;
    }
    const trackId = extractTrackId(raw);
    if (!trackId) {
      alert("Couldn't read a track ID from that input.");
      return;
    }
  
    try {
      showDebug("Fetching audio features…");
      const payload = await fetchAudioFeatures(trackId);
      const features = (payload && payload.audio_features) ? payload.audio_features : payload;
  
      const normalized = {
        key: keyToNumber(features.key ?? features.key_name ?? null),
        tempo: parseFloat(features.tempo ?? NaN),
        duration: parseFloat(features.duration_ms ?? features.duration ?? NaN),
        energy: parseFloat(features.energy ?? NaN),
        valence: parseFloat(features.valence ?? NaN),
      };
  
      applyFeatureHeights(normalized);
  
      showDebug(
        `Key: ${normalized.key}\n` +
        `Tempo: ${normalized.tempo} BPM\n` +
        `Duration: ${normalized.duration} ms\n` +
        `Energy: ${normalized.energy}\n` +
        `Valence: ${normalized.valence}`
      );
    } catch (err) {
      console.error(err);
      showDebug("Error fetching track: " + (err.message || err));
      alert("There was an error fetching the track. Check console and make sure your RapidAPI key is set in script.js.");
    }
  });
});