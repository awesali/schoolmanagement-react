import React, { useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "./LandingPage.css";

type IconName = "arrow" | "calendar" | "check" | "chart" | "people" | "wallet" | "message" | "shield" | "spark";

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    chart: <><path d="M4 20V10m5 10V5m5 15v-8m5 8V8" /><path d="M2 20h20" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2" /><path d="M17 5a3 3 0 0 1 0 6m4 9v-2a6 6 0 0 0-4-5.66" /></>,
    wallet: <><rect x="3" y="6" width="18" height="15" rx="2" /><path d="M3 10h18M6 6V4h12" /><path d="M16 15h2" /></>,
    message: <><path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 20l.9-4.5A8.5 8.5 0 1 1 20 11.5Z" /><path d="M8 11h8m-8 4h5" /></>,
    shield: <><path d="M12 2 4 5v6c0 5.5 3.2 9.1 8 11 4.8-1.9 8-5.5 8-11V5l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    spark: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" /><path d="m19 16 .6 1.4L21 18l-1.4.6L19 20l-.6-1.4L17 18l1.4-.6L19 16Z" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Photo({ src, alt, className = "", children }: React.PropsWithChildren<{ src: string; alt: string; className?: string }>) {
  const [loaded, setLoaded] = useState(true);
  return <div className={`lp-photo ${className}`}>
    {loaded && <img src={src} alt={alt} onError={() => setLoaded(false)} />}
    {!loaded && <div className="lp-photo-fallback" aria-hidden="true">{children}</div>}
  </div>;
}

const features: { icon: IconName; title: string; copy: string; tone: string }[] = [
  { icon: "people", title: "Students & staff", copy: "Keep profiles, classes, sections and school records together.", tone: "blue" },
  { icon: "check", title: "Attendance", copy: "Record daily attendance and see the right classroom information.", tone: "mint" },
  { icon: "calendar", title: "Timetables & exams", copy: "Share class schedules, exam timetables and hall tickets in one place.", tone: "peach" },
  { icon: "chart", title: "Results & progress", copy: "Publish marks and give students a clear, printable report card.", tone: "lavender" },
  { icon: "wallet", title: "Fees & transport", copy: "Track assigned fees, payments, receipts and transport details.", tone: "sand" },
  { icon: "message", title: "School communication", copy: "Bring announcements, requests and conversations closer to everyone.", tone: "sky" },
];

export default function LandingPage() {
  const [demo, setDemo] = useState({ name: "", schoolName: "", email: "", phone: "", message: "", website: "" });
  const [demoStatus, setDemoStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [demoError, setDemoError] = useState("");

  const submitDemo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (demoStatus === "sending") return;
    setDemoStatus("sending");
    setDemoError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/demo-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demo),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Your request could not be sent. Please try again.");
      }
      setDemoStatus("success");
      setDemo({ name: "", schoolName: "", email: "", phone: "", message: "", website: "" });
    } catch (error) {
      setDemoStatus("error");
      setDemoError(error instanceof Error ? error.message : "Your request could not be sent. Please try again.");
    }
  };

  return <div className="lp">
    <header className="lp-nav">
      <div className="lp-container lp-nav-inner">
        <Link className="lp-brand" to="/" aria-label="School Management home">
          <span className="lp-brand-symbol"><span /></span>
          <span>School<span className="lp-brand-accent">Management</span></span>
        </Link>
        <nav className="lp-nav-links" aria-label="Main navigation">
          <a href="#platform">Platform</a>
          <a href="#how-it-works">How it works</a>
          <a href="#for-everyone">For everyone</a>
          <a href="#book-demo">Book a demo</a>
        </nav>
        <Link className="lp-nav-login" to="/login">Sign in <Icon name="arrow" size={17} /></Link>
      </div>
    </header>

    <main>
      <section className="lp-hero" aria-labelledby="lp-title">
        <div className="lp-hero-glow lp-hero-glow-one" />
        <div className="lp-hero-glow lp-hero-glow-two" />
        <div className="lp-container lp-hero-grid">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow"><span className="lp-eyebrow-dot" /> ONE CONNECTED SCHOOL WORKSPACE</span>
            <h1 id="lp-title">Every school day, <em>clearer</em> for everyone.</h1>
            <p>From the first bell to the final report card, bring your school’s people, learning and daily work into one simple place.</p>
            <div className="lp-hero-actions">
              <Link className="lp-button lp-button-primary" to="/login">Go to your dashboard <Icon name="arrow" size={19} /></Link>
              <a className="lp-button lp-button-quiet" href="#platform">Explore the platform <span aria-hidden="true">↓</span></a>
            </div>
            <div className="lp-hero-proof"><span className="lp-proof-icon"><Icon name="shield" size={17} /></span> A dedicated space for school teams, teachers and students</div>
          </div>
          <div className="lp-hero-scene" aria-label="Illustrative preview of the school platform">
            <Photo src="/landing/hero-school.webp" alt="Students and teachers at a welcoming school campus" className="lp-hero-photo">
              <span className="lp-fallback-sun" /><span className="lp-fallback-hill" /><span className="lp-fallback-school"><i /><i /><i /><i /></span>
            </Photo>
            <div className="lp-floating-card lp-floating-card-top"><span className="lp-floating-icon"><Icon name="check" size={19} /></span><span><small>Today’s attendance</small><strong>All in one view</strong></span></div>
            <div className="lp-preview-card">
              <div className="lp-preview-head"><div className="lp-preview-mark">S</div><div><small>YOUR SCHOOL</small><strong>Daily overview</strong></div><span className="lp-preview-dots">•••</span></div>
              <div className="lp-preview-stats"><div><small>Classes</small><strong>Timetable</strong></div><div><small>Learning</small><strong>Homework</strong></div><div><small>Progress</small><strong>Results</strong></div></div>
              <div className="lp-preview-rows"><span /><span /><span /></div>
            </div>
            <div className="lp-floating-card lp-floating-card-bottom"><span className="lp-floating-icon lp-floating-icon-orange"><Icon name="spark" size={19} /></span><span><small>One connected place</small><strong>For the whole school</strong></span></div>
          </div>
        </div>
        <div className="lp-container lp-hero-bottom"><span>BUILT FOR THE REAL SCHOOL DAY</span><span className="lp-hero-bottom-line" /><span>Plan · Teach · Connect · Grow</span></div>
      </section>

      <section className="lp-section lp-platform" id="platform" aria-labelledby="lp-platform-title">
        <div className="lp-container">
          <div className="lp-section-heading"><span className="lp-kicker">THE PLATFORM</span><h2 id="lp-platform-title">One place for the work that matters.</h2><p>Every part of the school day stays connected, so the right information reaches the right people.</p></div>
          <div className="lp-feature-grid">{features.map((feature, index) => <article className="lp-feature" key={feature.title} style={{ animationDelay: `${index * 70}ms` }}><span className={`lp-feature-icon lp-tone-${feature.tone}`}><Icon name={feature.icon} size={25} /></span><h3>{feature.title}</h3><p>{feature.copy}</p><span className="lp-feature-number">0{index + 1}</span></article>)}</div>
        </div>
      </section>

      <section className="lp-section lp-process" id="how-it-works" aria-labelledby="lp-process-title">
        <div className="lp-container lp-process-grid">
          <div className="lp-process-visual"><Photo src="/landing/school-day.webp" alt="Teacher supporting students in a bright classroom" className="lp-process-photo"><span className="lp-fallback-book">✦</span><span className="lp-fallback-caption">Room to learn.<br />Space to grow.</span></Photo><div className="lp-process-badge"><Icon name="spark" size={20} /><span>Made for everyday moments</span></div></div>
          <div className="lp-process-copy"><span className="lp-kicker">HOW IT WORKS</span><h2 id="lp-process-title">A smoother day starts with everyone in sync.</h2><p className="lp-process-intro">Each role has a focused view, while school information stays connected across the platform.</p><ol className="lp-steps"><li><span>01</span><div><h3>Set up your school</h3><p>Organise classes, sections, subjects, staff and students.</p></div></li><li><span>02</span><div><h3>Run the day</h3><p>Manage timetables, attendance, homework, fees and updates.</p></div></li><li><span>03</span><div><h3>Keep everyone informed</h3><p>Share exam schedules, results, announcements and messages.</p></div></li></ol></div>
        </div>
      </section>

      <section className="lp-section lp-audiences" id="for-everyone" aria-labelledby="lp-audience-title"><div className="lp-container"><div className="lp-section-heading"><span className="lp-kicker">FOR EVERYONE</span><h2 id="lp-audience-title">A useful view for every role.</h2></div><div className="lp-audience-grid"><article><span className="lp-audience-label">01 / SCHOOL TEAM</span><Icon name="chart" size={28} /><h3>See the whole picture.</h3><p>Keep academic work, people, fees and school operations in view.</p></article><article><span className="lp-audience-label">02 / TEACHERS</span><Icon name="calendar" size={28} /><h3>Stay ready to teach.</h3><p>Find assigned classes, attendance, assignments and exam work.</p></article><article><span className="lp-audience-label">03 / STUDENTS</span><Icon name="people" size={28} /><h3>Know what comes next.</h3><p>Check the timetable, homework, results, fees and school updates.</p></article></div></div></section>

      <section className="lp-section lp-demo" id="book-demo" aria-labelledby="lp-demo-title">
        <div className="lp-container lp-demo-grid">
          <div className="lp-demo-copy"><span className="lp-kicker">BOOK A DEMO</span><h2 id="lp-demo-title">See how it fits your school.</h2><p>Tell us a little about your school. We will use your contact details to get in touch about a demo.</p><div className="lp-demo-note"><Icon name="message" size={22} /><span>Share what you would like to see, and we can focus the conversation on your needs.</span></div></div>
          <form className="lp-demo-form" onSubmit={submitDemo}>
            <div className="lp-demo-form-heading"><strong>Request a walkthrough</strong><span>Fields marked * are required.</span></div>
            <div className="lp-demo-fields">
              <label>Your name *<input required maxLength={100} autoComplete="name" value={demo.name} onChange={event => setDemo({ ...demo, name: event.target.value })} placeholder="Your full name" /></label>
              <label>School name *<input required maxLength={150} autoComplete="organization" value={demo.schoolName} onChange={event => setDemo({ ...demo, schoolName: event.target.value })} placeholder="Your school" /></label>
              <label>Email address *<input required type="email" maxLength={254} autoComplete="email" value={demo.email} onChange={event => setDemo({ ...demo, email: event.target.value })} placeholder="you@school.com" /></label>
              <label>Phone number *<input required type="tel" minLength={7} maxLength={20} autoComplete="tel" value={demo.phone} onChange={event => setDemo({ ...demo, phone: event.target.value })} placeholder="Your contact number" /></label>
              <label className="lp-demo-wide">Anything we should know?<textarea maxLength={1000} rows={4} value={demo.message} onChange={event => setDemo({ ...demo, message: event.target.value })} placeholder="Tell us what you are looking for" /></label>
            </div>
            <label className="lp-demo-honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={demo.website} onChange={event => setDemo({ ...demo, website: event.target.value })} /></label>
            <button className="lp-button lp-button-primary lp-demo-submit" type="submit" disabled={demoStatus === "sending"}>{demoStatus === "sending" ? "Sending…" : "Book a demo"}<Icon name="arrow" size={19} /></button>
            {demoStatus === "success" && <p className="lp-demo-feedback lp-demo-success" role="status">Your request has been sent. We will contact you soon.</p>}
            {demoStatus === "error" && <p className="lp-demo-feedback lp-demo-error" role="alert">{demoError}</p>}
          </form>
        </div>
      </section>

      <section className="lp-final"><div className="lp-container lp-final-inner"><div><span className="lp-kicker">READY WHEN YOU ARE</span><h2>Your school day starts here.</h2><p>Sign in to open the space built for your role.</p></div><Link className="lp-button lp-button-light" to="/login">Sign in to your account <Icon name="arrow" size={19} /></Link></div></section>
    </main>
    <footer className="lp-footer"><div className="lp-container"><span className="lp-brand lp-footer-brand"><span className="lp-brand-symbol"><span /></span><span>School<span className="lp-brand-accent">Management</span></span></span><span>Part of <a className="lp-company-link" href="https://cognerasystems.com/" target="_blank" rel="noopener noreferrer">Cognera Systems</a></span><a href="#lp-title">Back to top ↑</a></div></footer>
  </div>;
}
