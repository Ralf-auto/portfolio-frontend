'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightIcon, ArrowRightOnRectangleIcon, ArrowTopRightOnSquareIcon, Bars3Icon, ChartBarIcon, DocumentTextIcon, EnvelopeIcon, FolderIcon, MagnifyingGlassIcon, ShareIcon, Squares2X2Icon, StarIcon, UserGroupIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import SocialIcon, { socialIconOptions } from '../components/SocialIcon';
import MarketingPanel from './MarketingPanel';
import './admin.css';
import './project-media.css';

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window === 'undefined' ? 'http://localhost:8000' : `${window.location.protocol}//${window.location.hostname}:8000`);
const blankProject = { slug: '', title: '', category: 'web', summary: '', description: '', image_url: '', case_study_url: '', gallery_images: [], featured: false, sort_order: 0, is_published: true };
const blankService = { slug: '', title: '', description: '', icon: 'web', sort_order: 0, is_published: true };
const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const navItems = [
  ['Overview', Squares2X2Icon], ['Pages', DocumentTextIcon], ['Projects', FolderIcon],
  ['Services', WrenchScrewdriverIcon], ['Inquiries', EnvelopeIcon], ['Marketing', UserGroupIcon], ['Social links', ShareIcon],
];

export default function AdminPage({ initialSection = 'Overview' }) {
  const [key, setKey] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [data, setData] = useState({ projects: [], services: [], inquiries: [], pages: [] });
  const [section, setSection] = useState(initialSection);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null);
  const [pageSections, setPageSections] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);
  const [inquiryStatus, setInquiryStatus] = useState('all');
  const [dataLoading, setDataLoading] = useState(false);

  const request = useCallback(async (path, options = {}) => {
    const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = { ...(isForm ? {} : { 'Content-Type': 'application/json' }), Authorization: `Bearer ${key}`, ...options.headers };
    const response = await fetch(`${API}${path}`, { ...options, headers, signal: options.signal || AbortSignal.timeout(45000) });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.sessionStorage.removeItem('nerotech-admin-session');
        setKey('');
      }
      throw new Error(body.detail || 'Request failed.');
    }
    return response.status === 204 ? null : response.json();
  }, [key]);

  const refresh = useCallback(async () => {
    if (!key) return;
    setDataLoading(true);
    setError('');
    try {
      const [overview, pages, links] = await Promise.all([request('/api/admin/overview'), request('/api/admin/pages'), request('/api/admin/social-links')]);
      setData({ ...overview, pages: Array.isArray(pages) ? pages : [] });
      setSocialLinks(Array.isArray(links) ? links : []);
    }
    catch (err) { setError(err.name === 'TimeoutError' ? 'The content database is taking longer to wake up. Please retry shortly.' : err.message); }
    finally { setDataLoading(false); }
  }, [key, request]);

  useEffect(() => {
    const saved = window.sessionStorage.getItem('nerotech-admin-session') || '';
    if (saved) { setKey(saved); setDataLoading(true); }
    setAuthChecked(true);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const rows = section === 'Projects' ? data.projects : section === 'Services' ? data.services : data.inquiries;
  const filtered = useMemo(() => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()) && (section !== 'Inquiries' || inquiryStatus === 'all' || row.status === inquiryStatus)), [rows, query, section, inquiryStatus]);

  async function saveKey(event) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${API}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailInput, password: keyInput }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || 'Sign-in failed. Check your email and password.');
      window.sessionStorage.setItem('nerotech-admin-session', result.access_token);
      setKey(result.access_token); setDataLoading(true); setKeyInput(''); setNotice('Signed in. Your session lasts 8 hours.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function saveEditor(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const { kind, item } = editor;
      if (kind === 'Sections') { await saveSection(event); return; }
      const payload = { ...item };
      if (kind === 'Projects') {
        payload.gallery_images = (item.gallery_images_text || '').split('\n').map((url) => url.trim()).filter(Boolean);
        delete payload.gallery_images_text;
      }
      const endpoint = `/api/admin/${kind.toLowerCase()}`;
      const method = item.id ? 'PUT' : 'POST';
      await request(item.id ? `${endpoint}/${item.id}` : endpoint, { method, body: JSON.stringify(payload) });
      setEditor(null); setNotice(`${kind.slice(0, -1)} saved.`); await refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function remove(kind, item) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    try { await request(`/api/admin/${kind.toLowerCase()}/${item.id}`, { method: 'DELETE' }); setNotice(`${kind.slice(0, -1)} deleted.`); await refresh(); }
    catch (err) { setError(err.message); }
  }

  async function statusChange(inquiry, value) {
    try { await request(`/api/admin/inquiries/${inquiry.id}`, { method: 'PATCH', body: JSON.stringify({ status: value }) }); await refresh(); }
    catch (err) { setError(err.message); }
  }

  async function saveSocialLinks(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const saved = await request('/api/admin/social-links', { method: 'PUT', body: JSON.stringify(socialLinks) });
      setSocialLinks(saved); setNotice('Social links saved and published.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function openSections(page) {
    try {
      const result = await request(`/api/admin/pages/${page.id}`);
      setSelectedPage(result.page); setPageSections(result.sections); setSection('Page sections');
    } catch (err) { setError(err.message); }
  }

  async function saveSection(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const { item } = editor;
      const payload = { ...item, content: JSON.parse(item.contentText || '{}') };
      delete payload.contentText;
      await request(item.id ? `/api/admin/sections/${item.id}` : `/api/admin/pages/${selectedPage.id}/sections`, { method: item.id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      const result = await request(`/api/admin/pages/${selectedPage.id}`);
      setPageSections(result.sections); setEditor(null); setNotice('Section saved.');
    } catch (err) { setError(err instanceof SyntaxError ? 'Section content must be valid JSON.' : err.message); }
    finally { setBusy(false); }
  }

  async function uploadHeroImage(file) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const result = await request('/api/admin/uploads/cloudinary', { method: 'POST', body: file, headers: { 'Content-Type': file.type, 'X-File-Name': file.name } });
      const currentContent = JSON.parse(editor.item.contentText || '{}');
      setEditor({ ...editor, item: { ...editor.item, contentText: JSON.stringify({ ...currentContent, image_url: result.url }, null, 2) } });
      setNotice('Image uploaded to Cloudinary. Save the section to publish it.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function uploadProjectImage(file, target) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const result = await request('/api/admin/uploads/cloudinary', { method: 'POST', body: file, headers: { 'Content-Type': file.type, 'X-File-Name': file.name } });
      setEditor((current) => {
        if (!current) return current;
        if (target === 'gallery') {
          const urls = (current.item.gallery_images_text || '').split('\n').map((url) => url.trim()).filter(Boolean);
          return { ...current, item: { ...current.item, gallery_images_text: [...urls, result.url].join('\n') } };
        }
        const field = target === 'case-study' ? 'case_study_url' : 'image_url';
        return { ...current, item: { ...current.item, [field]: result.url } };
      });
      setNotice('Image uploaded to Cloudinary. Save the project to publish it.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function removeSection(item) {
    if (!window.confirm(`Delete section “${item.name}”?`)) return;
    try { await request(`/api/admin/sections/${item.id}`, { method: 'DELETE' }); setPageSections(pageSections.filter(x => x.id !== item.id)); }
    catch (err) { setError(err.message); }
  }

  const newEditor = (kind, item) => {
    const defaults = kind === 'Projects' ? blankProject : kind === 'Services' ? blankService : kind === 'Pages' ? { slug: '', title: '', description: '', is_published: false } : { name: '', section_type: 'text', contentText: '{\n  "title": "Section title",\n  "body": "Add your content here."\n}', sort_order: pageSections.length, is_published: true };
    const editorItem = { ...defaults, ...item };
    if (kind === 'Projects') editorItem.gallery_images_text = (item.gallery_images || []).join('\n');
    if (kind === 'Sections') editorItem.section_type = item.section_type || item.type || 'text';
    setEditor({ kind, item: editorItem });
  };

  return <div className={`app admin-app ${key ? '' : 'admin-auth-screen'} ${section === 'Marketing' ? 'marketing-active' : ''}`}>
    <aside className={`sidebar admin-sidebar ${sidebarOpen ? 'open' : ''}`}><a className="brand" href="/"><span className="brand-icon">◆</span><span>NeroTech<small>ADMIN WORKSPACE</small></span></a>
      <nav aria-label="Admin navigation"><span className="nav-caption">WORKSPACE</span>{navItems.map(([name, NavIcon]) => <a key={name} href={name === 'Overview' ? '/admin' : `/admin/${name.toLowerCase().replaceAll(' ', '-')}`} aria-current={section === name || (name === 'Pages' && section === 'Page sections') ? 'page' : undefined} className={`nav-item ${section === name || (name === 'Pages' && section === 'Page sections') ? 'active' : ''}`}><NavIcon className="admin-icon nav-icon" aria-hidden="true" />{name}</a>)}</nav>
      <div className="profile"><div className="avatar">N</div><div><strong>Site administrator</strong><small>Content workspace</small></div><button className="logout" aria-label="Sign out" title="Sign out" onClick={() => { window.sessionStorage.removeItem('nerotech-admin-session'); setKey(''); setData({ projects: [], services: [], inquiries: [], pages: [] }); }}><ArrowRightOnRectangleIcon className="admin-icon" aria-hidden="true" /></button></div>
    </aside>
    <main className="main"><header className="topbar"><button className="icon-button menu" aria-label="Toggle navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)}><Bars3Icon className="admin-icon" aria-hidden="true" /></button><div className="breadcrumb">Workspace <span>/</span> <strong>{section}</strong></div><div className="top-actions"><label className="search"><MagnifyingGlassIcon className="admin-icon search-icon" aria-hidden="true" /><input aria-label="Search records" placeholder={`Search ${section.toLowerCase()}…`} value={query} onChange={(e) => setQuery(e.target.value)} /></label><a className="site-link" href="/" target="_blank" rel="noreferrer">View website <ArrowTopRightOnSquareIcon className="admin-icon inline-icon" aria-hidden="true" /></a></div></header>
      <div className="content"><div className="welcome"><div><p className="eyebrow">{dateLabel.format(new Date()).toUpperCase()}</p><h1>{section === 'Overview' ? 'Your site at a glance' : section === 'Page sections' ? `Sections · ${selectedPage?.title}` : `Manage ${section.toLowerCase()}`}</h1><p>{section === 'Pages' ? 'Create pages and add reusable sections to build out your site.' : section === 'Marketing' ? 'Organize opted-in contacts, send private campaigns, and follow up on inquiries.' : section === 'Social links' ? 'Choose which social profiles appear in the shared site footer and homepage.' : 'Update the content visitors see on your NeroTech website.'}</p></div>{section !== 'Overview' && section !== 'Inquiries' && section !== 'Marketing' && section !== 'Social links' && <button className="primary" onClick={() => newEditor(section === 'Page sections' ? 'Sections' : section, {})}>＋ Add {section === 'Projects' ? 'project' : section === 'Services' ? 'service' : section === 'Page sections' ? 'section' : 'page'}</button>}</div>
        {!authChecked ? <section className="admin-session-loading" role="status"><span className="login-spinner" /> Restoring your admin session…</section> : !key ? <section className="admin-login-layout"><div className="admin-login-art"><a className="login-brand" href="/">◆ <span>NeroTech<small>ADMIN WORKSPACE</small></span></a><div className="login-art-content"><span className="login-orbit orbit-one"/><span className="login-orbit orbit-two"/><span className="login-art-mark">N</span><p>One workspace.<br/><strong>Every detail in control.</strong></p><small>Manage pages, projects, and inquiries in one place.</small></div><span className="login-art-footer">NEROTECH · CONTENT STUDIO</span></div><div className="admin-login-panel"><div className="login-mobile-brand">◆ NeroTech <span>ADMIN</span></div><p className="login-eyebrow">ADMIN WORKSPACE</p><h1>Welcome back</h1><p className="login-intro">Sign in to continue managing your website.</p>{error && <div className="admin-alert" role="alert">{error}</div>}<form className="admin-login-form" onSubmit={saveKey}><label>Email address<input type="email" autoComplete="username" placeholder="you@company.com" value={emailInput} onChange={e => setEmailInput(e.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" placeholder="Enter your password" value={keyInput} onChange={e => setKeyInput(e.target.value)} required /></label><button className="primary" disabled={busy}>{busy ? <><span className="login-spinner"/> Signing in…</> : <>Sign in <span>→</span></>}</button></form><div className="login-secure-note"><span>◆</span> Secure admin access <i/> Sessions expire after 8 hours</div></div></section> : <>
          {error && <div className="admin-alert" role="alert">{error}{key && <button className="text-button" onClick={refresh}>Retry</button>}</div>}{notice && <div className="admin-notice" role="status">{notice}</div>}
          {dataLoading ? <AdminContentSkeleton section={section} /> : section === 'Overview' ? <><section className="stats" aria-label="Site metrics"><Metric title="Pages" count={data.pages.length} sub={`${data.pages.filter(x => x.is_published).length} published`} Icon={DocumentTextIcon} tone="blue"/><Metric title="Projects" count={data.projects.length} sub={`${data.projects.filter(x => x.is_published !== false).length} published`} Icon={FolderIcon} tone="purple"/><Metric title="Inquiries" count={data.inquiries.length} sub={`${data.inquiries.filter(x => x.status === 'new').length} new`} Icon={EnvelopeIcon} tone="orange"/><Metric title="Featured work" count={data.projects.filter(x => x.featured).length} sub="Shown in portfolio" Icon={StarIcon} tone="green"/></section>
            <div className="dashboard-grid admin-overview-grid"><section className="card schedule"><div className="card-header"><h2><EnvelopeIcon className="admin-icon heading-icon" aria-hidden="true" />Recent inquiries</h2><button className="text-button" onClick={() => setSection('Inquiries')}>View all <ArrowRightIcon className="admin-icon inline-icon" aria-hidden="true" /></button></div><div className="admin-record-list">{data.inquiries.slice(0, 5).map(x => <div className="admin-record" key={x.id}><div className="avatar">{x.name.slice(0,1).toUpperCase()}</div><div><strong>{x.name}</strong><small>{x.project_type} · {x.email}{x.mobile_number ? ` · ${x.mobile_number}` : ''}</small></div><span className={`status ${x.status}`}>{x.status}</span></div>)}{!data.inquiries.length && <p className="empty">No inquiries received yet.</p>}</div></section>
              <section className="card progress"><div className="card-header"><h2><ChartBarIcon className="admin-icon heading-icon" aria-hidden="true" />Publishing status</h2></div><div className="publish-stats"><div><span>Projects live</span><b>{data.projects.filter(x => x.is_published !== false).length} / {data.projects.length}</b></div><div><span>Services live</span><b>{data.services.filter(x => x.is_published !== false).length} / {data.services.length}</b></div></div><button className="text-button" onClick={() => setSection('Projects')}>Manage site content <ArrowRightIcon className="admin-icon inline-icon" aria-hidden="true" /></button></section></div>
          </> : section === 'Pages' ? <section className="card admin-table-card"><div className="card-header"><h2>Pages <span className="record-count">{data.pages.length}</span></h2><button className="primary compact" onClick={() => newEditor('Pages', {})}>＋ Add page</button></div><div className="table-wrap"><table><thead><tr><th>PAGE</th><th>URL</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{data.pages.map(page => <tr key={page.id}><td><strong>{page.title}</strong><small>{page.description}</small></td><td><code>/{page.slug}</code></td><td><span className={`status ${page.is_published ? 'contacted' : 'closed'}`}>{page.is_published ? 'Published' : 'Draft'}</span></td><td><button className="row-action" onClick={() => openSections(page)}>Sections</button><button className="row-action" onClick={() => newEditor('Pages', page)}>Edit</button>{page.slug !== 'home' && <button className="row-action danger" onClick={() => remove('Pages', page)}>Delete</button>}</td></tr>)}</tbody></table>{!data.pages.length && <p className="empty">No pages yet. Create a page, then add its sections.</p>}</div></section> : section === 'Page sections' ? <section className="card admin-table-card"><div className="card-header"><h2>Page sections <span className="record-count">{pageSections.length}</span></h2><button className="text-button" onClick={() => { setSection('Pages'); setSelectedPage(null); }}>← All pages</button></div><div className="table-wrap"><table><thead><tr><th>SECTION</th><th>TYPE</th><th>ORDER</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{pageSections.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.type}</td><td>{item.sort_order}</td><td>{item.is_published ? 'Published' : 'Hidden'}</td><td><button className="row-action" onClick={() => newEditor('Sections', {...item, contentText: JSON.stringify(item.content, null, 2)})}>Edit</button><button className="row-action danger" onClick={() => removeSection(item)}>Delete</button></td></tr>)}</tbody></table>{!pageSections.length && <p className="empty">No sections. Add a hero, text, features, image, or CTA section.</p>}</div></section> : section === 'Social links' ? <form className="card social-admin-card" onSubmit={saveSocialLinks}><div className="card-header"><h2>Social profiles</h2><button type="button" className="primary compact" onClick={() => setSocialLinks([...socialLinks, { platform: '', url: '', icon: 'linkedin', is_published: true }])}>＋ Add profile</button></div><p className="social-admin-help">Published profiles appear in the homepage and shared footer. Use https:// for profiles, or an email address for Email icons.</p><div className="social-admin-list">{socialLinks.map((link, index) => <div className="social-admin-row" key={index}><label>{link.icon === 'email' ? 'Email address' : 'Profile URL'}<input required type={link.icon === 'email' ? 'email' : 'url'} value={link.icon === 'email' ? (link.url || '').replace(/^mailto:/, '') : link.url} onChange={e => setSocialLinks(socialLinks.map((item, i) => i === index ? {...item, url: e.target.value} : item))} placeholder={link.icon === 'email' ? 'you@example.com' : 'https://linkedin.com/company/…'} /></label><label>Platform<input required maxLength={40} value={link.platform} onChange={e => setSocialLinks(socialLinks.map((item, i) => i === index ? {...item, platform: e.target.value} : item))} placeholder="LinkedIn" /></label><label>Icon<div className="social-icon-picker"><select value={link.icon || 'linkedin'} onChange={e => setSocialLinks(socialLinks.map((item, i) => i === index ? {...item, icon: e.target.value, url: (item.url || '').replace(/^mailto:/, '')} : item))}>{socialIconOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="social-icon-preview"><SocialIcon name={link.icon || 'linkedin'} className="social-icon" /></span></div></label><label className="social-published"><input type="checkbox" checked={link.is_published !== false} onChange={e => setSocialLinks(socialLinks.map((item, i) => i === index ? {...item, is_published: e.target.checked} : item))} /> Published</label><button type="button" className="row-action danger" onClick={() => setSocialLinks(socialLinks.filter((_, i) => i !== index))}>Remove</button></div>)}{!socialLinks.length && <p className="empty">No social profiles configured. Add one to show social links on your website.</p>}</div><div className="social-admin-save"><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save social links'}</button></div></form> : <section className="card admin-table-card"><div className="card-header"><h2>{section} <span className="record-count">{filtered.length}</span></h2>{section === 'Inquiries' && <label className="inquiry-filter-label">Status<select value={inquiryStatus} onChange={e => setInquiryStatus(e.target.value)} aria-label="Filter inquiries by status"><option value="all">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></label>}{section === 'Projects' || section === 'Services' ? <button className="primary compact" onClick={() => newEditor(section, {})}>＋ Add new</button> : null}</div>
            {section === 'Inquiries' ? <div className="table-wrap"><table><thead><tr><th>CONTACT</th><th>PROJECT TYPE</th><th>MESSAGE</th><th>RECEIVED</th><th>STATUS</th></tr></thead><tbody>{filtered.map(x => <tr key={x.id}><td><strong>{x.name}</strong><small>{x.email}{x.mobile_number ? ` · ${x.mobile_number}` : ''}{x.company ? ` · ${x.company}` : ''}</small></td><td>{x.project_type}</td><td className="message-cell">{x.message}</td><td>{new Date(x.created_at).toLocaleDateString()}</td><td><select value={x.status} onChange={e => statusChange(x, e.target.value)} aria-label={`Status for ${x.name}`}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></td></tr>)}</tbody></table>{!filtered.length && <p className="empty">No inquiries match these filters.</p>}</div> : <div className="table-wrap"><table><thead><tr><th>NAME</th><th>SLUG</th><th>VISIBILITY</th><th>ORDER</th><th>ACTIONS</th></tr></thead><tbody>{filtered.map(x => <tr key={x.id}><td><strong>{x.title}</strong><small>{section === 'Projects' ? x.category : x.icon}</small></td><td><code>{x.slug}</code></td><td><span className={`status ${x.is_published === false ? 'closed' : 'contacted'}`}>{x.is_published === false ? 'Draft' : 'Published'}</span></td><td>{x.sort_order}</td><td><button className="row-action" onClick={() => newEditor(section, x)}>Edit</button><button className="row-action danger" onClick={() => remove(section, x)}>Delete</button></td></tr>)}</tbody></table>{!filtered.length && <p className="empty">No {section.toLowerCase()} found.</p>}</div>}</section>}
        </>}
        {authChecked && key && section === 'Marketing' && <MarketingPanel request={request} inquiries={data.inquiries} onNotice={setNotice} />}
      </div>
    </main>
    {editor && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setEditor(null); }}><form className={`edit-modal ${editor.kind === 'Projects' ? 'project-editor' : ''}`} onSubmit={saveEditor}><div className="card-header"><h2>{editor.item.id ? 'Edit' : 'Add'} {editor.kind === 'Sections' ? 'section' : editor.kind.slice(0,-1).toLowerCase()}</h2><button type="button" className="close-modal" onClick={() => setEditor(null)}>×</button></div><div className="edit-fields">{editor.kind === 'Pages' ? <>{[['title','Page title'],['slug','URL slug'],['description','Description']].map(([name,label]) => <label key={name}>{label}<input required={name !== 'description'} disabled={name === 'slug' && editor.item.slug === 'home'} value={editor.item[name] || ''} onChange={e => setEditor({...editor,item:{...editor.item,[name]:e.target.value}})} /></label>)}<label className="check-label"><input type="checkbox" disabled={editor.item.slug === 'home'} checked={!!editor.item.is_published} onChange={e => setEditor({...editor,item:{...editor.item,is_published:e.target.checked}})} /> Published on website</label></> : editor.kind === 'Sections' ? <><label>Section name<input required value={editor.item.name || ''} onChange={e => setEditor({...editor,item:{...editor.item,name:e.target.value}})} /></label><label>Section type<select value={editor.item.section_type || editor.item.type || 'text'} onChange={e => setEditor({...editor,item:{...editor.item,section_type:e.target.value}})}>{['hero','text','features','image','cta'].map(type => <option key={type}>{type}</option>)}</select></label><label>Display order<input type="number" value={editor.item.sort_order || 0} onChange={e => setEditor({...editor,item:{...editor.item,sort_order:Number(e.target.value)}})} /></label><label className="json-label">Section content (JSON)<textarea className="json-editor" required value={editor.item.contentText || ''} onChange={e => setEditor({...editor,item:{...editor.item,contentText:e.target.value}})} /></label>{(editor.item.section_type || editor.item.type) === 'hero' && <label className="upload-label">Hero image<input type="file" accept="image/*" disabled={busy} onChange={e => uploadHeroImage(e.target.files?.[0])} />{busy && <small>Uploading image…</small>}<small>Up to 10 MB. Upload replaces the image_url in section content.</small></label>}<label className="check-label"><input type="checkbox" checked={editor.item.is_published !== false} onChange={e => setEditor({...editor,item:{...editor.item,is_published:e.target.checked}})} /> Visible on page</label></> : <>{(editor.kind === 'Projects' ? [['title','Title'],['slug','Slug'],['category','Category'],['summary','Short summary'],['description','Full description']] : [['title','Title'],['slug','Slug'],['description','Description'],['icon','Icon']]).map(([name,label]) => <label className={editor.kind === 'Projects' && name === 'description' ? 'project-description-field' : undefined} key={name}>{label}{['summary','description'].includes(name) ? <textarea required value={editor.item[name] || ''} onChange={e => setEditor({...editor,item:{...editor.item,[name]:e.target.value}})} /> : <input required={name !== 'case_study_url'} value={editor.item[name] || ''} onChange={e => setEditor({...editor,item:{...editor.item,[name]:e.target.value}})} />}</label>)}{editor.kind === 'Projects' && <ProjectImageManager item={editor.item} busy={busy} onChange={(name,value) => setEditor({...editor,item:{...editor.item,[name]:value}})} onUpload={uploadProjectImage} />}<label>Display order<input type="number" value={editor.item.sort_order || 0} onChange={e => setEditor({...editor,item:{...editor.item,sort_order:Number(e.target.value)}})} /></label>{editor.kind === 'Projects' && <label className="check-label"><input type="checkbox" checked={!!editor.item.featured} onChange={e => setEditor({...editor,item:{...editor.item,featured:e.target.checked}})} /> Featured project</label>}<label className="check-label"><input type="checkbox" checked={editor.item.is_published !== false} onChange={e => setEditor({...editor,item:{...editor.item,is_published:e.target.checked}})} /> Published on website</label></>}</div><div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setEditor(null)}>Cancel</button><button className="primary" disabled={busy}>{busy ? 'Working…' : 'Save changes'}</button></div></form></div>}
  </div>;
}

function ProjectImageManager({ item, busy, onChange, onUpload }) {
  const [newImageUrl, setNewImageUrl] = useState('');
  const gallery = (item.gallery_images_text || '').split('\n').map((url) => url.trim()).filter(Boolean);
  const updateGallery = (images) => onChange('gallery_images_text', images.join('\n'));
  const mediaField = (title, field, uploadTarget) => (
    <article className="project-media-card" key={field}>
      <div className="project-media-preview">{item[field] ? <img src={item[field]} alt={`${title} preview`} /> : <span>◫</span>}</div>
      <div className="project-media-card-content">
        <strong>{title}</strong>
        <label className="project-media-url">Image URL<input value={item[field] || ''} required={field === 'image_url'} onChange={(event) => onChange(field, event.target.value)} placeholder="Paste an image URL" /></label>
        <div className="project-media-actions">
          <label className="project-media-upload">{busy ? 'Uploading…' : '↑ Upload image'}<input type="file" accept="image/*" disabled={busy} onChange={(event) => onUpload(event.target.files?.[0], uploadTarget)} /></label>
          {item[field] && <button type="button" className="project-media-clear" onClick={() => onChange(field, '')}>Remove</button>}
        </div>
      </div>
    </article>
  );

  return (
    <div className="project-media-manager">
      <div className="project-media-heading"><div><strong>Project images</strong><p>Preview each image before saving the project.</p></div></div>
      <div className="project-media-grid">{mediaField('Cover image', 'image_url', 'cover')}{mediaField('Case study image', 'case_study_url', 'case-study')}</div>
      <div className="project-gallery-manager">
        <div className="project-media-heading"><div><strong>Gallery</strong><p>These images appear in the fullscreen project view.</p></div><span>{gallery.length} images</span></div>
        {gallery.length ? <div className="project-gallery-list">{gallery.map((url, index) => <article className="project-gallery-item" key={`${index}-${url}`}>
          <div className="project-gallery-thumb"><img src={url} alt={`Gallery image ${index + 1} preview`} /></div>
          <label>Image {index + 1}<input value={url} onChange={(event) => updateGallery(gallery.map((image, i) => i === index ? event.target.value : image))} /></label>
          <button type="button" aria-label={`Remove gallery image ${index + 1}`} onClick={() => updateGallery(gallery.filter((_, i) => i !== index))}>×</button>
        </article>)}</div> : <div className="project-gallery-empty">No gallery images yet. Upload an image or add its URL below.</div>}
        <div className="project-gallery-add">
          <label className="project-media-upload">{busy ? 'Uploading…' : '↑ Upload gallery image'}<input type="file" accept="image/*" disabled={busy} onChange={(event) => onUpload(event.target.files?.[0], 'gallery')} /></label>
          <label className="project-gallery-url">Add image URL<input value={newImageUrl} onChange={(event) => setNewImageUrl(event.target.value)} placeholder="https://example.com/image.webp" /></label>
          <button type="button" disabled={!newImageUrl.trim()} onClick={() => { updateGallery([...gallery, newImageUrl.trim()]); setNewImageUrl(''); }}>Add URL</button>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, count, sub, Icon, tone }) { return <article className="stat card"><div><p>{title}</p><strong>{count}</strong><small>{sub}</small></div><span className={`stat-icon ${tone}`}><Icon className="admin-icon metric-icon" aria-hidden="true" /></span></article>; }

function AdminContentSkeleton({ section }) {
  return section === 'Overview' ? (
    <div className="admin-skeleton" role="status" aria-label="Loading dashboard data">
      <div className="admin-skeleton-stats">{Array.from({ length: 4 }, (_, index) => <div className="skeleton-card skeleton-stat-card" key={index}><i /><i /><i /></div>)}</div>
      <div className="admin-skeleton-panels"><div className="skeleton-card skeleton-panel"><i /><i /><i /><i /><i /></div><div className="skeleton-card skeleton-panel"><i /><i /><i /></div></div>
      <span className="skeleton-caption">Loading your workspace data…</span>
    </div>
  ) : (
    <section className="card admin-table-card admin-skeleton" role="status" aria-label={`Loading ${section.toLowerCase()}`}>
      <div className="skeleton-table-heading"><i /><i /></div>
      {Array.from({ length: 6 }, (_, index) => <div className="skeleton-table-row" key={index}><i /><i /><i /><i /></div>)}
      <span className="skeleton-caption">Loading {section.toLowerCase()}…</span>
    </section>
  );
}
