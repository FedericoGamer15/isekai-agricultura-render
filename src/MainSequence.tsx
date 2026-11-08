import React from "react";
import { useCurrentFrame } from "remotion";
import { World2D, SCENE_DURATIONS, SCENE_START, C } from "./components/World2D";
import { AnimatedCaptions } from "./components/AnimatedCaptions";
import { Soundtrack } from "./audio/Soundtrack";

export const SCENE_OFFSETS = SCENE_START;

const SCENE_HIGHLIGHTS: Record<string, string[]> = {
  s0: ["atropella", "camión", "isekai", "magia", "granjero", "asquerosamente", "rico"],
  s1: ["edad", "media", "mitad", "tierra", "vacía", "dinero", "hambre"],
  s2: ["lógica", "moderna", "tierra", "vacía", "trigo", "cebada", "nabos", "tréboles", "frijoles", "nutrientes", "gratis"],
  s3: ["nabos", "tréboles", "vacas", "ovejas", "invierno", "carne", "leche", "lana", "abono", "doble", "cosechas"],
  s4: ["fuego", "comprar", "reino", "entero", "lógica", "secundaria", "guarda", "camión"],
};

export const MainSequence: React.FC = () => {
  const frame = useCurrentFrame();

  // Determinar la escena activa (0 a 4)
  let activeScene = 0;
  for (let i = 0; i < SCENE_DURATIONS.length; i++) {
    if (frame >= SCENE_OFFSETS[i] && frame < SCENE_OFFSETS[i + 1]) {
      activeScene = i;
      break;
    }
    if (i === SCENE_DURATIONS.length - 1 && frame >= SCENE_OFFSETS[i]) {
      activeScene = i;
      break;
    }
  }

  const activeLocalFrame = frame - SCENE_OFFSETS[activeScene];
  const activeSceneKey = `s${activeScene}`;

  return (
    <div
      style={{
        position: "relative",
        width: 1080,
        height: 1920,
        overflow: "hidden",
        backgroundColor: C.paper,
      }}
    >
      {/* 1. Capa Visual Vectorial 2D (Sakuga Full Fluid & Multiplane) */}
      <World2D currentScene={activeScene} sceneLocalFrame={activeLocalFrame} />

      {/* 2. Subtítulos Dinámicos (Palabra por palabra con Kinetic Highlight) */}
      <AnimatedCaptions
        sceneKey={activeSceneKey}
        sceneStartFrame={SCENE_OFFSETS[activeScene]}
        highlights={SCENE_HIGHLIGHTS[activeSceneKey] || []}
      />

      {/* 3. Audio Maestro (Música Lo-Fi Medieval + Locución Sincronizada) */}
      <Soundtrack sceneOffsets={SCENE_OFFSETS.slice(0, 5)} />
    </div>
  );
};
