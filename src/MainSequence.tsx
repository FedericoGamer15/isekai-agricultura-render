import React from "react";
import { AbsoluteFill } from "remotion";
import { World2D } from "./components/World2D";
import { AnimatedCaptions } from "./components/AnimatedCaptions";
import { Soundtrack } from "./audio/Soundtrack";

export const MainSequence: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FEFAE0" }}>
      {/* Capa Visual 2D (World2D con acuarela, personajes, SFX y multiplane) */}
      <World2D />

      {/* Capa de Subtítulos Cinéticos Dinámicos */}
      <AnimatedCaptions />

      {/* Capa de Audio y Locución (WAV normalizado sincronizado palabra por palabra) */}
      <Soundtrack />
    </AbsoluteFill>
  );
};

export default MainSequence;
