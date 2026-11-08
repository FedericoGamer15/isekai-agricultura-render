import React from "react";
import { Audio, Sequence, staticFile } from "remotion";

interface SoundtrackProps {
  sceneOffsets: number[];
}

export const Soundtrack: React.FC<SoundtrackProps> = ({ sceneOffsets }) => {
  return (
    <>
      {/* 1. Música de fondo cinemática Lo-Fi Medieval */}
      <Audio
        src={staticFile("audio/music.wav")}
        volume={0.22}
      />

      {/* 2. Locuciones TTS sincronizadas s0 a s4 */}
      {sceneOffsets.map((offset, idx) => (
        <Sequence
          key={`vo-s${idx}`}
          from={offset}
          layout="none"
        >
          <Audio
            src={staticFile(`audio/vo/s${idx}.wav`)}
            volume={1.0}
          />
        </Sequence>
      ))}
    </>
  );
};
