import '../page-builder.css';
import { SiteFooter, SiteHeader } from '../components/SiteChrome';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default async function DynamicPage({ params }) {
  const { slug } = await params;
  let page;
  try {
    const response = await fetch(`${API}/api/pages/${encodeURIComponent(slug)}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (response.status === 404) return <div className="builder-site"><SiteHeader currentSlug={slug} /><PageNotFound /><SiteFooter /></div>;
    if (!response.ok) throw new Error('Page API request failed');
    page = await response.json();
  } catch {
    return <div className="builder-site"><SiteHeader currentSlug={slug} /><PageUnavailable /><SiteFooter /></div>;
  }

  return <div className="builder-site"><SiteHeader currentSlug={slug} /><main><div className="builder-title"><p>NeroTech · {page.title}</p><h1>{page.title}</h1>{page.description && <p>{page.description}</p>}</div>{page.sections.map(section => <PageSection key={section.id} section={section} />)}</main><SiteFooter /></div>;
}

function PageNotFound() {
  return <main className="builder-error"><h1>Page not found</h1><a href="/">Return to NeroTech</a></main>;
}

function PageUnavailable() {
  return <main className="builder-error"><h1>Page temporarily unavailable</h1><p>We couldn’t load this page right now. Please try again shortly.</p><a href="/">Return to NeroTech</a></main>;
}

function PageSection({ section }) {
  const c = section.content || {};
  const type = section.type;
  const imageUrl = c.image_url || c.image;
  return <section className={`builder-section builder-${type}`}>
    {type === 'hero' ? <><div><p className="builder-eyebrow">{c.eyebrow || section.name}</p><h2>{c.title}</h2><p>{c.body}</p>{c.button_label && <a className="builder-button" href={c.button_url || '/#contact'}>{c.button_label} ↗</a>}</div>{imageUrl && <img src={imageUrl} alt={c.image_alt || ''}/>}</> : type === 'features' ? <><p className="builder-eyebrow">{c.eyebrow || section.name}</p><h2>{c.title}</h2>{c.body && <p>{c.body}</p>}<div className="builder-features">{(c.items || []).map((item, index) => <article key={index}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.body || item.description}</p></article>)}</div></> : type === 'image' ? <>{imageUrl && <img src={imageUrl} alt={c.image_alt || ''}/>}<div><p className="builder-eyebrow">{section.name}</p><h2>{c.title}</h2><p>{c.body}</p></div></> : <><p className="builder-eyebrow">{c.eyebrow || section.name}</p><h2>{c.title}</h2><p>{c.body}</p>{c.button_label && <a className="builder-button" href={c.button_url || '/#contact'}>{c.button_label} ↗</a>}</>}
  </section>;
}
