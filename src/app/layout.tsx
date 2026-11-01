import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, Caveat, DM_Serif_Display } from "next/font/google";
import { Bubbles } from "@/components/Bubbles";
import "./globals.css";

const serif = DM_Serif_Display({ variable: "--font-dm-serif", weight: "400", subsets: ["latin"] });
const barlow = Barlow({ variable: "--font-barlow", weight: ["400", "500", "600"], subsets: ["latin"] });
const condensed = Barlow_Condensed({ variable: "--font-barlow-condensed", weight: "600", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-caveat", weight: ["400", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Someday",
  description: "Send a saved Reel to Tick and it lands on your to-do list, sorted and ready.",
};

const themeScript = `try{var t=localStorage.getItem("someday-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${serif.variable} ${barlow.variable} ${condensed.variable} ${caveat.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <Bubbles />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
