import React from "react";
import {Composition} from "remotion";
import {
  BookmarkFlowMaster,
  BookmarkFlowPoster,
  BookmarkFlowTeaser,
  BookmarkFlowX,
} from "./video";

export const FPS = 30;

export const PromoRoot: React.FC = () => (
  <>
    <Composition
      id="BookmarkFlowMaster"
      component={BookmarkFlowMaster}
      durationInFrames={58 * FPS}
      fps={FPS}
      width={1920}
      height={1080}
    />
    <Composition
      id="BookmarkFlowX"
      component={BookmarkFlowX}
      durationInFrames={32 * FPS}
      fps={FPS}
      width={1920}
      height={1080}
    />
    <Composition
      id="BookmarkFlowTeaser"
      component={BookmarkFlowTeaser}
      durationInFrames={15 * FPS}
      fps={FPS}
      width={1080}
      height={1350}
    />
    <Composition
      id="BookmarkFlowPoster"
      component={BookmarkFlowPoster}
      durationInFrames={1}
      fps={FPS}
      width={1920}
      height={1080}
    />
  </>
);
