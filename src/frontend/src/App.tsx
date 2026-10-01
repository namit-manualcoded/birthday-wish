import { ConfettiBurst } from "@/components/ConfettiBurst";
import { FloatingHearts } from "@/components/FloatingHearts";
import { Layout } from "@/components/Layout";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Typewriter } from "@/components/Typewriter";
import { Button } from "@/components/ui/button";
import { useMusic } from "@/hooks/useMusic";
import { useIsOwner, useSiteContent } from "@/hooks/useSiteContent";
import { withPlaceholderFallback } from "@/lib/placeholder-content";
import { cropToTransform } from "@/lib/types";
import type { ResolvedMessage } from "@/lib/types";
import { AdminPage } from "@/pages/AdminPage";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { ChevronDown, Heart, Lock, Pencil } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef, useState } from "react";

/* -------------------------------------------------------------------------- */
/*  Public experience                                                          */
/* -------------------------------------------------------------------------- */

function Hero({
  headline,
  subtext,
  heroPhotoUrl,
  heroCrop,
}: {
  headline: string;
  subtext: string;
  heroPhotoUrl: string | null;
  heroCrop: ResolvedMessage["crop"];
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      data-ocid="hero.section"
      className="grain-overlay relative flex min-h-[92vh] items-center justify-center overflow-hidden px-5 py-20 sm:px-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-subtle" />
      <div className="relative z-10 mx-auto grid w-full max-w-5xl items-center gap-12 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
        <motion.div
          style={reduceMotion ? undefined : { y: textY, opacity: fade }}
          className="order-2 text-center md:order-1 md:text-left"
        >
          <p className="label-eyebrow text-accent">A birthday letter</p>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground text-balance sm:text-5xl lg:text-6xl">
            <Typewriter text={headline} speed={55} startDelay={350} />
          </h1>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg md:mx-0">
            {subtext}
          </p>
          <div className="mt-9 flex justify-center md:justify-start">
            <a
              href="#messages"
              data-ocid="hero.scroll_cue"
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-5 py-2.5 text-sm font-medium text-foreground shadow-subtle transition-smooth hover:border-accent/60 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Read your messages
              <ChevronDown
                className="h-4 w-4 animate-bounce-cue text-accent motion-reduce:animate-none"
                aria-hidden="true"
              />
            </a>
          </div>
        </motion.div>

        <motion.div
          style={reduceMotion ? undefined : { y: photoY }}
          className="order-1 flex justify-center md:order-2"
        >
          <div className="arch-frame relative w-64 shadow-float sm:w-72 md:w-full md:max-w-sm">
            <div className="aspect-[3/4] w-full bg-secondary">
              {heroPhotoUrl ? (
                <img
                  src={heroPhotoUrl}
                  alt="Blush roses and peonies beside a lit candle and a wrapped gift in soft window light"
                  className="h-full w-full object-cover"
                  style={{ transform: cropToTransform(heroCrop ?? undefined) }}
                  loading="eager"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Heart
                    className="h-12 w-12 text-accent/50"
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function MessageSection({
  message,
  index,
}: {
  message: ResolvedMessage;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  const isEven = index % 2 === 0;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const [inView, setInView] = useState(false);

  return (
    <motion.article
      ref={ref}
      data-ocid={`message.item.${index + 1}`}
      initial={reduceMotion ? false : { opacity: 0, y: 40 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      onViewportEnter={() => setInView(true)}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`grid items-center gap-8 md:grid-cols-2 md:gap-14 ${
        isEven ? "" : "md:[&>*:first-child]:order-2"
      }`}
    >
      <div className={isEven ? "md:pr-4" : "md:pl-4"}>
        <span className="label-eyebrow text-accent">
          {String(index + 1).padStart(2, "0")}
        </span>
        <p className="mt-4 font-display text-xl leading-relaxed text-foreground text-balance sm:text-2xl">
          <Typewriter
            text={message.text}
            speed={22}
            startDelay={200}
            active={inView}
          />
        </p>
      </div>

      <div className="flex justify-center">
        {message.photoUrl ? (
          <motion.div
            style={reduceMotion ? undefined : { y: photoY }}
            className={`polaroid w-56 sm:w-64 ${
              isEven ? "rotate-[-2.5deg]" : "rotate-[2.5deg]"
            }`}
          >
            <div className="aspect-square w-full overflow-hidden bg-secondary">
              <img
                src={message.photoUrl}
                alt={`Memory ${index + 1}`}
                className="h-full w-full object-cover"
                style={{
                  transform: cropToTransform(message.crop ?? undefined),
                }}
                loading="lazy"
              />
            </div>
          </motion.div>
        ) : (
          <div
            className={`flex h-40 w-40 items-center justify-center rounded-full bg-secondary/70 ${
              isEven ? "rotate-[-2.5deg]" : "rotate-[2.5deg]"
            }`}
          >
            <Heart className="h-10 w-10 text-accent/60" aria-hidden="true" />
          </div>
        )}
      </div>
    </motion.article>
  );
}

function SignOff() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      data-ocid="signoff.section"
      initial={reduceMotion ? false : { opacity: 0, y: 30 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="bg-gradient-primary px-5 py-24 text-center sm:px-8"
    >
      <div className="mx-auto max-w-2xl">
        <Heart
          className="mx-auto h-8 w-8 fill-primary-foreground/80 text-primary-foreground/80"
          aria-hidden="true"
        />
        <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-primary-foreground text-balance sm:text-4xl">
          Happy birthday, always.
        </h2>
        <p className="mt-5 text-base leading-relaxed text-primary-foreground/80 sm:text-lg">
          Thank you for being the best part of every ordinary day. Here is to
          another year of you.
        </p>
      </div>
    </motion.section>
  );
}

/* -------------------------------------------------------------------------- */
/*  App                                                                        */
/* -------------------------------------------------------------------------- */

export default function App() {
  const { data, isLoading } = useSiteContent();
  const { data: isOwner } = useIsOwner();
  const { login, clear, isAuthenticated, isLoggingIn } = useInternetIdentity();
  const [view, setView] = useState<"site" | "admin">("site");

  const content = withPlaceholderFallback(data);
  const music = useMusic(content.songUrl);

  const showAdmin = view === "admin" && isAuthenticated;

  return (
    <Layout
      headerAction={
        isAuthenticated ? (
          isOwner ? (
            <Button
              type="button"
              size="sm"
              variant={showAdmin ? "ghost" : "outline"}
              data-ocid="owner.open_button"
              onClick={() =>
                setView((current) => (current === "admin" ? "site" : "admin"))
              }
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {showAdmin ? "View site" : "Edit site"}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              data-ocid="auth.logout_button"
              onClick={clear}
            >
              Sign out
            </Button>
          )
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            data-ocid="auth.login_button"
            onClick={() => login()}
            disabled={isLoggingIn}
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            {isLoggingIn ? "Signing in…" : "Owner sign in"}
          </Button>
        )
      }
    >
      {showAdmin ? (
        <AdminPage />
      ) : (
        <>
          <FloatingHearts />
          <ConfettiBurst />

          <Hero
            headline={content.headline}
            subtext={content.subtext}
            heroPhotoUrl={content.heroPhotoUrl}
            heroCrop={content.heroCrop}
          />

          <section
            id="messages"
            data-ocid="messages.section"
            className="relative z-10 mx-auto w-full max-w-5xl px-5 py-20 sm:px-8 sm:py-28"
          >
            <div className="mb-16 text-center">
              <p className="label-eyebrow text-accent">Notes for you</p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
                A few things I wanted to say
              </h2>
            </div>

            {isLoading && !data ? (
              <div
                data-ocid="messages.loading_state"
                className="space-y-16"
                aria-hidden="true"
              >
                {["a", "b", "c"].map((id) => (
                  <div key={id} className="grid gap-8 md:grid-cols-2 md:gap-14">
                    <div className="h-24 animate-pulse rounded-lg bg-muted" />
                    <div className="mx-auto h-40 w-40 animate-pulse rounded-full bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-20 sm:space-y-28">
                {content.messages.map((message, index) => (
                  <MessageSection
                    key={message.id.toString()}
                    message={message}
                    index={index}
                  />
                ))}
              </div>
            )}
          </section>

          <SignOff />

          <MusicPlayer
            isPlaying={music.isPlaying}
            hasStarted={music.hasStarted}
            needsInteraction={music.needsInteraction}
            volume={music.volume}
            onVolumeChange={music.setVolume}
            onToggle={music.toggle}
            onStart={music.start}
          />
        </>
      )}
    </Layout>
  );
}
