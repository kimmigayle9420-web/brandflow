import Link from "next/link"
import {
  Sparkles,
  Clock,
  Frown,
  CalendarX,
  Layers,
  Lightbulb,
  CalendarDays,
  Check,
} from "lucide-react"

export const metadata = {
  title: "BrandFlow — Content ideas for creators who'd rather be making",
  description:
    "Generate a month of content ideas in minutes. Built for tattoo artists and creators who'd rather be making than marketing.",
}

const palette = {
  bg: "#EDE6DC",
  card: "#FFFFFF",
  brick: "#E06A33",
  brickDark: "#C45A26",
  graphite: "#2D2D2D",
  craft: "#8B7261",
  border: "#C2B5A3",
}

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: palette.bg, color: palette.graphite }} className="min-h-screen">
      <Nav />
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  )
}

function Nav() {
  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md"
      style={{
        backgroundColor: "rgba(237, 230, 220, 0.85)",
        borderBottom: `1px solid ${palette.border}`,
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: palette.brick }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="text-lg font-semibold tracking-tight" style={{ color: palette.graphite }}>
            BrandFlow
          </span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/login"
            className="text-sm font-medium transition-colors hover:opacity-70"
            style={{ color: palette.graphite }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors"
            style={{ backgroundColor: palette.brick }}
          >
            Start free <span aria-hidden>→</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-5xl px-6 pb-20 pt-20 text-center sm:pt-28">
        <div
          className="mx-auto inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium"
          style={{
            borderColor: palette.border,
            backgroundColor: palette.card,
            color: palette.craft,
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: palette.brick }}
          />
          Built for tattoo artists &amp; creators
        </div>

        <h1
          className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
          style={{ color: palette.graphite }}
        >
          Stop staring at a
          <br />
          blank caption box.
        </h1>

        <p
          className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl"
          style={{ color: palette.craft }}
        >
          Generate a month of content ideas in minutes. Built for tattoo artists and creators who&apos;d
          rather be making than marketing.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-base font-semibold text-white shadow-md transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: palette.brick }}
          >
            Start free <span aria-hidden>→</span>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-full border px-7 py-4 text-base font-semibold transition-colors hover:bg-white"
            style={{ borderColor: palette.border, color: palette.graphite }}
          >
            See how it works <span aria-hidden>↓</span>
          </a>
        </div>

        <p className="mt-8 text-sm" style={{ color: palette.craft }}>
          Joining <span className="font-semibold" style={{ color: palette.graphite }}>200+ creators</span>{" "}
          already using BrandFlow
        </p>
      </div>
    </section>
  )
}

function Problem() {
  const pains = [
    {
      icon: Clock,
      title: "Hours on captions",
      body: "You sit down to post one thing and lose an afternoon to wordsmithing.",
    },
    {
      icon: Frown,
      title: "Blank screen paralysis",
      body: "You know your craft, but turning it into a post feels like a different job.",
    },
    {
      icon: CalendarX,
      title: "Posting inconsistently",
      body: "Some weeks you post daily, then disappear for a month. The algorithm notices.",
    },
  ]
  return (
    <section style={{ backgroundColor: palette.graphite }} className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="mx-auto max-w-3xl text-center text-3xl font-bold leading-tight text-white sm:text-5xl">
          You know what you want to say.
          <br />
          <span style={{ color: palette.brick }}>You just don&apos;t know how to say it every single day.</span>
        </h2>
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {pains.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl p-6"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: "rgba(224, 106, 51, 0.15)" }}
              >
                <Icon className="h-5 w-5" style={{ color: palette.brick }} />
              </div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Tell us your niche",
      body: "Tattoo artist? Fitness coach? Ceramicist? We tune everything around the work you actually make.",
    },
    {
      n: "02",
      title: "Generate your content pillars",
      body: "BrandFlow turns your niche into 4–6 content pillars — the themes that make your feed feel like you.",
    },
    {
      n: "03",
      title: "Never run out of ideas again",
      body: "Get a steady stream of hooks, captions, and post ideas pulled from your pillars. Plan a month in minutes.",
    },
  ]
  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: palette.brick }}>
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl" style={{ color: palette.graphite }}>
            From blank page to a month of posts.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.n}
              className="relative rounded-2xl p-8"
              style={{
                backgroundColor: palette.card,
                border: `1px solid ${palette.border}`,
              }}
            >
              <div
                className="text-sm font-mono font-semibold"
                style={{ color: palette.brick }}
              >
                {step.n}
              </div>
              <h3
                className="mt-4 text-xl font-semibold"
                style={{ color: palette.graphite }}
              >
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: palette.craft }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const features = [
    {
      icon: Layers,
      title: "AI Content Pillars",
      body: "Your brand, distilled into the themes you should be posting about. No more guessing what fits.",
      bullets: ["Custom to your niche", "Editable any time", "Reusable across platforms"],
    },
    {
      icon: Lightbulb,
      title: "Ideas Bank",
      body: "A growing library of post ideas tied to your pillars. Save the good ones, ditch the rest.",
      bullets: ["Hooks, captions, and angles", "One-click save to planner", "Search and filter"],
    },
    {
      icon: CalendarDays,
      title: "Content Planner",
      body: "Drag, drop, and schedule the ideas you love into a calendar that keeps you posting consistently.",
      bullets: ["Month-at-a-glance view", "Drafts and scheduling", "Works alongside your tools"],
    },
  ]
  return (
    <section className="py-20 sm:py-28" style={{ backgroundColor: palette.card }}>
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: palette.brick }}>
            What you get
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl" style={{ color: palette.graphite }}>
            Three tools. One simple flow.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, body, bullets }) => (
            <div
              key={title}
              className="rounded-2xl p-8 transition-shadow hover:shadow-md"
              style={{
                backgroundColor: palette.bg,
                border: `1px solid ${palette.border}`,
              }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: palette.brick }}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-5 text-xl font-semibold" style={{ color: palette.graphite }}>
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: palette.craft }}>
                {body}
              </p>
              <ul className="mt-5 space-y-2">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm" style={{ color: palette.graphite }}>
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: palette.brick }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      cadence: "forever",
      blurb: "Try the flow with one brand.",
      cta: "Start free",
      featured: false,
      features: [
        "1 brand profile",
        "Generate content pillars",
        "5 saved ideas",
        "Basic planner",
      ],
    },
    {
      name: "Creator",
      price: "$9",
      cadence: "/month",
      blurb: "For artists posting consistently.",
      cta: "Start free",
      featured: true,
      features: [
        "3 brand profiles",
        "Unlimited content pillars",
        "Unlimited saved ideas",
        "Full content planner",
        "Caption AI assist",
      ],
    },
    {
      name: "Pro",
      price: "$19",
      cadence: "/month",
      blurb: "For studios and small teams.",
      cta: "Start free",
      featured: false,
      features: [
        "Unlimited brand profiles",
        "Everything in Creator",
        "Team collaboration",
        "Priority support",
        "Early access to new tools",
      ],
    },
  ]
  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: palette.brick }}>
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl" style={{ color: palette.graphite }}>
            Honest pricing. No surprises.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base" style={{ color: palette.craft }}>
            Start free. Upgrade when you&apos;re ready. Cancel any time.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="relative flex flex-col rounded-2xl p-8"
              style={{
                backgroundColor: palette.card,
                border: tier.featured ? `2px solid ${palette.brick}` : `1px solid ${palette.border}`,
                boxShadow: tier.featured ? "0 12px 40px -12px rgba(224, 106, 51, 0.35)" : undefined,
              }}
            >
              {tier.featured && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: palette.brick }}
                >
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold" style={{ color: palette.graphite }}>
                {tier.name}
              </h3>
              <p className="mt-1 text-sm" style={{ color: palette.craft }}>
                {tier.blurb}
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight" style={{ color: palette.graphite }}>
                  {tier.price}
                </span>
                <span className="text-sm" style={{ color: palette.craft }}>
                  {tier.cadence}
                </span>
              </div>

              <Link
                href="/signup"
                className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-colors"
                style={
                  tier.featured
                    ? { backgroundColor: palette.brick, color: "#fff" }
                    : {
                        border: `1px solid ${palette.border}`,
                        color: palette.graphite,
                        backgroundColor: "transparent",
                      }
                }
              >
                {tier.cta} <span aria-hidden className="ml-1">→</span>
              </Link>

              <ul className="mt-8 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: palette.graphite }}>
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: palette.brick }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section style={{ backgroundColor: palette.brick }} className="py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Ready to stop staring at a blank screen?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-white/85 sm:text-lg">
          Get your first month of content ideas in the next five minutes.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-base font-semibold shadow-md transition-transform hover:scale-[1.02]"
            style={{ color: palette.brick }}
          >
            Start free <span aria-hidden>→</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-white/90 underline-offset-4 hover:underline"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer style={{ backgroundColor: palette.graphite }} className="py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ backgroundColor: palette.brick }}
          >
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="text-base font-semibold text-white">BrandFlow</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70">
          <a href="#how-it-works" className="transition-colors hover:text-white">
            Features
          </a>
          <a href="#pricing" className="transition-colors hover:text-white">
            Pricing
          </a>
          <Link href="/login" className="transition-colors hover:text-white">
            Sign in
          </Link>
          <Link href="/signup" className="transition-colors hover:text-white">
            Sign up
          </Link>
        </nav>
        <p className="text-xs text-white/50">© {new Date().getFullYear()} BrandFlow</p>
      </div>
    </footer>
  )
}
