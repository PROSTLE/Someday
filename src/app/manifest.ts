import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Someday",
    short_name: "Someday",
    description: "Send a saved Reel to Tick and it lands on your to-do list.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f6fbf9",
    theme_color: "#1e2a4a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
