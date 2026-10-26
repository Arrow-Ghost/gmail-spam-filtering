import { readRSections } from "@/lib/r-source";
import { DeckChrome, Marquee } from "@/components/deck/chrome";
import { IntroSlide, ProblemSlide } from "@/components/deck/sections/opening";
import { DataSlide, DescriptiveSlide, LightboxProvider } from "@/components/deck/sections/data";
import { BayesSlide, FilmSlide } from "@/components/deck/sections/bayes";
import { PoissonSlide, ChiSquareSlide } from "@/components/deck/sections/tests";
import { DisguiseSlide, LiveFilterSlide, AccuracySlide } from "@/components/deck/sections/ml";
import { OutroSlide } from "@/components/deck/sections/outro";

export default function Page() {
  const { full, sections } = readRSections();
  const sec = (id: string) => sections.find((s) => s.id === id)?.code ?? "";

  return (
    <LightboxProvider>
      <DeckChrome />
      <main className="relative">
        <IntroSlide />
        <Marquee
          items={[
            String.raw`\text{WINNER!!}`,
            String.raw`P(\text{spam}\mid\text{free})`,
            String.raw`\text{FREE entry}`,
            String.raw`\text{Call 0800 now}`,
            String.raw`\text{Claim your £1000}`,
            String.raw`\text{URGENT!}`,
          ]}
        />
        <ProblemSlide code={sec("3")} />
        <DataSlide sections={sections} />
        <DescriptiveSlide code={sec("1")} />
        <BayesSlide code={sec("2")} />
        <FilmSlide />
        <PoissonSlide code={sec("4")} />
        <Marquee
          tone="pink"
          reverse
          items={[String.raw`H_0:\ \text{independent}`, String.raw`p<2.2\times10^{-16}`, String.raw`\chi^2=\sum\frac{(O-E)^2}{E}`, String.raw`\text{df}=(r-1)(c-1)`, String.raw`\alpha=0.05`]}
        />
        <ChiSquareSlide code={sec("5")} />
        <DisguiseSlide code={sec("7")} />
        <LiveFilterSlide />
        <AccuracySlide code={sec("6")} />
        <OutroSlide full={full} />
      </main>
    </LightboxProvider>
  );
}
