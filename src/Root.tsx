import React from "react";
import { Composition } from "remotion";
import { MainSequence } from "./MainSequence";

export const Root: React.FC = () => {
  return (
    <Composition
      id="IsekaiAgricultura"
      component={MainSequence}
      durationInFrames={3600}
      fps={60}
      width={1080}
      height={1920}
    />
  );
};

export default Root;
