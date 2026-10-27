import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import Navbar from '../components/Navbar.jsx';
import CityMap from '../components/CityMap.jsx';
import { Loading, Empty, ErrorState } from '../components/states.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import SceneBackground from '../components/SceneBackground.jsx';

export default function Search() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [listings, setListings] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('cards');
  const [hovered, setHovered] = useState(null);
  const [filters, setFilters] = useState({ lat: '18.5074', lng: '73.8077', radiusKm: '7', maxRent: '', type: '', amenity: '', sort: 'distance' });
  const [saving, setSaving] = useState(false);
  const [intel, setIntel] = useState(null);
  useEffect(() => { client.get('/intelligence/prices').then((r) => setIntel(r.data)).catch(() => {}); }, []);

  async function load(f = filters) {
    setError('');
    try {
      const qs = Object.entries(f).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      setListings((await client.get(`/listings?${qs}`)).data);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  async function saveSearch() {
    setSaving(true);
    try {
      await client.post('/searches', {
        name: `${filters.type || 'Any'} ≤₹${filters.maxRent || '∞'} @ ${filters.radiusKm}km`,
        lat: Number(filters.lat), lng: Number(filters.lng), radiusKm: Number(filters.radiusKm),
        maxRent: filters.maxRent ? Number(filters.maxRent) : undefined,
        type: filters.type || undefined,
        amenity: filters.amenity || undefined,
      });
      toast('Saved — the radar checks every 10 minutes');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      <Navbar />
      <SceneBackground />
      <main className="relative mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Find a flat near <span className="text-blue2">where it matters</span></h1>
        <p className="mt-1 text-sm text-slate-500">
          {intel && intel.areas.length > 0 && (
            <>Market snapshot: {intel.areas.slice(0, 4).map((a) => `${a.area} ~₹${(a.avgRent / 1000).toFixed(1)}k`).join(' · ')}</>
          )}
        </p>
          <div className="flex gap-2">
            {user?.role === 'tenant' && (
              <button onClick={saveSearch} disabled={saving} className="rounded-full border border-blue2 px-5 py-2.5 text-sm font-semibold text-blue2 hover:bg-blue-soft disabled:opacity-60">
                🔔 Save this search
              </button>
            )}
            <div className="flex rounded-full border border-slate-200 bg-white p-1">
              {[['cards', 'Cards'], ['map', 'Map']].map(([v, label]) => (
                <button key={v} onClick={() => setView(v)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${view === v ? 'bg-blue2 text-white' : 'text-slate-500'}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-blue-soft bg-white p-4 sm:grid-cols-3 lg:grid-cols-6">
          <label className="block"><span className="text-xs font-semibold text-slate-400">CENTER LAT</span>
            <input value={filters.lat} onChange={set('lat')} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-blue2" /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-400">CENTER LNG</span>
            <input value={filters.lng} onChange={set('lng')} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-blue2" /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-400">RADIUS KM</span>
            <input value={filters.radiusKm} onChange={set('radiusKm')} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-blue2" /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-400">MAX RENT</span>
            <input value={filters.maxRent} onChange={set('maxRent')} placeholder="25000" className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-blue2" /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-400">TYPE</span>
            <select value={filters.type} onChange={set('type')} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-blue2">
              <option value="">any</option>{['1RK', '1BHK', '2BHK', '3BHK', 'PG'].map((t) => <option key={t}>{t}</option>)}
            </select></label>
          <button onClick={() => load()} className="mt-5 rounded-lg bg-blue2 py-2 text-sm font-semibold text-white">Search radius</button>
        </div>

        {error && <div className="mt-6"><ErrorState message={error} onRetry={() => load()} /></div>}
        {!error && listings === null && <Loading label="Sweeping the radar…" />}
        {!error && listings !== null && listings.length === 0 && (
          <div className="mt-6"><Empty title="Nothing inside the radius" hint="Widen the radius or clear filters — or save the search and wait for alerts." /></div>
        )}

        {listings !== null && listings.length > 0 && view === 'map' && (
          <div className="mt-6">
            <CityMap listings={listings} center={{ lat: Number(filters.lat), lng: Number(filters.lng) }} radiusKm={Number(filters.radiusKm)} onPick={(c) => {
              const next = { ...filters, lat: String(c.lat), lng: String(c.lng) };
              setFilters(next);
              load(next);
            }} hovered={hovered} setHovered={setHovered} />
            <p className="mt-2 text-center text-xs text-slate-400">click the map to move the search center · hover pins for prices</p>
          </div>
        )}

        {listings !== null && listings.length > 0 && view === 'cards' && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <Link key={l._id} to={`/listings/${l._id}`} className="group rounded-2xl border border-blue-soft bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold leading-snug group-hover:text-blue2">{l.title}</h3>
                    <p className="text-xs text-slate-400">{l.type} · {l.area || l.address}{l.distanceKm !== undefined ? ` · ${l.distanceKm.toFixed(1)} km away` : ''}</p>
                  </div>
                  <span className="shrink-0 text-lg font-bold text-blue2">₹{l.rent.toLocaleString('en-IN')}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {l.amenities.slice(0, 4).map((a) => <span key={a} className="rounded-full bg-blue-soft px-2 py-0.5 text-[11px] font-semibold text-blue2">{a}</span>)}
                </div>
                <p className="mt-3 text-xs text-slate-400">deposit ₹{l.deposit.toLocaleString('en-IN')} · by {l.owner?.name}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
