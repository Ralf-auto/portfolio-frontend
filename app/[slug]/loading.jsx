import '../page-builder.css';
import { SiteFooter, SiteHeader } from '../components/SiteChrome';

export default function LoadingPage() {
  return (
    <div className="builder-site builder-loading-shell" role="status" aria-label="Loading page content">
      <SiteHeader />
      <main>
        <div className="builder-title builder-title-skeleton"><i/><i/><i/></div>
        <section className="builder-section builder-skeleton-section">
          <div><i/><i/><i/><i/></div>
          <i className="builder-skeleton-image"/>
        </section>
        <section className="builder-section builder-skeleton-section builder-skeleton-text">
          <i/><i/><i/><i/><i/>
        </section>
        <p className="builder-loading-caption">Loading page content…</p>
      </main>
      <SiteFooter />
    </div>
  );
}
