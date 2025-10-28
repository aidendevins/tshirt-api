import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <section className="landing">
      <div className="hero">
        <h1>Create custom T‑shirts in minutes</h1>
        <p>Design, preview, and add to your Shopify cart.</p>
        <div className="cta">
          <Link to="/creator" className="btn-primary">Start designing</Link>
          <a href="http://localhost:3000/test" className="btn-secondary" target="_blank" rel="noopener noreferrer">Open full-screen</a>
        </div>
      </div>
    </section>
  );
}


