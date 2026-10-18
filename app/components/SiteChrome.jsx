'use client';

import { useEffect, useState } from 'react';
import SocialIcon from './SocialIcon';

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window === 'undefined' ? 'http://localhost:8000' : `${window.location.protocol}//${window.location.hostname}:8000`);
const sectionLinks = [
  ['home', 'Home'], ['about', 'About'], ['services', 'Services'],
  ['process', 'Process'], ['portfolio', 'Work'], ['contact', 'Contact'],
];

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

export function SiteSocialLinks({ label = 'Social links' }) {
  const [links, setLinks] = useState([]);
  useEffect(() => {
    fetch(`${API_URL}/api/site-settings/social-links`)
      .then((response) => response.ok ? response.json() : [])
      .then((items) => setLinks(Array.isArray(items) ? items : []))
      .catch(() => setLinks([]));
  }, []);
  if (!links.length) return null;
  return <div className="socials" aria-label={label}>{links.map((item) => <a key={`${item.platform}-${item.url}`} href={item.url} aria-label={item.platform} target={item.icon === 'email' ? undefined : '_blank'} rel={item.icon === 'email' ? undefined : 'noreferrer'}><SocialIcon name={item.icon || item.platform.toLowerCase()} className="social-icon" /></a>)}</div>;
}

export function SiteHeader({ isHome = false, currentSlug = '' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(isHome ? 'home' : currentSlug);
  const [pages, setPages] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/pages`)
      .then((response) => response.ok ? response.json() : [])
      .then((items) => setPages(Array.isArray(items) ? items : []))
      .catch(() => setPages([]));
  }, []);

  useEffect(() => {
    if (!isHome) return;
    const sections = document.querySelectorAll('main section[id]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [isHome]);

  const closeMenu = () => setMenuOpen(false);
  const links = [
    ...sectionLinks.map(([id, label]) => ({ id, label, href: isHome ? `#${id}` : `/#${id}` })),
    ...pages.filter((page) => page.slug !== 'home').map((page) => ({ id: page.slug, label: page.title, href: `/${page.slug}` })),
  ];

  return (
    <header className="site-header wrap">
      <a className="brand" href="/" aria-label="NeroTech home">
        <img className="brand-logo" src="/Image_assets/logo-assets/brand-logo-horizontal-dark.svg" alt="NeroTech" />
      </a>
      <button className="menu-toggle" aria-label="Toggle navigation" aria-expanded={menuOpen} aria-controls="primary-nav" onClick={() => setMenuOpen((open) => !open)}><span /><span /><span /></button>
      <nav id="primary-nav" className={menuOpen ? 'open' : ''} aria-label="Primary navigation">
        {links.map(({ id, label, href }) => <a key={id} className={active === id ? 'active' : ''} href={href} onClick={closeMenu}>{label}</a>)}
      </nav>
      <a className="btn primary cv" href="/#services">Our Capabilities <ArrowIcon /></a>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="footer-inner wrap">
        <div className="footer-brand"><a className="brand" href="/" aria-label="NeroTech home"><img className="brand-logo" src="/Image_assets/logo-assets/brand-logo-horizontal-light.svg" alt="NeroTech" /></a><p>The software development branch<br />of Graphite Solutions.</p></div>
        <div className="footer-contact"><h3>Get in touch</h3><a href="/#contact">✉ &nbsp; Send a project inquiry</a><p>⌖ &nbsp; Available for projects worldwide</p></div>
        <div className="footer-social"><h3>Follow along</h3><SiteSocialLinks label="Follow NeroTech" /></div>
        <p className="footer-doodle">Let’s<br />build<br />what’s<br />next ↗</p>
      </div>
    </footer>
  );
}
