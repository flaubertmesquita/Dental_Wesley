import { useEffect, useState, type CSSProperties } from "react";

/**
 * Dr. Wesley's photo.
 * Source: /images/borba.jpg (supplied by the client).
 *  • If it is the original profile card (16:9, photo on the right), the photo
 *    area is cropped out with percentage offsets (resolution independent).
 *  • If it is a regular photo, it is simply cover-fitted.
 *  • If the file is missing, the previous illustrative portrait is used.
 */
const PHOTO_SRC = "/images/borba.jpg";
const FALLBACK_SRC = "/images/doctor-portrait.jpg";

/** Photo areas inside the 1600×900 profile card. */
const CARD = { w: 1600, h: 900 };
const REGIONS = {
  portrait: { x: 985, y: 222, w: 420, h: 525 },
  avatar: { x: 1210, y: 246, w: 176, h: 176 },
} as const;

type Mode = "card" | "photo" | "fallback";
let probe: Promise<Mode> | null = null;

function detectMode(): Promise<Mode> {
  if (!probe) {
    probe = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight > 1.45 ? "card" : "photo");
      img.onerror = () => resolve("fallback");
      img.src = PHOTO_SRC;
    });
  }
  return probe;
}

type Props = {
  variant: keyof typeof REGIONS;
  alt?: string;
  className?: string;
  imgClassName?: string;
  style?: CSSProperties;
};

export default function DoctorPhoto({ variant, alt = "", className = "", imgClassName = "", style }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    let alive = true;
    void detectMode().then((m) => {
      if (alive) setMode(m);
    });
    return () => {
      alive = false;
    };
  }, []);

  const r = REGIONS[variant];
  let content = null;
  if (mode === "card") {
    content = (
      <img
        src={PHOTO_SRC}
        alt={alt}
        draggable={false}
        className="absolute"
        style={{
          maxWidth: "none",
          height: "auto",
          width: `${(CARD.w / r.w) * 100}%`,
          left: `${(-r.x / r.w) * 100}%`,
          top: `${(-r.y / r.h) * 100}%`,
        }}
      />
    );
  } else if (mode) {
    content = (
      <img
        src={mode === "photo" ? PHOTO_SRC : FALLBACK_SRC}
        alt={alt}
        draggable={false}
        className={`h-full w-full object-cover ${imgClassName}`}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden bg-navy-900 ${className}`} style={style} role={alt ? undefined : "presentation"}>
      {content}
    </div>
  );
}
