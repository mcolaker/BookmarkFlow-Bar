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
  const badgeProgress = spring({frame: frame - 4, fps: 30, config: {damping: 16, stiffness: 95}});
  const lineProgress = interpolate(frame, [20, 74], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <SceneShell duration={duration}>
      <AbsoluteFill style={{padding: "90px 110px"}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%"}}>
          <Wordmark compact />
          <div
            style={{
              opacity: clip(badgeProgress),
              transform: `scale(${clip(badgeProgress)})`,
              border: "1px solid rgba(242,201,76,.45)",
              borderRadius: 999,
              padding: "8px 20px",
              background: "rgba(242,201,76,.12)",
              color: theme.gold,
              fontSize: 16,
              fontWeight: 850,
              letterSpacing: ".08em",
            }}
          >
            v2.0 POWER SUITE
          </div>
        </div>
        <div style={{marginTop: 110, maxWidth: 1260}}>
          <div
            style={{
              fontSize: 104,
              lineHeight: 1.0,
              letterSpacing: "-.065em",
              fontWeight: 900,
              transform: `translateY(${(1 - clip(titleProgress)) * 40}px)`,
              opacity: clip(titleProgress),
            }}
          >
            Your bookmarks.
            <br />
            <span style={{color: theme.gold}}>Supercharged.</span>
          </div>
          <div
            style={{
              marginTop: 30,
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

const BarScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const tooltipProgress = spring({frame: frame - 45, fps: 30, config: {damping: 15, stiffness: 90}});
  return (
    <SceneShell duration={duration} accent="blue">
      <AbsoluteFill style={{padding: "92px 96px", display: "flex", alignItems: "center", gap: 86}}>
        <CopyBlock
          eyebrow="Fluid multi-row workspace"
          title={<>More room for the work that matters.</>}
          body="Expand a clean bookmark bar on any web page with Alt+Shift+B, guided by subtle first-run living discovery."
          chips={["Alt + Shift + B", "Multi-Row Density", "Living Discovery"]}
        />
        <div style={{position: "relative"}}>
          <BrowserFrame
            sequence="generated/sequences/bar-open-close"
            sequenceFrames={60}
            title="Real extension · synthetic bookmarks"
            loopFrames={150}
            style={{width: 1020, height: 590}}
          />
          {frame >= 40 && frame <= 280 ? (
            <div
              style={{
                position: "absolute",
                top: 72,
                left: 64,
                opacity: clip(tooltipProgress),
                transform: `translateY(${(1 - clip(tooltipProgress)) * 10}px)`,
                background: "#0e1420",
                border: "1px solid rgba(242,201,76,.4)",
                boxShadow: "0 12px 32px rgba(0,0,0,.6), 0 0 16px rgba(242,201,76,.2)",
                borderRadius: 10,
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 700,
                color: theme.gold,
                zIndex: 20,
              }}
            >
              <span>✨</span> Click or Alt + Shift + B to open bookmarks
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

const SearchScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, duration], [1.02, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return (
    <SceneShell duration={duration} accent="gold">
      <AbsoluteFill style={{padding: "84px 96px"}}>
        <div style={{display: "flex", alignItems: "flex-end", justifyContent: "space-between"}}>
          <CopyBlock
            eyebrow="Spotlight Command Palette"
            title={<>Search anything.<br />Run any superpower.</>}
            body="Press Alt+Shift+K on any page. Instant fuzzy search across thousands of bookmarks and zero-latency #tag commands."
            chips={["Alt + Shift + K", "#stash", "#health", "#reading", "#ai"]}
            width={540}
          />
          <div style={{transform: `scale(${zoom})`, transformOrigin: "bottom right", position: "relative"}}>
            <BrowserFrame
              image="generated/assets/palette.png"
              title="Spotlight Palette · #tag commands"
              style={{width: 1080, height: 675}}
            />
            <div
              style={{
                position: "absolute",
                bottom: 36,
                left: 48,
                display: "flex",
                gap: 10,
                background: "rgba(13,17,24,.94)",
                border: "1px solid rgba(242,201,76,.35)",
                borderRadius: 14,
                padding: "10px 16px",
                boxShadow: "0 16px 40px rgba(0,0,0,.6)",
              }}
            >
              <span style={{fontSize: 13, fontWeight: 800, color: theme.gold}}>📦 #stash</span>
              <span style={{fontSize: 13, fontWeight: 800, color: "#818cf8"}}>🩺 #health</span>
              <span style={{fontSize: 13, fontWeight: 800, color: "#41d17d"}}>📚 #reading</span>
              <span style={{fontSize: 13, fontWeight: 800, color: "#f87171"}}>⚡ #dev</span>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

const FolderScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const stashPill = spring({frame: frame - 30, fps: 30, config: {damping: 16, stiffness: 90}});
  return (
    <SceneShell duration={duration} accent="green">
      <AbsoluteFill style={{padding: "82px 96px", display: "flex", alignItems: "center", gap: 82}}>
        <div style={{position: "relative"}}>
          <BrowserFrame
            sequence="generated/sequences/folder-rail"
            sequenceFrames={37}
            title="Folder rail · 1-click stash"
            loopFrames={93}
            style={{width: 1060, height: 690}}
          />
          <div
            style={{
              position: "absolute",
              top: 80,
              right: 48,
              opacity: clip(stashPill),
              transform: `scale(${clip(stashPill)})`,
              background: "rgba(22,27,36,.95)",
              border: "1px solid rgba(242,201,76,.4)",
              borderRadius: 16,
              padding: "16px 20px",
              boxShadow: "0 20px 48px rgba(0,0,0,.6)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(242,201,76,.15)",
                display: "grid",
                placeItems: "center",
                fontSize: 22,
              }}
            >
              📥
            </div>
            <div>
              <div style={{fontSize: 16, fontWeight: 800, color: theme.gold}}>1-Click Stash Tabs</div>
              <div style={{fontSize: 13, color: theme.muted, marginTop: 2}}>Saved 14 tabs into session folder</div>
            </div>
          </div>
        </div>
        <CopyBlock
          eyebrow="Stash tabs & pinned rail"
          title={<>Save sessions.<br />Keep structure close.</>}
          body="Click 📥 or Alt+Shift+S to save entire window sessions into dated folders in seconds, alongside your pinned folder rail."
          chips={["📥 Alt + Shift + S", "Zero RAM Bloat", "Pinned Folders"]}
          width={590}
        />
      </AbsoluteFill>
    </SceneShell>
  );
};

const StreamerScene: React.FC<{duration: number}> = ({duration}) => (
  <SceneShell duration={duration} accent="gold">
    <AbsoluteFill style={{padding: "90px 96px", display: "flex", flexDirection: "column", gap: 36}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-end"}}>
        <CopyBlock
          eyebrow="Reading list & health inspector"
          title={<>Read later offline.<br />Audit broken links.</>}
          body="Access your Read Later drawer with 📖 and inspect 404 links, redirects, and duplicates with 🩺 Health Inspector."
          width={900}
        />
        <div style={{display: "flex", gap: 12}}>
          <span style={{border: `1px solid ${theme.panelBorder}`, borderRadius: 999, padding: "8px 16px", background: "rgba(27,34,45,.72)", color: theme.gold, fontSize: 14, fontWeight: 800}}>
            📖 Reading Drawer
          </span>
          <span style={{border: `1px solid ${theme.panelBorder}`, borderRadius: 999, padding: "8px 16px", background: "rgba(27,34,45,.72)", color: "#818cf8", fontSize: 14, fontWeight: 800}}>
            🩺 Health Inspector
          </span>
        </div>
      </div>
      <BrowserFrame
        sequence="generated/sequences/streamer-mode"
        sequenceFrames={34}
        title="Privacy mode & tool suite"
        loopFrames={85}
        style={{width: 1728, height: 380}}
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
          <div style={{width: 610}}>
            <Eyebrow>Themes & Living Discovery</Eyebrow>
            <h1
              style={{
                margin: "28px 0 22px",
                fontSize: 62,
                lineHeight: 1.02,
                letterSpacing: "-.052em",
                fontWeight: 850,
              }}
            >
              Tailored to your flow.
            </h1>
            <p style={{margin: 0, color: theme.muted, fontSize: 24, lineHeight: 1.55}}>
              4 distinct color themes, midnight wallpapers, and living quick tips right on your new tab.
            </p>
            <div style={{display: "flex", gap: 12, marginTop: 28, alignItems: "center"}}>
              <div style={{display: "flex", gap: 8, padding: "8px 14px", background: "rgba(27,34,45,.8)", borderRadius: 12, border: `1px solid ${theme.panelBorder}`}}>
                <span title="Gold Obsidian" style={{width: 22, height: 22, borderRadius: 99, background: "#f2c94c", border: "2px solid #fff"}} />
                <span title="OLED Black" style={{width: 22, height: 22, borderRadius: 99, background: "#000", border: "1px solid #555"}} />
                <span title="Emerald Matrix" style={{width: 22, height: 22, borderRadius: 99, background: "#41d17d", border: "1px solid #222"}} />
                <span title="Cyber Indigo" style={{width: 22, height: 22, borderRadius: 99, background: "#818cf8", border: "1px solid #222"}} />
              </div>
              <span style={{fontSize: 14, color: theme.gold, fontWeight: 700}}>💡 Quick Guide Widget</span>
            </div>
          </div>
          <div style={{transform: `translateY(${pan}px)`}}>
            <BrowserFrame
              image="generated/assets/newtab.png"
              title="New-tab workspace · Midnight theme"
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
    ["100% Local-First Storage", "All bookmarks and settings stay safely inside Chrome."],
    ["Zero Analytics or Tracking", "No third-party SDKs, telemetry, or behavioral profiling."],
    ["Open Source & Auditable", "Fully licensed under Apache 2.0 with complete DCO provenance."],
  ] as const;
  return (
    <SceneShell duration={duration} accent="green">
      <AbsoluteFill style={{padding: "86px 112px"}}>
        <Wordmark compact />
        <div style={{marginTop: 76, display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 90}}>
          <CopyBlock
            eyebrow="Privacy by design"
            title={<>Your bookmarks never leave your machine.</>}
            body="BookmarkFlow operates with zero external server dependencies, fail-closed consent, and strict local sandboxing."
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
            marginTop: 50,
            maxWidth: vertical ? 900 : 1220,
            fontSize: vertical ? 64 : 80,
            lineHeight: 1.03,
            letterSpacing: "-.055em",
            fontWeight: 900,
          }}
        >
          v2.0 Power Suite is live.
          <br />
          <span style={{color: theme.gold}}>Available everywhere.</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: vertical ? "column" : "row",
            gap: 20,
            marginTop: 42,
            color: theme.muted,
            fontSize: vertical ? 18 : 20,
            fontWeight: 700,
            alignItems: "center",
          }}
        >
          <span style={{color: theme.white, background: "rgba(255,255,255,.08)", padding: "6px 14px", borderRadius: 8}}>Chrome</span>
          <span style={{color: theme.white, background: "rgba(255,255,255,.08)", padding: "6px 14px", borderRadius: 8}}>Firefox</span>
          <span style={{color: theme.white, background: "rgba(255,255,255,.08)", padding: "6px 14px", borderRadius: 8}}>Edge</span>
          <span style={{color: theme.white, background: "rgba(255,255,255,.08)", padding: "6px 14px", borderRadius: 8}}>Brave</span>
          {!vertical ? <span style={{color: theme.dim}}>·</span> : null}
          <span style={{color: theme.gold}}>github.com/mcolaker/BookmarkFlow-Bar</span>
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
        eyebrow="v2.0 Power Suite · Fast Workflow"
        title={<>See more.<br />Find faster.</>}
        body="Multi-row bookmark bar, Spotlight command palette, and 1-click tab stash built into your browser."
        chips={["Alt + Shift + B", "Spotlight Palette", "1-Click Stash"]}
      />
      <BrowserFrame
        sequence="generated/sequences/bar-open-close"
        sequenceFrames={60}
        title="BookmarkFlow Bar · v2.0 Power Suite"
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
      <div style={{display: "inline-flex", marginTop: 40, padding: "6px 14px", borderRadius: 99, background: "rgba(242,201,76,.15)", border: `1px solid ${theme.gold}`, color: theme.gold, fontSize: 16, fontWeight: 800, width: "fit-content"}}>
        v2.0 POWER SUITE
      </div>
      <div style={{marginTop: 24, fontSize: 66, lineHeight: 1.02, letterSpacing: "-.055em", fontWeight: 900}}>
        More room for your flow.
      </div>
      <div style={{marginTop: 20, color: theme.muted, fontSize: 24, lineHeight: 1.5}}>
        Spotlight search, tab stash, reading drawer & 4 themes.
      </div>
      <BrowserFrame
        image="generated/assets/overlay.png"
        title="BookmarkFlow Bar · v2.0"
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
          <div style={{display: "inline-flex", padding: "6px 14px", borderRadius: 99, background: "rgba(242,201,76,.15)", border: `1px solid ${theme.gold}`, color: theme.gold, fontSize: 16, fontWeight: 800, marginBottom: 20}}>
            v2.0 POWER SUITE
          </div>
          <Eyebrow>Local-first bookmark workspace</Eyebrow>
          <div style={{marginTop: 20, fontSize: 90, lineHeight: 0.98, letterSpacing: "-.065em", fontWeight: 900}}>
            Your bookmarks.
            <br />
            <span style={{color: theme.gold}}>Supercharged.</span>
          </div>
          <p style={{margin: "24px 0 0", color: theme.muted, fontSize: 22, lineHeight: 1.5}}>
            Multi-row access, Spotlight command palette, 1-click tab stash, reading drawer, and 4 custom themes.
          </p>
          <div style={{marginTop: 28, color: theme.green, fontSize: 17, fontWeight: 800}}>100% Local · Zero Tracking · Open Source (Apache-2.0)</div>
        </div>
        <BrowserFrame image="generated/assets/overlay.png" title="BookmarkFlow Bar · v2.0" style={{width: 1000, height: 625}} />
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);
