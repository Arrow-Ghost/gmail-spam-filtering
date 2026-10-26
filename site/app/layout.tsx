import type { Metadata } from "next";
import { Unbounded, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "lenis/dist/lenis.css";
import "./globals.css";
import "./deck.css";

const display = Unbounded({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const sans = Space_Grotesk({ variable: "--font-body", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-code", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "How does your phone know it's spam? · Maths × R",
  description:
    "The probability and statistics behind spam filters (Bayes, Binomial, Poisson, chi-square, Naive Bayes, ROC), computed in R on 5,574 real text messages.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable} dark antialiased`}>
      <body>{children}</body>
    </html>
  );
}
