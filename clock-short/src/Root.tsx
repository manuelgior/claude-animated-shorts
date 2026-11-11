import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/clock/Bridge";
import { BridgeShort as ClockShort, BRIDGE_FRAMES as CLOCK_FRAMES } from "./videos/clockshort/Short";

export const Root: React.FC = () => (
  <>
    <Composition id="ClockShort" component={ClockShort} durationInFrames={CLOCK_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
