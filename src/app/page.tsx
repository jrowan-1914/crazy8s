import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-6 py-32 overflow-hidden">
        {/* Background radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(240, 165, 0, 0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 text-center max-w-3xl mx-auto space-y-6">
          <p className="uppercase tracking-[0.3em] text-[var(--text-muted)] text-sm font-medium">
            College Basketball Tournament
          </p>
          <h1
            className="font-display text-8xl sm:text-9xl font-800 tracking-tight leading-none gold-text"
            style={{ fontWeight: 800 }}
          >
            CRAZY 8&apos;S
          </h1>
          <p className="text-xl sm:text-2xl text-[var(--text-muted)] max-w-lg mx-auto leading-relaxed">
            Pick 8 teams. Score big on upsets.{" "}
            <span className="text-[var(--text-primary)] font-medium">Win it all.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/leaderboard"
              className="btn-gold px-10 py-3.5 rounded-lg text-lg font-display font-700 uppercase tracking-wide inline-block text-center"
              style={{ fontWeight: 700 }}
            >
              View Leaderboard
            </Link>
            <Link
              href="/login"
              className="px-10 py-3.5 rounded-lg text-lg font-display font-700 uppercase tracking-wide border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-all inline-block text-center"
              style={{ fontWeight: 700 }}
            >
              Admin Login
            </Link>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto w-full px-6">
        <hr className="divider" />
      </div>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto w-full px-6 py-20">
        <h2 className="font-display text-3xl sm:text-4xl font-700 text-center mb-12 uppercase tracking-wide" style={{ fontWeight: 700 }}>
          How It Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              num: "01",
              title: "Draft Your 8",
              desc: "Pick 8 teams from the full 64-team tournament field.",
            },
            {
              num: "02",
              title: "Score on Wins",
              desc: "Every win earns you points equal to that team's seed number.",
            },
            {
              num: "03",
              title: "Chase Upsets",
              desc: "Higher seeds = more points per win. Bet on Cinderella!",
            },
          ].map((step) => (
            <div key={step.num} className="surface-card p-6 space-y-3">
              <span className="scoreboard-num text-5xl gold-text">{step.num}</span>
              <h3 className="font-display text-xl font-700 text-[var(--text-primary)]" style={{ fontWeight: 700 }}>
                {step.title}
              </h3>
              <p className="text-[var(--text-muted)] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Scoring Example */}
      <section className="max-w-4xl mx-auto w-full px-6 pb-20">
        <div className="elevated-card p-8">
          <h3 className="font-display text-xl font-700 uppercase tracking-wide text-[var(--text-muted)] mb-6" style={{ fontWeight: 700 }}>
            Scoring Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="surface-card p-5 flex items-center gap-5">
              <div className="text-center">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Seed</p>
                <p className="scoreboard-num text-4xl text-[var(--accent-gold)]">#13</p>
              </div>
              <div className="h-12 w-px bg-[var(--border)]" />
              <div>
                <p className="text-[var(--text-muted)] text-sm">Wins 3 games</p>
                <p className="scoreboard-num text-3xl text-[var(--success)]">39 pts</p>
              </div>
            </div>
            <div className="surface-card p-5 flex items-center gap-5">
              <div className="text-center">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Seed</p>
                <p className="scoreboard-num text-4xl text-[var(--accent-gold)]">#2</p>
              </div>
              <div className="h-12 w-px bg-[var(--border)]" />
              <div>
                <p className="text-[var(--text-muted)] text-sm">Wins 5 games</p>
                <p className="scoreboard-num text-3xl text-[var(--text-primary)]">10 pts</p>
              </div>
            </div>
          </div>
          <p className="text-[var(--text-muted)] text-sm mt-5 text-center">
            The upset path pays off big. Choose wisely.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 text-center text-[var(--text-muted)] text-sm mt-auto">
        Crazy 8&apos;s &mdash; College Basketball Picks
      </footer>
    </div>
  );
}
