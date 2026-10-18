'use client';

import { useEffect, useState } from 'react';
import { SiteFooter, SiteHeader, SiteSocialLinks } from './components/SiteChrome';

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window === 'undefined' ? 'http://localhost:8000' : `${window.location.protocol}//${window.location.hostname}:8000`);

const filters = [
  { label: 'All work', value: 'all' },
  { label: 'Web & SaaS', value: 'web' },
  { label: 'Automation', value: 'automation' },
  { label: 'Mobile & Ecommerce', value: 'commerce' },
];

function Icon({ children, className = '' }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

function ArrowIcon() {
  return <Icon><path d="M5 12h14m-6-6 6 6-6 6" /></Icon>;
}

function ProjectGrid() {
  const [filter, setFilter] = useState('all');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/projects`, { signal: AbortSignal.timeout(45000) })
      .then((response) => {
        if (!response.ok) throw new Error('Could not load projects.');
        return response.json();
      })
      .then(setProjects)
      .catch(() => setError('Project gallery is temporarily unavailable. Please try again soon.'))
      .finally(() => setLoading(false));
  }, []);

  const visibleProjects = projects.filter((project) => filter === 'all' || project.category === filter);

  useEffect(() => {
    if (!selectedProject) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSelectedProject(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [selectedProject]);

  return (
    <>
    <section className="portfolio-section wrap" id="portfolio">
      <div className="section-heading">
        <div><p className="section-kicker">Selected solutions</p><h2>Projects &amp; Products <span>✦</span></h2></div>
        <div className="filters" aria-label="Filter projects">
          {filters.map((item) => (
            <button key={item.value} className={filter === item.value ? 'selected' : ''} onClick={() => setFilter(item.value)} aria-pressed={filter === item.value}>{item.label}</button>
          ))}
        </div>
      </div>
      {loading && <div className="project-skeleton-grid" role="status" aria-label="Loading projects">{Array.from({ length: 6 }, (_, index) => <article className="project-skeleton" key={index}><div className="skeleton-block project-skeleton-image"/><div className="project-skeleton-copy"><i/><i/><i/></div></article>)}</div>}
      {!loading && error && <p className="api-message" role="status">{error}</p>}
      {!loading && !error && visibleProjects.length === 0 && <p className="api-message">No projects in this category yet.</p>}
      <div className="projects project-gallery">
        {visibleProjects.map((project) => (
          <article className="project" key={project.id}>
            <button className="case-study-image" type="button" onClick={() => setSelectedProject(project)} aria-label={`View ${project.title} project details`}>
              <img src={project.image_url} alt={`${project.title} project`} loading="lazy" />
              <span className="case-study-arrow"><ArrowIcon /></span>
            </button>
            <div className="project-info"><div><h3>{project.title}</h3><p>{project.summary}</p></div>{project.featured && <span className="project-type">Featured</span>}</div>
          </article>
        ))}
      </div>
      <p className="concept-note">These are independent concept studies created by NeroTech. They do not represent client work or production results.</p>
    </section>
    {selectedProject && <div className="project-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProject(null); }}>
      <section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
        <button className="project-modal-close" type="button" onClick={() => setSelectedProject(null)} aria-label="Close project details">×</button>
        <div className="project-modal-copy">
          <p className="section-kicker">{selectedProject.category} project</p>
          <h2 id="project-modal-title">{selectedProject.title}</h2>
          {selectedProject.summary && <p>{selectedProject.summary}</p>}
          {selectedProject.description && selectedProject.description !== selectedProject.summary && <p>{selectedProject.description}</p>}
          {selectedProject.featured && <span className="project-type">Featured project</span>}
        </div>
        <div className="project-modal-images">
          {[...new Set([selectedProject.image_url, selectedProject.case_study_url, ...(selectedProject.gallery_images || [])].filter(Boolean))].map((imageUrl, index) => <figure key={imageUrl}><img src={imageUrl} alt={`${selectedProject.title} project image ${index + 1}`} /><figcaption>{index === 0 ? 'Project cover' : `Project image ${index + 1}`}</figcaption></figure>)}
        </div>
      </section>
    </div>}
    </>
  );
}

function ServiceList() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/services`, { signal: AbortSignal.timeout(45000) })
      .then((response) => (response.ok ? response.json() : []))
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`service-grid ${loading ? 'service-grid-loading' : ''}`} aria-busy={loading}>
      {loading && Array.from({ length: 4 }, (_, index) => <article className="service-skeleton" key={`service-skeleton-${index}`}><i/><div><i/><i/><i/></div></article>)}
      {services.map((service, index) => (
        <article key={service.id}>
          <span className={`service-icon ${['violet', 'blue', 'green', 'purple'][index % 4]}`}><ServiceIcon type={service.icon} /></span>
          <div><h3>{service.title}</h3><p>{service.description}</p></div>
        </article>
      ))}
    </div>
  );
}

function InquiryForm() {
  const [state, setState] = useState({ name: '', email: '', mobile_number: '', company: '', project_type: '', message: '' });
  const [status, setStatus] = useState('idle');
  const [notice, setNotice] = useState('');

  const update = (event) => setState((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setStatus('sending');
    setNotice('');
    try {
      const response = await fetch(`${API_URL}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Could not send your inquiry.');
      setStatus('sent');
      setNotice(result.message);
      setState({ name: '', email: '', mobile_number: '', company: '', project_type: '', message: '' });
    } catch (error) {
      setStatus('error');
      setNotice(error.message || 'The inquiry service is unavailable. Please try again later.');
    }
  }

  return (
    <form className="inquiry-form" onSubmit={submit}>
      <div className="form-row">
        <label>Name<input name="name" autoComplete="name" minLength="2" maxLength="160" required value={state.name} onChange={update} /></label>
        <label>Email<input name="email" type="email" autoComplete="email" required value={state.email} onChange={update} /></label>
      </div>
      <div className="form-row">
        <label>Company <span>(optional)</span><input name="company" autoComplete="organization" maxLength="160" value={state.company} onChange={update} /></label>
        <label>Mobile number <span>(optional)</span><input name="mobile_number" type="tel" autoComplete="tel" inputMode="tel" maxLength="30" value={state.mobile_number} onChange={update} /></label>
      </div>
      <label>What do you need?<select name="project_type" required value={state.project_type} onChange={update}><option value="" disabled>Select a service</option><option>AI automation</option><option>Website or web app</option><option>SaaS product</option><option>Mobile application</option><option>Ecommerce solution</option><option>Other</option></select></label>
      <label>Project details<textarea name="message" minLength="20" maxLength="5000" rows="4" required value={state.message} onChange={update} placeholder="A few details about your goals, timeline, or current challenge…" /></label>
      <div className="form-submit"><button className="btn primary" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send project inquiry'} <ArrowIcon /></button>{notice && <p className={`form-notice ${status}`} role="status">{notice}</p>}</div>
    </form>
  );
}

function ServiceIcon({ type }) {
  const paths = {
    automation: <><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" /><circle cx="12" cy="12" r="4" /></>,
    web: <><path d="M4 5h16v14H4zM4 9h16M8 7h.01M11 7h.01M7 13h4m-4 3h7" /></>,
    saas: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h5M8 17h3" /></>,
    mobile: <><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M10 5h4m-2 13.5h.01" /></>,
  };
  return <Icon>{paths[type]}</Icon>;
}

export default function HomePage() {
  const [hero, setHero] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/pages/home`)
      .then((response) => (response.ok ? response.json() : null))
      .then((page) => {
        const section = page?.sections?.find((item) => item.type === 'hero');
        if (section) setHero(section.content);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <SiteHeader isHome />
      <main>
        <section className="hero wrap" id="home">
          <div className="hero-copy">
            <p className="eyebrow">{hero?.eyebrow || 'Meet NeroTech'}</p>
            <h1>{hero?.headline_start || 'Ideas'} <span>{hero?.headline_accent || 'to Impact'}</span><i className="spark">✳</i></h1>
            <h2>{hero?.subheading || 'AI Automation & Software Development'}</h2><div className="short-rule" />
            <p className="hero-description">{hero?.body || 'We’re NeroTech, the software development branch of Graphite Solutions. We build practical AI automations and digital products that help businesses work smarter, serve customers better, and grow faster.'}</p>
            <div className="actions"><a className="btn primary" href={hero?.primary_url || '#portfolio'}>{hero?.primary_label || 'Explore Our Work'} <ArrowIcon /></a><a className="btn outline" href={hero?.secondary_url || '#contact'}>{hero?.secondary_label || 'Let’s Talk'} <ArrowIcon /></a></div>
            <SiteSocialLinks />
          </div>
          <div className="hero-visual"><div className="lavender-blob" /><img src={hero?.image_url || '/assets/hero-image.png'} alt={hero?.image_alt || 'Illustration representing software and automation work'} className="hero-character" /><span className="availability"><span>{(hero?.availability || 'AVAILABLE FOR PROJECTS').split(' ')[0]}</span><b className="green-dot" /><span>{(hero?.availability || 'AVAILABLE FOR PROJECTS').split(' ').slice(1).join(' ')}</span></span><span className="side-note">{hero?.side_note || 'Ideas into intelligent products ↘'}</span><span className="hero-star">✧</span></div>
        </section>

        <section className="trust-strip wrap" aria-label="NeroTech capabilities">
          <span><Icon><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></Icon> AI-powered workflows</span>
          <span><Icon><path d="M4 19.5V6.8c0-1 0-1.5.2-1.9.2-.4.5-.7.9-.9.4-.2.9-.2 1.9-.2h10c1 0 1.5 0 1.9.2.4.2.7.5.9.9.2.4.2.9.2 1.9v12.7l-3-2-3 2-3-2-3 2-3-2-3 2Z" /></Icon> End-to-end product delivery</span>
          <span><Icon><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3-9 2 2 4-5" /></Icon> Web, mobile &amp; ecommerce</span>
        </section>

        <ProjectGrid />

        <section className="about-section wrap" id="about">
          <div className="about-art"><div className="about-shape" /><img src="/assets/about-image.png" alt="NeroTech developer working at a workstation" loading="lazy" /><span className="crown">♕</span><span className="about-note">Automate<br />Build<br />Scale ↘</span></div>
          <div className="about-copy"><p className="section-kicker">Who we are</p><h2>Technology that works<br /><span>for real businesses.</span></h2><p>NeroTech is the software development branch of Graphite Solutions. We bring together AI automation and software development to solve operational and customer challenges. Our work spans social media automation, SaaS, websites, mobile applications, and ecommerce solutions.</p><div className="about-points"><span><Icon><path d="m5 12 4 4L19 6" /></Icon> Practical AI</span><span><Icon><path d="m5 12 4 4L19 6" /></Icon> End-to-end builds</span><span><Icon><path d="m5 12 4 4L19 6" /></Icon> Business focused</span></div><a className="text-link" href="#contact">Discuss a project <span>↗</span></a></div>
        </section>

        <section className="services wrap" id="services"><div className="section-heading"><div><p className="section-kicker">What we build</p><h2>Digital solutions for<br /><span>your next stage of growth.</span></h2></div><p className="section-intro">From automating repetitive work to launching a customer-ready product, we take ideas from plan to production.</p></div>
          <ServiceList />
        </section>

        <section className="process-section wrap" id="process"><div className="section-heading"><div><p className="section-kicker">A clear path from idea to launch</p><h2>How we’ll work together</h2></div><p className="section-intro">A practical, collaborative process that keeps the goals visible from kickoff through delivery.</p></div>
          <div className="process-grid">
            <article><span>01</span><Icon><path d="M4 5h16v12H4zM8 21h8M12 17v4" /></Icon><h3>Understand</h3><p>We map your goals, users, current tools, and biggest friction points.</p></article>
            <article><span>02</span><Icon><path d="m4 19 6-6 3 3 7-8M17 8h3v3" /></Icon><h3>Plan</h3><p>We shape a focused solution, scope, and delivery plan around your needs.</p></article>
            <article><span>03</span><Icon><path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-10-2 12" /></Icon><h3>Build &amp; integrate</h3><p>Your website, app, SaaS feature, or automation is developed and connected.</p></article>
            <article><span>04</span><Icon><path d="M5 12a7 7 0 1 0 14 0 7 7 0 0 0-14 0Zm7-4v4l3 2" /></Icon><h3>Launch &amp; improve</h3><p>We test the details, launch, and refine based on real use.</p></article>
          </div>
        </section>

        <section className="testimonial-section wrap"><div className="quote-mark">“</div><blockquote>We bring automation, software, and commerce together to turn ideas into useful tools that save time and support growth.</blockquote><p><span className="avatar">N</span><span><strong>NeroTech</strong><small>Software Development · Graphite Solutions</small></span></p></section>
        <section className="stats wrap"><div className="stat"><Icon><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></Icon><strong>Automate</strong><p>AI workflows &amp; integrations</p></div><div className="stat"><Icon><path d="M4 5h16v14H4zM8 9h8M8 13h5" /></Icon><strong>Develop</strong><p>Websites, SaaS &amp; apps</p></div><div className="stat"><Icon><path d="M3 4h2l2.2 11h10.9l2-8H6m4 13h.01M17 20h.01" /></Icon><strong>Grow</strong><p>Ecommerce &amp; digital products</p></div></section>

        <section className="contact-cta wrap" id="contact"><div><p className="section-kicker">Have a project in mind?</p><h2>Let’s build something<br /><span>that moves you forward.</span></h2><p>Tell us what you’re looking to automate, launch, or improve. Let’s find the right solution for your business.</p><InquiryForm /></div></section>
      </main>

      <SiteFooter />
    </>
  );
}
