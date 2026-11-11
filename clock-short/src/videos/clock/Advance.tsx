import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { continueRender, delayRender, useCurrentFrame } from "remotion";

/** Remotion advances R3F in an effect that runs BEFORE the EffectComposer has subscribed its render loop,
 *  so the composer never draws. Advance again a moment later, holding the frame until then. */
export const Advance: React.FC = () => {
  const { advance } = useThree();
  const frame = useCurrentFrame();
  useEffect(() => {
    const h = delayRender("advance after composer");
    const t = setTimeout(() => { advance(performance.now()); continueRender(h); }, 300);
    return () => { clearTimeout(t); continueRender(h); };
  }, [frame, advance]);
  return null;
};
