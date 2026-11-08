import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import voDataRaw from "../data/vo.json";

interface WordTiming {
  text: string;
  start: number;
  end: number;
}

interface SceneVo {
  text: string;
  seconds: number;
  words: WordTiming[];
}

interface TimedWord {
  text: string;
  startFrame: number;
  endFrame: number;
  sceneIndex: number;
}

interface PhraseGroup {
  words: TimedWord[];
  startFrame: number;
  endFrame: number;
}

const SCENE_START = [0, 420, 1080, 2160, 3000];

// Palabras clave a resaltar con colores temáticos
const HIGHLIGHT_WORDS: Record<string, string> = {
  isekai: "#FFB703",
  campesino: "#BC6C25",
  rico: "#52B788",
  dinero: "#FFB703",
  vacía: "#EF233C",
  hambre: "#EF233C",
  trigo: "#FFB703",
  cebada: "#FB8500",
  nabos: "#9B5DE5",
  tréboles: "#52B788",
  frijoles: "#52B788",
  gratis: "#52B788",
  giras: "#FFB703",
  invierno: "#00F5D4",
  abono: "#FFB703",
  reino: "#FFB703",
  camión: "#EF233C",
  lógica: "#52B788",
};

export const AnimatedCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phraseGroups = useMemo(() => {
    const voData = voDataRaw as Record<string, SceneVo>;
    const scenes = ["s0", "s1", "s2", "s3", "s4"];
    const groups: PhraseGroup[] = [];

    scenes.forEach((sKey, sIdx) => {
      const sceneVo = voData[sKey];
      if (!sceneVo || !sceneVo.words || sceneVo.words.length === 0) return;

      const sceneBaseFrame = SCENE_START[sIdx];
      const timedWords: TimedWord[] = sceneVo.words.map((w) => ({
        text: w.text,
        startFrame: sceneBaseFrame + Math.round(w.start * fps),
        endFrame: sceneBaseFrame + Math.round(w.end * fps),
        sceneIndex: sIdx,
      }));

      // Agrupar en fragmentos de 4 palabras
      const WORDS_PER_GROUP = 4;
      for (let i = 0; i < timedWords.length; i += WORDS_PER_GROUP) {
        const slice = timedWords.slice(i, i + WORDS_PER_GROUP);
        const groupStart = slice[0].startFrame;
        const groupEnd = Math.max(slice[slice.length - 1].endFrame, groupStart + 30);
        groups.push({
          words: slice,
          startFrame: groupStart,
          endFrame: groupEnd + 4,
        });
      }
    });

    return groups;
  }, [fps]);

  // Encontrar el grupo activo
  const activeGroup = phraseGroups.find(
    (g) => frame >= g.startFrame && frame <= g.endFrame
  );

  if (!activeGroup) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        right: 40,
        bottom: 240,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "12px 18px",
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      {activeGroup.words.map((w, idx) => {
        const isActive = frame >= w.startFrame && frame <= w.endFrame;
        const isPast = frame > w.endFrame;

        const popProgress = isActive
          ? spring({
              frame: frame - w.startFrame,
              fps,
              config: { damping: 10, stiffness: 180 },
            })
          : 0;

        const cleanWord = w.text.toLowerCase().replace(/[^a-záéíóúñ]/g, "");
        const highlightColor = HIGHLIGHT_WORDS[cleanWord];

        const scale = isActive ? 1 + popProgress * 0.18 : 1;
        const color = isActive
          ? highlightColor || "#FFD166"
          : isPast
          ? "#FEFAE0"
          : "rgba(254, 250, 224, 0.75)";

        return (
          <span
            key={idx}
            style={{
              fontFamily: "'Inter', 'Montserrat', sans-serif",
              fontSize: 54,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "1px",
              color,
              transform: `scale(${scale})`,
              transformOrigin: "center bottom",
              display: "inline-block",
              textShadow:
                "3px 3px 0 #1B1D2E, -3px -3px 0 #1B1D2E, 3px -3px 0 #1B1D2E, -3px 3px 0 #1B1D2E, 0 6px 14px rgba(0,0,0,0.8)",
              filter: isActive && highlightColor ? `drop-shadow(0 0 12px ${highlightColor})` : undefined,
              transition: "color 0.1s ease",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

export default AnimatedCaptions;
