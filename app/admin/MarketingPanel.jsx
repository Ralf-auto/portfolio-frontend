'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowPathIcon, EnvelopeIcon, MagnifyingGlassIcon, PlusIcon, UserGroupIcon, UsersIcon } from '@heroicons/react/24/outline';
import './marketing.css';

const blankContact = { name: '', email: '', mobile_number: '', company: '', job_title: '', marketing_opt_in: false, source: 'admin' };

export default function MarketingPanel({ request, inquiries = [], onNotice }) {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [contact, setContact] = useState(blankContact);
  const [group, setGroup] = useState({ name: '', description: '', contact_ids: [] });
  const [editingGroupId, setEditingGroupId] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [campaign, setCampaign] = useState({ group_id: '', subject: '', body: '', html: '' });
  const [activeTab, setActiveTab] = useState('Contacts & groups');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [thread, setThread] = useState([]);
  const [reply, setReply] = useState({ subject: '', body: '', html: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [contactRows, groupRows, campaignRows] = await Promise.all([
        request('/api/admin/marketing/contacts'), request('/api/admin/marketing/groups'), request('/api/admin/marketing/campaigns'),
      ]);
      setContacts(contactRows); setGroups(groupRows); setCampaigns(campaignRows);
      setCampaign((current) => ({ ...current, group_id: current.group_id || groupRows[0]?.id || '' }));
    } catch (err) { setError(err.message); }
  }, [request]);

  useEffect(() => { load(); }, [load]);

  async function addContact(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await request('/api/admin/marketing/contacts', { method: 'POST', body: JSON.stringify(contact) });
      setContact(blankContact); onNotice('Contact added. Marketing eligibility follows the consent setting.'); await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function saveGroup(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await request(editingGroupId ? `/api/admin/marketing/groups/${editingGroupId}` : '/api/admin/marketing/groups', { method: editingGroupId ? 'PUT' : 'POST', body: JSON.stringify(group) });
      setGroup({ name: '', description: '', contact_ids: [] }); setEditingGroupId(''); setGroupSearch('');
      onNotice(editingGroupId ? 'Group members updated.' : 'Contact group created.'); await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  function editGroup(item) {
    setEditingGroupId(item.id);
    setGroup({ name: item.name, description: item.description || '', contact_ids: item.contact_ids || [] });
    setGroupSearch('');
    document.querySelector('.marketing-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cancelGroupEdit() {
    setEditingGroupId(''); setGroup({ name: '', description: '', contact_ids: [] }); setGroupSearch('');
  }

  async function deleteContact(item) {
    if (!window.confirm(`Remove ${item.name} from the marketing list?`)) return;
    try { await request(`/api/admin/marketing/contacts/${item.id}`, { method: 'DELETE' }); await load(); }
    catch (err) { setError(err.message); }
  }

  async function deleteGroup(item) {
    if (!window.confirm(`Delete the “${item.name}” group?`)) return;
    try { await request(`/api/admin/marketing/groups/${item.id}`, { method: 'DELETE' }); await load(); }
    catch (err) { setError(err.message); }
  }

  async function sendCampaign(event) {
    event.preventDefault();
    const target = groups.find((item) => item.id === campaign.group_id);
    if (!window.confirm(`Send “${campaign.subject}” individually to up to ${target?.eligible_count || 0} opted-in contacts in ${target?.name || 'this group'}?`)) return;
    setBusy(true); setError('');
    try {
      const result = await request('/api/admin/marketing/campaigns/send', { method: 'POST', body: JSON.stringify(campaign) });
      onNotice(`Campaign sent: ${result.sent_count} delivered, ${result.failed_count} failed.`);
      setCampaign((current) => ({ ...current, subject: '', body: '', html: '' })); await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function openInquiry(item) {
    setSelectedInquiry(item); setReply({ subject: `Re: ${item.project_type} inquiry | NeroTech`, body: '', html: '' }); setError('');
    try { setThread(await request(`/api/admin/inquiries/${item.id}/messages`)); }
    catch (err) { setError(err.message); }
  }

  async function sendReply(event) {
    event.preventDefault(); if (!selectedInquiry) return;
    setBusy(true); setError('');
    try {
      await request(`/api/admin/inquiries/${selectedInquiry.id}/reply`, { method: 'POST', body: JSON.stringify(reply) });
      setThread(await request(`/api/admin/inquiries/${selectedInquiry.id}/messages`)); setReply((current) => ({ ...current, body: '', html: '' }));
      onNotice(`Reply sent to ${selectedInquiry.email}.`);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return <section className="marketing-workspace">
    {error && <div className="admin-alert" role="alert">{error}</div>}
    <div className="marketing-tabs" role="tablist" aria-label="Marketing tools">
      {['Contacts & groups', 'Campaigns', 'Inquiry replies'].map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab === 'Contacts & groups' ? <UsersIcon /> : tab === 'Campaigns' ? <EnvelopeIcon /> : <ArrowPathIcon />}{tab}</button>)}
    </div>

    {activeTab === 'Contacts & groups' && <>
      <div className="marketing-summary"><span><UsersIcon />{contacts.length} contacts</span><span><UserGroupIcon />{groups.length} groups</span><span><EnvelopeIcon />{contacts.filter((item) => item.marketing_opt_in).length} opted in</span></div>
      <div className="marketing-columns">
        <form className="card marketing-form" onSubmit={addContact}><div className="card-header"><h2>Add contact</h2></div>
          <label>Name<input required maxLength={160} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} /></label>
          <label>Email<input required type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></label>
          <div className="marketing-field-row"><label>Phone<input value={contact.mobile_number} onChange={(e) => setContact({ ...contact, mobile_number: e.target.value })} /></label><label>Job title<input value={contact.job_title} onChange={(e) => setContact({ ...contact, job_title: e.target.value })} /></label></div>
          <label>Company<input value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} /></label>
          <label className="marketing-consent"><input type="checkbox" checked={contact.marketing_opt_in} onChange={(e) => setContact({ ...contact, marketing_opt_in: e.target.checked })} /> Contact has explicitly agreed to receive promotional email.</label>
          <button className="primary" disabled={busy}><PlusIcon /> Add contact</button>
        </form>
        <form className="card marketing-form" onSubmit={saveGroup}><div className="card-header"><h2>{editingGroupId ? 'Edit group' : 'Create group'}</h2>{editingGroupId && <button type="button" className="text-button" onClick={cancelGroupEdit}>Cancel</button>}</div>
          <label>Group name<input required maxLength={120} value={group.name} onChange={(e) => setGroup({ ...group, name: e.target.value })} placeholder="e.g. SaaS founders" /></label>
          <label>Description<input value={group.description} onChange={(e) => setGroup({ ...group, description: e.target.value })} /></label>
          <fieldset className="marketing-contact-picker"><legend>Add contacts</legend>{contacts.length ? <><label className="marketing-member-search"><MagnifyingGlassIcon aria-hidden="true" /><input type="search" aria-label="Search contacts by name or email" placeholder="Search by name or email" value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} /></label>{contacts.filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(groupSearch.trim().toLowerCase())).map((item) => <label key={item.id}><input type="checkbox" checked={group.contact_ids.includes(item.id)} onChange={(e) => setGroup({ ...group, contact_ids: e.target.checked ? [...group.contact_ids, item.id] : group.contact_ids.filter((id) => id !== item.id) })} /><span>{item.name}<small>{item.email}{item.marketing_opt_in ? ' · opted in' : ' · no marketing consent'}</small></span></label>)}{!contacts.some((item) => `${item.name} ${item.email}`.toLowerCase().includes(groupSearch.trim().toLowerCase())) && <p>No contacts match “{groupSearch}”.</p>}</> : <p>Add contacts first to build a group.</p>}</fieldset>
          <div className="marketing-group-form-actions">{editingGroupId && <button type="button" className="cancel-button" onClick={cancelGroupEdit}>Cancel</button>}<button className="primary" disabled={busy || !contacts.length}><PlusIcon />{editingGroupId ? 'Save group changes' : 'Create group'}</button></div>
        </form>
      </div>
      <div className="marketing-lists">
        <section className="card marketing-list-card"><div className="card-header"><h2>Contacts</h2><span className="record-count">{contacts.length}</span></div>{contacts.length ? <div className="marketing-contact-list">{contacts.map((item) => <div key={item.id}><span className="marketing-avatar">{item.name.slice(0, 1).toUpperCase()}</span><span className="marketing-contact-name"><strong>{item.name}</strong><small>{item.email} · {[item.company, item.mobile_number].filter(Boolean).join(' · ') || 'No additional details'}</small></span><span className={`status ${item.marketing_opt_in ? 'contacted' : 'closed'}`}>{item.marketing_opt_in ? 'Opted in' : 'No consent'}</span><button className="row-action danger" onClick={() => deleteContact(item)}>Remove</button></div>)}</div> : <p className="empty">No contacts added yet.</p>}</section>
        <section className="card marketing-list-card"><div className="card-header"><h2>Groups</h2><span className="record-count">{groups.length}</span></div>{groups.length ? <div className="marketing-group-list">{groups.map((item) => <div key={item.id}><UserGroupIcon /><span><strong>{item.name}</strong><small>{item.contact_count} contacts · {item.eligible_count} eligible for campaigns</small></span><button className="row-action" onClick={() => editGroup(item)}>Edit members</button><button className="row-action danger" onClick={() => deleteGroup(item)}>Delete</button></div>)}</div> : <p className="empty">No groups created yet.</p>}</section>
      </div>
    </>}

    {activeTab === 'Campaigns' && <div className="marketing-columns campaign-columns">
      <form className="card marketing-form" onSubmit={sendCampaign}><div className="card-header"><h2>Compose campaign</h2></div>
        <label>Recipient group<select required value={campaign.group_id} onChange={(e) => setCampaign({ ...campaign, group_id: e.target.value })}><option value="">Select a group</option>{groups.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.eligible_count} opted in</option>)}</select></label>
        <label>Subject<input required maxLength={200} value={campaign.subject} onChange={(e) => setCampaign({ ...campaign, subject: e.target.value })} /></label>
        <label>Plain text email<textarea required maxLength={20000} rows={7} value={campaign.body} onChange={(e) => setCampaign({ ...campaign, body: e.target.value })} /></label>
        <label>HTML email (optional)<textarea maxLength={50000} rows={10} value={campaign.html} onChange={(e) => setCampaign({ ...campaign, html: e.target.value })} placeholder="<h1>Hello</h1><p>Your email content…</p>" /></label>
        <p className="marketing-privacy-note">Recipients receive both versions. Email clients use the HTML version when supported and the plain text version as a fallback.</p>
        <p className="marketing-privacy-note">Each opted-in recipient receives a separate email. Recipients will not see one another’s addresses. Contacts without recorded consent are excluded.</p>
        <button className="primary" disabled={busy || !groups.some((item) => item.id === campaign.group_id && item.eligible_count)}><EnvelopeIcon />{busy ? 'Sending…' : 'Send campaign'}</button>
      </form>
      <section className="card marketing-list-card campaign-history"><div className="card-header"><h2>Campaign history</h2><span className="record-count">{campaigns.length}</span></div>{campaigns.length ? <div className="marketing-group-list">{campaigns.map((item) => <div key={item.id}><EnvelopeIcon /><span><strong>{item.subject}</strong><small>{item.group_name} · {new Date(item.created_at).toLocaleString()}</small></span><span className="campaign-counts"><b>{item.sent_count} sent</b><small>{item.failed_count} failed</small></span></div>)}</div> : <p className="empty">Campaign sends will appear here.</p>}</section>
    </div>}

    {activeTab === 'Inquiry replies' && <section className="card marketing-list-card"><div className="card-header"><h2>Inquiry inbox</h2><span className="record-count">{inquiries.length}</span></div>{inquiries.length ? <div className="marketing-contact-list">{inquiries.map((item) => <div key={item.id}><span className="marketing-avatar">{item.name.slice(0, 1).toUpperCase()}</span><span className="marketing-contact-name"><strong>{item.name} <small>· {item.project_type}</small></strong><small>{item.email} · {new Date(item.created_at).toLocaleString()}</small></span><span className={`status ${item.status}`}>{item.status}</span><button className="row-action" onClick={() => openInquiry(item)}>Open thread & reply</button></div>)}</div> : <p className="empty">No inquiries to reply to.</p>}</section>}

    {selectedInquiry && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedInquiry(null); }}><section className="edit-modal inquiry-thread-modal"><div className="card-header"><div><h2>Reply to {selectedInquiry.name}</h2><small>{selectedInquiry.email}</small></div><button className="close-modal" aria-label="Close reply window" onClick={() => setSelectedInquiry(null)}>×</button></div><div className="inquiry-original"><strong>Original inquiry · {selectedInquiry.project_type}</strong><p>{selectedInquiry.message}</p></div><div className="inquiry-thread">{thread.map((message) => <article key={message.id} className="thread-message"><div><strong>{message.direction === 'outbound' ? 'NeroTech reply' : 'Message'}</strong><span className={`status ${message.delivery_status === 'sent' ? 'contacted' : 'closed'}`}>{message.delivery_status}</span></div><small>{message.subject} · {new Date(message.created_at).toLocaleString()}</small><p>{message.body}</p>{message.error && <small className="thread-error">{message.error}</small>}</article>)}{!thread.length && <p className="empty">No replies have been sent yet.</p>}</div><form className="inquiry-reply-form" onSubmit={sendReply}><label>Subject<input required value={reply.subject} onChange={(e) => setReply({ ...reply, subject: e.target.value })} /></label><label>Plain text reply<textarea required rows={5} value={reply.body} onChange={(e) => setReply({ ...reply, body: e.target.value })} /></label><label>HTML reply (optional)<textarea maxLength={50000} rows={8} value={reply.html} onChange={(e) => setReply({ ...reply, html: e.target.value })} placeholder="<p>Your formatted reply…</p>" /></label><button className="primary" disabled={busy}>{busy ? 'Sending…' : 'Send and track reply'}</button></form></section></div>}
  </section>;
}
