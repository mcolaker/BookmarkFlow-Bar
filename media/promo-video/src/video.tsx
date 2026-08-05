import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Series,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {fontFamily, theme} from "./theme";

const sceneLengths = {
  intro: 120,
  bar: 390,
  search: 270,
  folders: 240,
  streamer: 180,
  newTab: 210,
  privacy: 180,
  cta: 150,
} as const;

const clip = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const Backdrop: React.FC<{accent?: "gold" | "blue" | "green"}> = ({accent = "gold"}) => {
  const frame = useCurrentFrame();
  const accentColor = accent === "blue" ? theme.blue : accent === "green" ? theme.green : theme.gold;
  const drift = interpolate(frame, [0, 300], [-40, 80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "extend",
  });

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 83% 8%, rgba(242,201,76,.12), transparent 31%), " +
          "radial-gradient(circle at 18% 92%, rgba(89,117,255,.13), transparent 34%), " +
          `linear-gradient(135deg, ${theme.background} 0%, #111722 62%, #0d121b 100%)`,
        color: theme.white,
        fontFamily,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.16,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), " +
            "linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          transform: `translate(${drift * 0.08}px, ${drift * 0.04}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          borderRadius: "50%",
          right: -260 + drift,
          bottom: -390,
          background: accentColor,
          opacity: 0.08,
          filter: "blur(100px)",
        }}
      />
    </AbsoluteFill>
  );
};

const Wordmark: React.FC<{compact?: boolean}> = ({compact = false}) => (
  <div style={{display: "flex", alignItems: "center", gap: compact ? 14 : 20}}>
    <div
      style={{
        display: "grid",
        placeItems: "center",
        width: compact ? 48 : 70,
        height: compact ? 48 : 70,
        borderRadius: compact ? 14 : 20,
        border: "1px solid rgba(242,201,76,.48)",
        background: theme.goldSoft,
        color: theme.gold,
        fontSize: compact ? 17 : 24,
        fontWeight: 900,
        letterSpacing: "-.04em",
        boxShadow: "0 16px 50px rgba(0,0,0,.25)",
      }}
    >
      BF
    </div>
    <div style={{fontSize: compact ? 22 : 30, fontWeight: 800, letterSpacing: "-.025em"}}>
      BookmarkFlow Bar
    </div>
  </div>
);

const SceneShell: React.FC<{
  children: React.ReactNode;
  duration: number;
  accent?: "gold" | "blue" | "green";
  final?: boolean;
}> = ({children, duration, accent, final = false}) => {
  const frame = useCurrentFrame();
  const entrance = spring({frame, fps: 30, config: {damping: 18, stiffness: 95, mass: 0.9}});
  const fadeOut = final
    ? 1
    : interpolate(frame, [duration - 16, duration], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  return (
    <AbsoluteFill
      style={{
        opacity: clip(entrance) * fadeOut,
        color: theme.white,
        fontFamily,
      }}
    >
      <Backdrop accent={accent} />
      <AbsoluteFill style={{transform: `translateY(${(1 - clip(entrance)) * 28}px)`}}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Eyebrow: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      color: theme.gold,
      fontSize: 18,
      fontWeight: 850,
      letterSpacing: ".16em",
      textTransform: "uppercase",
    }}
  >
    {children}
  </div>
);

const CopyBlock: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  chips?: string[];
  width?: number;
}> = ({eyebrow, title, body, chips = [], width = 610}) => (
  <div style={{width}}>
    <Eyebrow>{eyebrow}</Eyebrow>
    <h1
      style={{
        margin: "28px 0 22px",
        fontSize: 66,
        lineHeight: 1.02,
        letterSpacing: "-.052em",
        fontWeight: 850,
      }}
    >
      {title}
    </h1>
    <p style={{margin: 0, color: theme.muted, fontSize: 25, lineHeight: 1.55}}>{body}</p>
    {chips.length ? (
      <div style={{display: "flex", gap: 12, flexWrap: "wrap", marginTop: 34}}>
        {chips.map((chip) => (
          <span
            key={chip}
            style={{
              border: `1px solid ${theme.panelBorder}`,
              borderRadius: 999,
              padding: "11px 16px",
              background: "rgba(27,34,45,.72)",
              color: "#d8dee8",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {chip}
          </span>
        ))}
      </div>
    ) : null}
  </div>
);

const BrowserFrame: React.FC<{
  image?: string;
  sequence?: string;
  sequenceFrames?: number;
  title: string;
  loopFrames?: number;
  style?: React.CSSProperties;
  imagePosition?: string;
}> = ({image, sequence, sequenceFrames = 1, title, loopFrames = 150, style, imagePosition = "center"}) => {
  const frame = useCurrentFrame();
  const float = Math.sin(frame / 24) * 5;
  const sequenceIndex = Math.min(
    sequenceFrames - 1,
    Math.floor(((frame % loopFrames) / loopFrames) * sequenceFrames),
  );
  return (
    <div
      style={{
        width: 1040,
        height: 650,
        overflow: "hidden",
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: 28,
        background: theme.backgroundRaised,
        boxShadow: "0 46px 120px rgba(0,0,0,.5)",
        transform: `translateY(${float}px)`,
        ...style,
      }}
    >
      <div
        style={{
          height: 54,
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid #283240",
          padding: "0 20px",
          color: theme.dim,
          fontSize: 13,
          fontWeight: 750,
        }}
      >
        <span style={{width: 10, height: 10, borderRadius: 99, background: "#ff6b6b"}} />
        <span style={{width: 10, height: 10, borderRadius: 99, background: theme.gold}} />
        <span style={{width: 10, height: 10, borderRadius: 99, background: theme.green}} />
        <span style={{marginLeft: 12}}>{title}</span>
      </div>
      <div style={{position: "relative", width: "100%", height: "calc(100% - 54px)", background: "#0d1118"}}>
        {sequence ? (
          <Img
            src={staticFile(`${sequence}/frame-${String(sequenceIndex + 1).padStart(3, "0")}.png`)}
            style={{width: "100%", height: "100%", objectFit: "contain", objectPosition: imagePosition}}
          />
        ) : null}
        {image ? (
          <Img
            src={staticFile(image)}
            style={{width: "100%", height: "100%", objectFit: "contain", objectPosition: imagePosition}}
          />
        ) : null}
      </div>
    </div>
  );
};

const Intro: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const titleProgress = spring({frame: frame - 12, fps: 30, config: {damping: 16, stiffness: 85}});
  const lineProgress = interpolate(frame, [20, 74], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <SceneShell duration={duration}>
      <AbsoluteFill style={{padding: "90px 110px"}}>
        <Wordmark compact />
        <div style={{marginTop: 132, maxWidth: 1260}}>
          <div
            style={{
              fontSize: 112,
              lineHeight: 0.98,
              letterSpacing: "-.07em",
              fontWeight: 900,
              transform: `translateY(${(1 - clip(titleProgress)) * 40}px)`,
              opacity: clip(titleProgress),
            }}
          >
            Your bookmarks.
            <br />
            <span style={{color: theme.gold}}>Your flow.</span>
          </div>
          <div
            style={{
              marginTop: 34,
              width: `${lineProgress * 680}px`,
              height: 3,
              borderRadius: 99,
              background: `linear-gradient(90deg, ${theme.gold}, ${theme.blue})`,
            }}
          />
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

const BarScene: React.FC<{duration: number}> = ({duration}) => (
  <SceneShell duration={duration} accent="blue">
    <AbsoluteFill style={{padding: "92px 96px", display: "flex", alignItems: "center", gap: 86}}>
      <CopyBlock
        eyebrow="Multi-row bookmark bar"
        title={<>More room for the work that matters.</>}
        body="Expand a focused bookmark workspace on ordinary web pages, then collapse it when you want more space."
        chips={["Alt + Shift + B", "Multiple rows", "Compact density"]}
      />
      <BrowserFrame
        sequence="generated/sequences/bar-open-close"
        sequenceFrames={60}
        title="Real extension · synthetic bookmarks"
        loopFrames={150}
        style={{width: 1020, height: 590}}
      />
    </AbsoluteFill>
  </SceneShell>
);

const SearchScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, duration], [1.02, 1.09], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return (
    <SceneShell duration={duration} accent="gold">
      <AbsoluteFill style={{padding: "84px 96px"}}>
        <div style={{display: "flex", alignItems: "flex-end", justifyContent: "space-between"}}>
          <CopyBlock
            eyebrow="Keyboard search"
            title={<>Find anything.<br />Stay in flow.</>}
            body="Search your existing Chrome bookmark library, move with the arrow keys, and open with Enter."
            chips={["Alt + Shift + K", "Arrow keys", "Enter"]}
            width={540}
          />
          <div style={{transform: `scale(${zoom})`, transformOrigin: "bottom right"}}>
            <BrowserFrame
              image="generated/assets/palette.png"
              title="Search palette · project"
              style={{width: 1080, height: 675}}
            />
          </div>
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

const FolderScene: React.FC<{duration: number}> = ({duration}) => (
  <SceneShell duration={duration} accent="green">
    <AbsoluteFill style={{padding: "82px 96px", display: "flex", alignItems: "center", gap: 82}}>
      <BrowserFrame
        sequence="generated/sequences/folder-rail"
        sequenceFrames={37}
        title="Folder rail · device-local choices"
        loopFrames={93}
        style={{width: 1060, height: 690}}
      />
      <CopyBlock
        eyebrow="Pinned folders"
        title={<>Keep your structure close.</>}
        body="Pin important folders to an optional left or right rail without moving your bookmarks into another service."
        chips={["Left or right", "Chrome bookmark IDs", "Device-local"]}
        width={590}
      />
    </AbsoluteFill>
  </SceneShell>
);

const StreamerScene: React.FC<{duration: number}> = ({duration}) => (
  <SceneShell duration={duration} accent="gold">
    <AbsoluteFill style={{padding: "100px 96px", display: "flex", flexDirection: "column", gap: 50}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-end"}}>
        <CopyBlock
          eyebrow="Streamer mode"
          title={<>Less visible text.<br />Same bookmarks.</>}
          body="Reduce bookmark labels to an icon-focused view when you record or share your screen."
          width={800}
        />
        <span style={{color: theme.muted, fontSize: 18, fontWeight: 750}}>Alt + Shift + M</span>
      </div>
      <BrowserFrame
        sequence="generated/sequences/streamer-mode"
        sequenceFrames={34}
        title="Before → icon-focused"
        loopFrames={85}
        style={{width: 1728, height: 350}}
      />
    </AbsoluteFill>
  </SceneShell>
);

const NewTabScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const pan = interpolate(frame, [0, duration], [0, -34], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <SceneShell duration={duration} accent="blue">
      <AbsoluteFill style={{padding: "78px 96px"}}>
        <div style={{display: "flex", alignItems: "center", gap: 82}}>
          <CopyBlock
            eyebrow="Focused new tab"
            title={<>A calmer start to every tab.</>}
            body="Keep bookmarks close and send web searches through the provider already selected in Chrome."
            chips={["Existing bookmarks", "Chrome default search", "English & Turkish"]}
          />
          <div style={{transform: `translateY(${pan}px)`}}>
            <BrowserFrame
              image="generated/assets/newtab.png"
              title="New-tab workspace"
              style={{width: 1040, height: 650}}
            />
          </div>
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

const PrivacyScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const items = [
    ["No BookmarkFlow account", "Use the bookmarks already stored in Chrome."],
    ["No analytics SDK", "No advertising SDK is included."],
    ["No developer-operated server", "The product is designed to work locally first."],
  ] as const;
  return (
    <SceneShell duration={duration} accent="green">
      <AbsoluteFill style={{padding: "86px 112px"}}>
        <Wordmark compact />
        <div style={{marginTop: 76, display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 90}}>
          <CopyBlock
            eyebrow="Privacy by design"
            title={<>Your bookmark library stays in Chrome.</>}
            body="BookmarkFlow has no separate cloud account and does not move your library into a developer-operated service."
            width={690}
          />
          <div style={{display: "grid", gap: 18}}>
            {items.map(([title, body], index) => {
              const progress = spring({frame: frame - index * 10, fps: 30, config: {damping: 18, stiffness: 100}});
              return (
                <div
                  key={title}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "56px 1fr",
                    gap: 18,
                    alignItems: "center",
                    border: `1px solid ${theme.panelBorder}`,
                    borderRadius: 20,
                    padding: "20px 22px",
                    background: "rgba(27,34,45,.82)",
                    transform: `translateX(${(1 - clip(progress)) * 34}px)`,
                    opacity: clip(progress),
                  }}
                >
                  <span
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: "rgba(65,209,125,.12)",
                      color: theme.green,
                      fontSize: 24,
                      fontWeight: 900,
                    }}
                  >
                    ✓
                  </span>
                  <div>
                    <div style={{fontSize: 23, fontWeight: 800}}>{title}</div>
                    <div style={{marginTop: 5, color: theme.muted, fontSize: 16}}>{body}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

const CtaScene: React.FC<{duration: number; vertical?: boolean}> = ({duration, vertical = false}) => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 10) * 0.015;
  return (
    <SceneShell duration={duration} accent="gold" final>
      <AbsoluteFill
        style={{
          padding: vertical ? "110px 72px" : "90px 110px",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div style={{transform: `scale(${pulse})`}}>
          <Wordmark />
        </div>
        <div
          style={{
            marginTop: 54,
            maxWidth: vertical ? 900 : 1220,
            fontSize: vertical ? 66 : 82,
            lineHeight: 1.03,
            letterSpacing: "-.055em",
            fontWeight: 900,
          }}
        >
          Add to Chrome.
          <br />
          <span style={{color: theme.gold}}>Open source on GitHub.</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: vertical ? "column" : "row",
            gap: 16,
            marginTop: 46,
            color: theme.muted,
            fontSize: vertical ? 18 : 20,
            fontWeight: 700,
          }}
        >
          <span>Chrome Web Store</span>
          {!vertical ? <span style={{color: theme.dim}}>·</span> : null}
          <span>github.com/mcolaker/BookmarkFlow-Bar</span>
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

export const BookmarkFlowMaster: React.FC = () => (
  <AbsoluteFill style={{background: theme.background}}>
    <Audio src={staticFile("generated/audio/bookmarkflow-bed.wav")} volume={1} />
    <Series>
      <Series.Sequence durationInFrames={sceneLengths.intro}><Intro duration={sceneLengths.intro} /></Series.Sequence>
      <Series.Sequence durationInFrames={sceneLengths.bar}><BarScene duration={sceneLengths.bar} /></Series.Sequence>
      <Series.Sequence durationInFrames={sceneLengths.search}><SearchScene duration={sceneLengths.search} /></Series.Sequence>
      <Series.Sequence durationInFrames={sceneLengths.folders}><FolderScene duration={sceneLengths.folders} /></Series.Sequence>
      <Series.Sequence durationInFrames={sceneLengths.streamer}><StreamerScene duration={sceneLengths.streamer} /></Series.Sequence>
      <Series.Sequence durationInFrames={sceneLengths.newTab}><NewTabScene duration={sceneLengths.newTab} /></Series.Sequence>
      <Series.Sequence durationInFrames={sceneLengths.privacy}><PrivacyScene duration={sceneLengths.privacy} /></Series.Sequence>
      <Series.Sequence durationInFrames={sceneLengths.cta}><CtaScene duration={sceneLengths.cta} /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);

const XBarScene: React.FC<{duration: number}> = ({duration}) => (
  <SceneShell duration={duration} accent="blue">
    <AbsoluteFill style={{padding: "88px 100px", justifyContent: "center"}}>
      <CopyBlock
        eyebrow="One crowded row → your workspace"
        title={<>See more.<br />Find faster.</>}
        body="A multi-row bookmark bar and keyboard search, built on the bookmarks already in Chrome."
        chips={["Alt + Shift + B", "Alt + Shift + K", "Local-first"]}
      />
      <BrowserFrame
        sequence="generated/sequences/bar-open-close"
        sequenceFrames={60}
        title="BookmarkFlow Bar"
        loopFrames={150}
        style={{position: "absolute", right: 92, top: 214, width: 1040, height: 590}}
      />
    </AbsoluteFill>
  </SceneShell>
);

export const BookmarkFlowX: React.FC = () => (
  <AbsoluteFill style={{background: theme.background}}>
    <Audio src={staticFile("generated/audio/bookmarkflow-bed.wav")} volume={1} />
    <Series>
      <Series.Sequence durationInFrames={60}><Intro duration={60} /></Series.Sequence>
      <Series.Sequence durationInFrames={240}><XBarScene duration={240} /></Series.Sequence>
      <Series.Sequence durationInFrames={210}><SearchScene duration={210} /></Series.Sequence>
      <Series.Sequence durationInFrames={210}><PrivacyScene duration={210} /></Series.Sequence>
      <Series.Sequence durationInFrames={240}><CtaScene duration={240} /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);

const VerticalProduct: React.FC<{duration: number}> = ({duration}) => (
  <SceneShell duration={duration} accent="blue">
    <AbsoluteFill style={{padding: "72px 60px"}}>
      <Wordmark compact />
      <div style={{marginTop: 74, fontSize: 70, lineHeight: 1.02, letterSpacing: "-.055em", fontWeight: 900}}>
        More room for your bookmarks.
      </div>
      <div style={{marginTop: 26, color: theme.muted, fontSize: 25, lineHeight: 1.5}}>
        Multi-row access and fast keyboard search.
      </div>
      <BrowserFrame
        image="generated/assets/overlay.png"
        title="Real extension · synthetic data"
        style={{position: "absolute", left: 58, bottom: 86, width: 964, height: 600}}
      />
    </AbsoluteFill>
  </SceneShell>
);

export const BookmarkFlowTeaser: React.FC = () => (
  <AbsoluteFill style={{background: theme.background}}>
    <Audio src={staticFile("generated/audio/bookmarkflow-bed.wav")} volume={1} />
    <Series>
      <Series.Sequence durationInFrames={75}><Intro duration={75} /></Series.Sequence>
      <Series.Sequence durationInFrames={225}><VerticalProduct duration={225} /></Series.Sequence>
      <Series.Sequence durationInFrames={150}><CtaScene duration={150} vertical /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);

export const BookmarkFlowPoster: React.FC = () => (
  <AbsoluteFill style={{background: theme.background, color: theme.white, fontFamily}}>
    <Backdrop accent="gold" />
    <AbsoluteFill style={{padding: "92px 105px"}}>
      <Wordmark compact />
      <div style={{display: "grid", gridTemplateColumns: "0.86fr 1.14fr", gap: 70, alignItems: "center", height: "100%"}}>
        <div>
          <Eyebrow>Local-first bookmark workspace</Eyebrow>
          <div style={{marginTop: 28, fontSize: 94, lineHeight: 0.98, letterSpacing: "-.065em", fontWeight: 900}}>
            Your bookmarks.
            <br />
            <span style={{color: theme.gold}}>Your flow.</span>
          </div>
          <p style={{margin: "30px 0 0", color: theme.muted, fontSize: 23, lineHeight: 1.5}}>
            Multi-row access, keyboard search, pinned folders, and a focused new tab.
          </p>
          <div style={{marginTop: 32, color: theme.green, fontSize: 17, fontWeight: 800}}>Private by design · Open source</div>
        </div>
        <BrowserFrame image="generated/assets/overlay.png" title="BookmarkFlow Bar" style={{width: 1000, height: 625}} />
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);
