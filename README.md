# WeatherFlow — Atmospheric Intelligence

> An immersive weather experience that transforms meteorological data into living, breathing visual art.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)
![Three.js](https://img.shields.io/badge/Three.js-R3F-black?style=flat&logo=three.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript)

## Visual Concept

**"A liquid crystal orb that breathes with the atmosphere"**

The interface dissolves into pure atmospheric sensation. Every pixel responds to real weather data—temperature shifts the color warmth, wind animates procedural noise, humidity creates ethereal bloom effects, and pressure affects the visual gravity of floating particles.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Open-Meteo API                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              useWeatherSystem (Hook)                        │
│  • Fetches weather data                                     │
│  • Geolocation support                                      │
│  • Auto-refresh every 5 min                                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Zustand Store (weatherStore)                   │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │   Raw Data     │  │  Normalized    │  │  Atmospheric  │ │
│  │   (API)        │→ │  (0-1 values)  │→ │  (Visuals)    │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
└──────────┬──────────────────────┬───────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────────┐  ┌───────────────────────────────────┐
│    WeatherUI         │  │         WeatherScene (R3F)        │
│  • GSAP animations   │  │  ┌─────────────────────────────┐  │
│  • Framer Motion     │  │  │   AtmosphereBackground      │  │
│  • Variable fonts    │  │  │   (Custom GLSL Shader)      │  │
│  • Micro-copy        │  │  └─────────────────────────────┘  │
└──────────────────────┘  │  ┌─────────────────────────────┐  │
                          │  │   ParticleSystem            │  │
                          │  │   (InstancedMesh)           │  │
                          │  └─────────────────────────────┘  │
                          │  ┌─────────────────────────────┐  │
                          │  │   PostProcessing            │  │
                          │  │   (Bloom, Vignette, etc.)   │  │
                          │  └─────────────────────────────┘  │
                          └───────────────────────────────────┘
```

## Tech Stack

| Category | Technology |
|----------|------------|
| **Core** | React 19, TypeScript, Vite |
| **3D/WebGL** | Three.js, React Three Fiber, Drei |
| **Shaders** | Custom GLSL (Simplex Noise, Voronoi, FBM) |
| **Animation** | GSAP, Framer Motion |
| **State** | Zustand |
| **API** | Open-Meteo (free, no API key required) |

## Kinetic Engine

### Kelvin Color Temperature System
Transitions through natural light temperatures:
- **Blue Hour** (8000K-10000K): Deep shadows, cold light
- **Golden Hour** (2000K-3000K): Warm highlights, soft flares
- **High Noon** (5500K-6500K): Neutral, high contrast

### Weather → Visual Mapping

| Weather Parameter | Visual Effect |
|-------------------|---------------|
| Wind Speed | Noise frequency, typography weight |
| Humidity | Bloom intensity, fog density |
| Pressure | Visual gravity (floating vs heavy) |
| Cloud Cover | Voronoi pattern density |
| Storm Intensity | Chromatic aberration, lightning flashes |
| Temperature | Film grain size, color warmth |

## GLSL Shader Features

- **Simplex Noise**: Organic, flowing patterns
- **Voronoi**: Cloud-like cellular structures
- **FBM (Fractal Brownian Motion)**: Multi-octave detail
- **LCH Color Space**: Perceptually uniform transitions
- **Film Grain**: Temperature-responsive texture
- **Lightning**: Probabilistic flash during storms

## Micro-Copy System

Dynamic headlines that shift with the weather mood:

| Condition | Mood | Example Headlines |
|-----------|------|-------------------|
| Storm | Dramatic | "The sky speaks in thunder" |
| Rain | Contemplative | "A day for dreaming" |
| Sunny | Energetic | "Charged with energy" |
| Snow | Peaceful | "Silence falls softly" |
| Fog | Mysterious | "Veiled in mystery" |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## UX Secrets

- **Variable Font Animation**: Typography weight/slant responds to wind speed
- **Staggered GSAP Reveals**: Weather details animate in sequence
- **Mood-Based Theming**: CSS custom properties shift with weather state
- **Glassmorphism UI**: Frosted glass effect over the procedural background
- **120 FPS Target**: InstancedMesh for particles, off-main-thread updates

---

*"Not an app, but a portal into the atmosphere."*
# weatherFlow
