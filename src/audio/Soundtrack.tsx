import React from "react";
import { Audio, Sequence, staticFile } from "remotion";

const SCENE_START = [0, 420, 1080, 2160, 3000];

export const Soundtrack: React.FC = () => {
  return (
    <>
      {/* 1. Música de fondo cinemática acústica medieval con ducking */}
      <Audio
        src={staticFile("audio/music.wav")}
        volume={0.22}
      />

      {/* 2. Locución (Voiceover en WAV normalizado) sincronizada a cada escena */}
      <Sequence from={SCENE_START[0]} layout="none">
        <Audio src={staticFile("audio/vo/s0.wav")} volume={1.0} />
      </Sequence>
      <Sequence from={SCENE_START[1]} layout="none">
        <Audio src={staticFile("audio/vo/s1.wav")} volume={1.0} />
      </Sequence>
      <Sequence from={SCENE_START[2]} layout="none">
        <Audio src={staticFile("audio/vo/s2.wav")} volume={1.0} />
      </Sequence>
      <Sequence from={SCENE_START[3]} layout="none">
        <Audio src={staticFile("audio/vo/s3.wav")} volume={1.0} />
      </Sequence>
      <Sequence from={SCENE_START[4]} layout="none">
        <Audio src={staticFile("audio/vo/s4.wav")} volume={1.0} />
      </Sequence>
    </>
  );
};

export default Soundtrack;
