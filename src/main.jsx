import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import './stars.css';
import './loading.css';
import './admin.css';
import './requests.css';
import './auth.css';
import './enhancements.css';
import './celestial.css';
import './masonry.css';

const api = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const cacheKey = 'pm-dream-cache';
const defaultCover = 'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1000&q=85';
const blankPage = () => ({ topText: '', leftText: '', rightImage: '', leftImage: '', rightText: '', bottomText: '' });
const demo = { _id: 'welcome', title: 'A place for dreams', subtitle: 'Made of words, light, and the moments between.', coverImage: defaultCover, author: { username: 'papermoon' }, pages: [{ topText: 'Welcome to PaperMoon', leftText: 'Every dream deserves room to breathe. Build yours page by page, in your own rhythm.', rightImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=80', leftImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1000&q=80', rightText: 'Write a small beginning, then let your photographs hold the details words cannot.', bottomText: 'This is your little corner of the moon.' }] };

const cachedDreams = () => { try { const value = JSON.parse(localStorage.getItem(cacheKey) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('pm-user') || 'null'));
  const [token, setToken] = useState(() => localStorage.getItem('pm-token'));
  const [dreams, setDreams] = useState(cachedDreams);
  const [dream, setDream] = useState(demo);
  const [screen, setScreen] = useState('home');
  const [edit, setEdit] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);
  const [dreamsLoading, setDreamsLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [visits, setVisits] = useState([]);
  const [visitDream, setVisitDream] = useState(null);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const own = user && (String(dream.author?._id || '') === user.id || dream.author?.username === user.username);
  const admin = user?.username?.toLowerCase() === 'vikasn';
  const cover = dream.coverImage || defaultCover;

  const loadDreams = async () => {
    setDreamsLoading(true);
    try {
      const response = await fetch(`${api}/dreams`);
      if (!response.ok) throw new Error('Dreams are unavailable');
      const list = await response.json();
      setDreams(list);
      localStorage.setItem(cacheKey, JSON.stringify(list));
    } catch {
      // Keep any cached dreams visible while the server wakes up or reconnects.
    } finally {
      setDreamsLoading(false);
    }
  };

  useEffect(() => { loadDreams(); }, []);

  const call = async (path, options = {}) => {
    const response = await fetch(api + path, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = response.status === 204 ? null : isJson ? await response.json() : null;
    if (!response.ok) throw new Error(data?.message || (path.includes('/admin/dreams/') ? 'Visitor activity is unavailable. Restart the local backend and try again.' : 'Something went wrong.'));
    return data;
  };

  const authenticate = async event => {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const data = await call(`/auth/${authMode === 'login' ? 'login' : 'register'}`, { method: 'POST', body: JSON.stringify(form) });
      if (data.pending) { setNotice(data.message); setAuthMode('login'); return; }
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('pm-user', JSON.stringify(data.user));
      localStorage.setItem('pm-token', data.token);
      setAuthOpen(false);
    } catch (err) { setError(err.message); }
  };

  const openDream = async summary => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPageIndex(0);
    setEdit(false);
    if (!user) { setAuthMode('login'); setAuthOpen(true); return; }
    if (summary._id === 'welcome') { setDream(summary); setScreen('dream'); return; }
    try {
      const response = await fetch(`${api}/dreams/${summary._id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error();
      setDream(await response.json());
      setScreen('dream');
    } catch {
      setDream(summary);
      setScreen('dream');
    }
  };

  const createDream = async () => {
    if (!user) { setAuthOpen(true); return; }
    const newDream = { title: 'Untitled dream', subtitle: '', coverImage: '', pages: [blankPage()] };
    try {
      const created = await call('/dreams', { method: 'POST', body: JSON.stringify(newDream) });
      created.author = { _id: user.id, username: user.username };
      setDreams(list => [created, ...list]);
      setDream(created);
    } catch {
      setDream({ ...newDream, _id: `local-${Date.now()}`, author: { _id: user.id, username: user.username } });
    }
    setEdit(true);
    setPageIndex(0);
    setScreen('dream');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveDream = async () => {
    if (dream._id.startsWith('local-')) return;
    try {
      const saved = await call(`/dreams/${dream._id}`, { method: 'PUT', body: JSON.stringify({ title: dream.title, subtitle: dream.subtitle, coverImage: dream.coverImage, pages: dream.pages }) });
      setDream(saved);
      await loadDreams();
    } catch (err) { alert(err.message); }
  };

  const updatePage = (key, value) => setDream(current => ({ ...current, pages: current.pages.map((page, index) => index === pageIndex ? { ...page, [key]: value } : page) }));
  const deletePage = () => {
    if (dream.pages.length === 1) { alert('A dream needs at least one page.'); return; }
    if (!window.confirm(`Delete page ${pageIndex + 1}?`)) return;
    const pages = dream.pages.filter((_, index) => index !== pageIndex);
    setDream({ ...dream, pages });
    setPageIndex(Math.min(pageIndex, pages.length - 1));
  };
  const upload = async (file, setter) => {
    if (!file) return;
    setter(URL.createObjectURL(file));
    if (!token) return;
    try {
      const body = new FormData();
      body.append('image', file);
      const response = await fetch(`${api}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
      if (response.ok) setter((await response.json()).url);
    } catch { }
  };
  const turnPage = next => {
    if (next === pageIndex || next < 0 || next >= dream.pages.length) return;
    setPageLoading(true);
    setTimeout(() => { setPageIndex(next); setPageLoading(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }, 800);
  };
  const openAdmin = async () => { await loadDreams(); setScreen('admin'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const deleteDream = async id => {
    if (!window.confirm('Delete this dream permanently?')) return;
    try { await call(`/dreams/${id}`, { method: 'DELETE' }); await loadDreams(); } catch (err) { alert(err.message); }
  };
  const openVisitGallery = async () => { await loadDreams(); setScreen('visits'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openVisitLog = async summary => {
    setVisitDream(summary);
    setVisits([]);
    setVisitsLoading(true);
    setScreen('visit-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const data = await call(`/admin/dreams/${summary._id}/visits`);
      setVisitDream(data.dream);
      setVisits(data.visits);
    } catch (err) { alert(err.message); } finally { setVisitsLoading(false); }
  };
  const loadRequests = async () => {
    setRequestsLoading(true);
    try { setRequests(await call('/admin/users/pending')); } catch (err) { alert(err.message); } finally { setRequestsLoading(false); }
  };
  const openRequests = async () => { setScreen('requests'); window.scrollTo({ top: 0, behavior: 'smooth' }); await loadRequests(); };
  const approveRequest = async id => { try { await call(`/admin/users/${id}/approve`, { method: 'PATCH' }); await loadRequests(); } catch (err) { alert(err.message); } };
  const rejectRequest = async id => {
    if (!window.confirm('Reject and remove this account request?')) return;
    try { await call(`/admin/users/${id}`, { method: 'DELETE' }); await loadRequests(); } catch (err) { alert(err.message); }
  };

  const page = dream.pages[pageIndex] || blankPage();
  const goHome = () => { setScreen('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  let content;
  if (screen === 'home') content = <Home dreams={dreams} loading={dreamsLoading} onOpen={openDream} onCreate={createDream} />;
  else if (screen === 'admin') content = <Admin dreams={dreams} onBack={goHome} onDelete={deleteDream} onVisits={openVisitGallery} onRequests={openRequests} />;
  else if (screen === 'visits') content = <VisitsGallery dreams={dreams} onBack={openAdmin} onOpen={openVisitLog} />;
  else if (screen === 'visit-detail') content = <DreamVisits dream={visitDream} visits={visits} loading={visitsLoading} onBack={openVisitGallery} />;
  else if (screen === 'requests') content = <RequestApprovals requests={requests} loading={requestsLoading} onBack={openAdmin} onApprove={approveRequest} onReject={rejectRequest} />;
  else content = <main className="reader"><button className="back" onClick={goHome}>← All dreams</button><div className="story-head"><div><p className="eyebrow">A PAPERMOON DREAM</p>{edit ? <input value={dream.title} onChange={event => setDream({ ...dream, title: event.target.value })} /> : <h1>{dream.title}</h1>}{edit ? <input className="subtitle-input" value={dream.subtitle} placeholder="Add a subtitle" onChange={event => setDream({ ...dream, subtitle: event.target.value })} /> : <p className="subtitle">{dream.subtitle}</p>}<p className="byline">Words and photographs by <b>{dream.author?.username}</b></p></div>{own && <button className="edit-btn" onClick={() => { if (edit) saveDream(); setEdit(!edit); }}>{edit ? 'Save dream' : 'Edit dream'}</button>}</div><div className="cover" style={{ backgroundImage: `url(${cover})` }}>{edit && pageIndex === 0 && <label><input type="file" accept="image/*" onChange={event => upload(event.target.files[0], value => setDream({ ...dream, coverImage: value }))} /><span>{dream.coverImage ? 'Change cover photo' : 'Add a cover photo'}</span></label>}<div><p>PaperMoon dream</p><strong>{dream.title}</strong></div></div><article className="paper"><Text text={page.topText} edit={edit} onChange={value => updatePage('topText', value)} cls="d1" /><div className="d2"><Text text={page.leftText} edit={edit} onChange={value => updatePage('leftText', value)} cls="d21" /><Image src={page.rightImage} edit={edit} onFile={file => upload(file, value => updatePage('rightImage', value))} cls="d22" /></div><div className="d3"><Image src={page.leftImage} edit={edit} onFile={file => upload(file, value => updatePage('leftImage', value))} cls="d31" /><Text text={page.rightText} edit={edit} onChange={value => updatePage('rightText', value)} cls="d32" /></div><Text text={page.bottomText} edit={edit} onChange={value => updatePage('bottomText', value)} cls="d4" /></article><footer><button disabled={pageIndex === 0 || pageLoading} onClick={() => turnPage(pageIndex - 1)}>← Previous</button><span>Page {pageIndex + 1} of {dream.pages.length}</span><button disabled={pageIndex === dream.pages.length - 1 || pageLoading} onClick={() => turnPage(pageIndex + 1)}>Next →</button>{edit && <><button className="remove-page" onClick={deletePage}>⌫ Delete page</button><button className="add" onClick={() => { setDream({ ...dream, pages: [...dream.pages, blankPage()] }); setPageIndex(dream.pages.length); }}>＋ Add page</button></>}</footer></main>;

  return <><div className="star-field" />{pageLoading && <div className="page-loader" aria-label="Turning the page"><span className="loader-moon" /><p>turning the page</p></div>}<header><button className="brand" onClick={goHome} aria-label="PaperMoon home"><span className="moon" /><span>paper</span><b>moon</b></button><nav>{admin && <button className="admin" onClick={openAdmin}>Admin</button>}<button className="new" onClick={createDream}>Write a dream</button>{user ? <button className="account" onClick={() => { localStorage.clear(); setUser(null); setToken(null); }}>@{user.username} · sign out</button> : <button className="account" onClick={() => { setError(''); setNotice(''); setAuthOpen(true); }}>Sign in</button>}</nav></header>{content}{authOpen && <Auth form={form} setForm={setForm} mode={authMode} setMode={setAuthMode} error={error} notice={notice} clearMessages={() => { setError(''); setNotice(''); }} close={() => setAuthOpen(false)} submit={authenticate} />}</>;
}

function Home({ dreams, loading, onOpen, onCreate }) {
  const columns = Array.from({ length: 4 }, () => []);
  dreams.forEach((item, index) => columns[index % 4].push({ item, index, row: Math.floor(index / 4) }));
  const card = ({ item, index, row }, column) => <button className={`story-card ${(column + row) % 2 ? 'tall' : 'short'}`} style={{ '--delay': `${index * 80}ms` }} key={item._id} onClick={() => onOpen(item)}><img src={item.coverImage || defaultCover} alt="" /><span className="card-shade" /><div><small>BY {item.author?.username}</small><strong>{item.title}</strong><em>{item.subtitle || 'A dream in the making'}</em></div></button>;
  return <main className="home"><section className="hero"><div className="home-moon" aria-hidden="true" /><span className="hero-star star-one" aria-hidden="true">✦</span><span className="hero-star star-two" aria-hidden="true">✧</span><span className="hero-star star-three" aria-hidden="true">✦</span><p className="eyebrow">DREAMS, PAGE BY PAGE</p><h1>A quieter place for <em>your</em> dreams.</h1><p>PaperMoon lets you create visual dreams with words and photographs, arranged like a small printed journal.</p><button className="hero-button" onClick={onCreate}>Start dreaming <span>→</span></button></section><section className="library"><div className="library-head"><p className="eyebrow">EXPLORE THE DREAMS</p><p>{dreams.length} dreams waiting to be opened</p></div><div className="card-grid">{loading && dreams.length === 0 ? <div className="dreams-loader"><span className="loader-moon" /><p>Gathering dreams</p><small>Waking up the archive…</small></div> : dreams.length ? columns.map((column, index) => <div className="dream-column" key={index}>{column.map(entry => card(entry, index))}</div>) : <div className="empty-dreams"><strong>The wall is quiet.</strong><span>Be the first to begin a dream.</span></div>}</div></section></main>;
}

function Admin({ dreams, onBack, onDelete, onVisits, onRequests }) { return <main className="admin-page"><button className="back" onClick={onBack}>← Back to dreams</button><p className="eyebrow">ADMINISTRATION</p><h1>Manage dreams</h1><div className="admin-summary"><p className="admin-intro">{dreams.length} published dreams</p><div className="admin-tools"><button className="visit-button" onClick={onRequests}>Account requests <span>→</span></button><button className="visit-button" onClick={onVisits}>Dream visits <span>→</span></button></div></div><div className="dream-list">{dreams.map(item => <div className="dream-row" key={item._id}><div><strong>{item.title || 'Untitled dream'}</strong><small>by {item.author?.username || 'unknown'}</small></div><button className="delete" onClick={() => onDelete(item._id)} aria-label={`Delete ${item.title}`}>⌫ <span>Delete</span></button></div>)}</div></main>; }
function VisitsGallery({ dreams, onBack, onOpen }) { return <main className="admin-page visit-gallery-page"><button className="back" onClick={onBack}>← Back to admin</button><p className="eyebrow">READER ACTIVITY</p><h1>Dream visits</h1><p className="admin-intro">Choose a dream to see its signed-in readers and visit times.</p><div className="visit-grid">{dreams.map(item => <button className="visit-card" key={item._id} onClick={() => onOpen(item)}><img src={item.coverImage || defaultCover} alt="" /><span /><strong>{item.title || 'Untitled dream'}</strong></button>)}</div></main>; }
function DreamVisits({ dream, visits, loading, onBack }) { return <main className="admin-page visit-log-page"><button className="back" onClick={onBack}>← All dream visits</button><p className="eyebrow">READER ACTIVITY</p><h1>{dream?.title || 'Dream'} visits</h1><p className="admin-intro">{loading ? 'Loading readers…' : `${visits.length} signed-in visit${visits.length === 1 ? '' : 's'} recorded`}</p>{loading ? <div className="visit-loading"><span className="loader-moon" /></div> : <div className="visit-log">{visits.length ? visits.map((visit, index) => <div className="visit-row" key={`${visit.username}-${visit.visitedAt}-${index}`}><strong>@{visit.username}</strong><time>{new Date(visit.visitedAt).toLocaleString()}</time></div>) : <div className="no-visits">No signed-in readers have opened this dream yet.</div>}</div>}</main>; }
function RequestApprovals({ requests, loading, onBack, onApprove, onReject }) { return <main className="admin-page request-page"><button className="back" onClick={onBack}>← Back to admin</button><p className="eyebrow">ACCOUNT ACCESS</p><h1>Account requests</h1><p className="admin-intro">Approve a request before its user can sign in and read dreams.</p>{loading ? <div className="visit-loading"><span className="loader-moon" /></div> : <div className="request-list">{requests.length ? requests.map(request => <div className="request-row" key={request._id}><div><strong>@{request.username}</strong><small>{request.createdAt ? new Date(request.createdAt).toLocaleString() : 'Recently requested'}</small></div><div className="request-actions"><button className="approve" onClick={() => onApprove(request._id)} aria-label={`Approve ${request.username}`} title="Approve">✓</button><button className="reject" onClick={() => onReject(request._id)} aria-label={`Reject ${request.username}`} title="Reject">×</button></div></div>) : <div className="no-visits">There are no account requests waiting for approval.</div>}</div>}</main>; }
function Auth({ form, setForm, mode, setMode, error, notice, clearMessages, close, submit }) { const chooseMode = next => { clearMessages(); setMode(next); }; return <div className="modal"><form onSubmit={submit}><button type="button" className="close" onClick={close}>×</button><div className="auth-moon" /><p className="eyebrow">WELCOME TO PAPERMOON</p><h2>{mode === 'login' ? 'Your dreams are waiting.' : 'Request your place under the moon.'}</h2><p className="auth-copy">{mode === 'login' ? 'Sign in to write, edit, and return to your pages.' : 'New accounts need a short admin approval before they can sign in.'}</p><div className="auth-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => chooseMode('login')}>Sign in</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => chooseMode('register')}>Create account</button></div><input placeholder="Choose a username" required value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} /><input placeholder="Create a password" type="password" required value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} />{error && <small className="error">{error}</small>}{notice && <small className="notice">{notice}</small>}<button className="submit">{mode === 'login' ? 'Sign in' : 'Send account request'} <span>→</span></button></form></div>; }
function Text({ text, edit, onChange, cls }) { return <div className={'text-block ' + cls}>{edit ? <textarea value={text} placeholder="Write here…" onChange={event => onChange(event.target.value)} /> : <p>{text || ' '}</p>}</div>; }
function Image({ src, edit, onFile, cls }) { return <div className={'image-block ' + cls}>{src && <img src={src} alt="Dream photograph" />}{edit && <label><input type="file" accept="image/*" onChange={event => onFile(event.target.files[0])} /><span>{src ? 'Change photograph' : 'Upload photograph'}</span></label>}</div>; }

createRoot(document.getElementById('root')).render(<App />);
