import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = "Taskev, un gestor de tareas que te dice cuál hacer primero";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const icon = await readFile(join(process.cwd(), "src/app/icon.svg"));
  const iconSrc = `data:image/svg+xml;base64,${icon.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        padding: "0 96px",
        background: "linear-gradient(135deg, #0B1033 0%, #1B2A7A 100%)",
        color: "white",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: next/og renders plain elements, not next/image */}
      <img src={iconSrc} width={280} height={280} alt="" />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginLeft: 72,
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3 }}>
          {SITE_NAME}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 44,
            lineHeight: 1.2,
            color: "#B8C4FF",
            maxWidth: 640,
          }}
        >
          Un gestor de tareas que te dice cuál hacer primero.
        </div>
      </div>
    </div>,
    size,
  );
}
