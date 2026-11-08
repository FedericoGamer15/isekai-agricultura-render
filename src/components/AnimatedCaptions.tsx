import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { THEME } from "../theme";
import voData from "../data/vo.json";

interface CaptionsProps {
  sceneKey: string;
  sceneStartFrame: number;
  highlights?: string[];
}

export const AnimatedCaptions: React.FC<CaptionsProps> = ({
  sceneKey,
  sceneStartFrame,
  highlights = [],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneVO = (voData as any)[sceneKey];
  if (!sceneVO || !sceneVO.words || sceneVO.words.length === 0) {
    return null;
  }

  const localTime = Math.max(0, (frame - sceneStartFrame) / fps);

  let activeWordIndex = -1;
  for (let i = 0; i < sceneVO.words.length; i++) {
    const w = sceneVO.words[i];
    if (localTime >= w.start && localTime <= w.end + 0.12) {
      activeWordIndex = i;
      break;
    }
    if (localTime < w.start && activeWordIndex === -1 && i > 0) {
      activeWordIndex = i - 1;
      break;
    }
  }

  if (activeWordIndex === -1 && localTime >= sceneVO.words[sceneVO.words.length - 1].end) {
    activeWordIndex = sceneVO.words.length - 1;
  }

  const chunkSize = 4;
  const chunkIndex = Math.floor(Math.max(0, activeWordIndex) / chunkSize);
  const startIdx = chunkIndex * chunkSize;
  const endIdx = Math.min(sceneVO.words.length, startIdx + chunkSize);
  const visibleWords = sceneVO.words.slice(startIdx, endIdx);

  const cleanWord = (str: string) => str.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, "").toUpperCase();
  const isHighlighted = (wordText: string) => {
    const cleaned = cleanWord(wordText);
    return highlights.some((h) => cleanWord(h) === cleaned || cleaned.includes(cleanWord(h)));
  };

  return (
    <div
      style={{
        position: "absolute",
        top: THEME.safe.subtitleY,
        left: THEME.safe.left,
        right: THEME.safe.right,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 70,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "8px 18px",
          maxWidth: 960,
          padding: "10px 20px",
          backgroundColor: "rgba(40, 54, 24, 0.45)",
          backdropFilter: "blur(4px)",
          borderRadius: 24,
          border: "2px solid rgba(254, 250, 224, 0.4)",
        }}
      >
        {visibleWords.map((w: any, idx: number) => {
          const absoluteIndex = startIdx + idx;
          const isActive = absoluteIndex === activeWordIndex;
          const highlighted = isHighlighted(w.text);

          let color = THEME.colors.white;
          if (highlighted) {
            color = THEME.colors.yellow;
          }
          if (isActive) {
            color = highlighted ? THEME.colors.yellow : THEME.colors.green;
          }

          return (
            <span
              key={absoluteIndex}
              style={{
                fontFamily: THEME.fonts.main,
                fontWeight: 900,
                fontSize: 52,
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
                color,
                textTransform: "uppercase",
                transform: isActive ? "scale(1.16)" : "scale(1.0)",
                transition: "transform 0.08s ease-out",
                textShadow:
                  "0px 4px 10px rgba(0,0,0,0.85), -2px -2px 0px #283618, 2px -2px 0px #283618, -2px 2px 0px #283618, 2px 2px 0px #283618",
                display: "inline-block",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
