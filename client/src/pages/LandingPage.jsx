import {useState} from 'react'
import {Link} from 'react-router-dom'

const examplePrompt = 'Create a customer feedback form for a SaaS product onboarding flow'

export default function LandingPage() {
  const [prompt, setPrompt] = useState(examplePrompt)

  return (
    <main className="page landing-page">
      <section className="landing-compact-shell">
        <div className="hero-copy compact-hero">
          <span className="eyebrow">Prompt-first form builder</span>
          <h1>Start with a single sentence.</h1>
          <p>Describe the form you want and move into the builder with a lighter, more focused workflow.</p>

          <div className="landing-prompt-card">
            <label className="prompt-label" htmlFor="landing-prompt">
              Prompt
            </label>
            <textarea
              id="landing-prompt"
              className="prompt-box landing-prompt-box"
              rows="4"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Create a product feedback form for a mobile app launch"
            />
            <div className="cta-row compact-cta-row">
              <button className="secondary-btn" type="button" onClick={() => setPrompt(examplePrompt)}>
                Use example
              </button>
              <span className="landing-inline-note">Generate, edit, publish, and track responses in one flow.</span>
            </div>
            <Link className="primary-btn" to="/auth">
              Start building
            </Link>
          </div>

          <div className="landing-mini-grid">
            <article className="mini-info-card">
              <strong>AI draft</strong>
              <span>Turn a prompt into a form schema quickly.</span>
            </article>
            <article className="mini-info-card">
              <strong>Focused builder</strong>
              <span>Refine questions, theme, and publishing state.</span>
            </article>
            <article className="mini-info-card">
              <strong>Response dashboard</strong>
              <span>Review submissions without changing your workflow.</span>
            </article>
          </div>
        </div>
      </section>
    </main>
  )
}