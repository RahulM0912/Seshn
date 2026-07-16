import { ImageResponse } from "next/og";

// Renders the PWA launcher icon (Step 25): the brand's green dot centered on
// the app's #111111 surface — the favicon mark, scaled up. The dot's radius is
// 30% of the icon, comfortably inside the maskable safe zone (a masked circle
// keeps the center 40%), so the same PNG serves `purpose: "any"` and
// `purpose: "maskable"` in the manifest. Shared by the /icon-192.png and
// /icon-512.png routes.
export function renderAppIcon(size: number): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#111111",
        }}
      >
        <div
          style={{
            width: size * 0.6,
            height: size * 0.6,
            borderRadius: "50%",
            backgroundColor: "#22C55E",
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
