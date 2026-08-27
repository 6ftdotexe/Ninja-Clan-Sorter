import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useArchive } from '../store/useArchive';
import { useAuth } from '../contexts/AuthContext';
import { buildShinobiPrompt } from '../features/generator/buildPrompt';
import {
  createGenerationCheckout,
  generateShinobiImage,
  getGenerationCredits,
} from '../services/imageGeneration';
import { saveActivePortrait } from '../services/portraitDb';
import type { GeneratorOptions, PortraitMode } from '../types/generator';

const modes: { id: PortraitMode; label: string; desc: string }[] = [
  { id: 'portrait', label: 'Portrait', desc: 'Face-first cinematic character art' },
  { id: 'full-body', label: 'Full Body', desc: 'Complete outfit and shinobi silhouette' },
  { id: 'action', label: 'Action Scene', desc: 'Wide cinematic chakra + environment' },
  { id: 'dossier', label: 'Dossier', desc: 'Vertical profile-card artwork' },
];

const packs = [
  { id: 'single' as const, credits: 1, price: '$1.99' },
  { id: 'triple' as const, credits: 3, price: '$4.99', tag: 'Popular' },
  { id: 'ten' as const, credits: 10, price: '$12.99', tag: 'Best value' },
];

async function resizeImageFile(file: File, maxSide = 1536): Promise<string> {
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not load the image for optimization.'));
    el.src = src;
  });

  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.92);
}

export function GeneratorPage() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { name, results } = useArchive();
  const [photo, setPhoto] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [options, setOptions] = useState<GeneratorOptions>({
    mode: 'full-body',
    quality: 'medium',
    preserveHair: true,
    showSummon: true,
    showDojutsu: true,
  });

  const complete = ['clan', 'village', 'chakra'].every((k) => results[k as keyof typeof results]);
  const prompt = useMemo(() => buildShinobiPrompt(name, results, options), [name, results, options]);
  const generationCost = options.quality === 'high' ? 2 : 1;

  const refreshCredits = async () => {
    if (!user) {
      setCredits(null);
      return;
    }
    try {
      setCredits(await getGenerationCredits());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load credits.');
    }
  };

  useEffect(() => {
    void refreshCredits();
  }, [user?.id]);

  useEffect(() => {
    const purchase = searchParams.get('purchase');
    if (!purchase) return;
    if (purchase === 'success') {
      setNotice('Payment received. Your credits will appear as soon as Stripe confirms the payment.');
      window.setTimeout(() => void refreshCredits(), 1600);
    } else if (purchase === 'cancelled') {
      setNotice('Checkout cancelled — no charge was made.');
    }
    const next = new URLSearchParams(searchParams);
    next.delete('purchase');
    setSearchParams(next, { replace: true });
  }, []);

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('Choose a JPG, PNG, WEBP or other image file.');
    if (f.size > 10 * 1024 * 1024) return setError('Use a photo under 10 MB.');
    try {
      setPhoto(await resizeImageFile(f));
      setResult('');
      setSaved(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not optimize the selected image.');
    }
  };

  const generate = async () => {
    if (!user) return nav('/login', { state: { from: '/generator' } });
    if (!photo) return;
    if ((credits ?? 0) < generationCost) {
      setError(`You need ${generationCost} credit${generationCost === 1 ? '' : 's'} for this render.`);
      return;
    }
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const out = await generateShinobiImage({
        photoDataUrl: photo,
        prompt,
        mode: options.mode,
        quality: options.quality,
      });
      setResult(out.imageDataUrl);
      setCredits(out.creditsRemaining ?? Math.max(0, (credits ?? 0) - generationCost));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image generation failed.');
      await refreshCredits();
    } finally {
      setBusy(false);
    }
  };

  const buy = async (packId: 'single' | 'triple' | 'ten') => {
    if (!user) return nav('/login', { state: { from: '/generator' } });
    setBuying(true);
    setError('');
    try {
      window.location.href = await createGenerationCheckout(packId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout.');
      setBuying(false);
    }
  };

  const usePortrait = async () => {
    if (!result) return;
    await saveActivePortrait(result);
    setSaved(true);
  };

  return (
    <div className="screen generator-page">
      <div className="generator-head">
        <div>
          <span className="eyebrow">V9 · PHASE 3 · OPENAI VISUAL LAB</span>
          <h2>Generate My Shinobi</h2>
          <p>Your actual reference photo + full identity profile are sent to OpenAI for a higher-fidelity transformation.</p>
        </div>
        <button className="btn ghost" onClick={() => nav('/archive')}>Back to archive</button>
      </div>

      {notice && <div className="generator-warning">{notice}</div>}
      {!complete && <div className="generator-warning">Complete at least Clan, Village and Chakra trials for a meaningful generation.</div>}

      <section className="box credit-panel">
        <div className="credit-summary">
          <div><span className="eyebrow">GENERATION CREDITS</span><strong>{user ? (credits ?? '…') : 'Sign in'}</strong></div>
          <div className="credit-cost"><b>Medium</b><span>1 credit</span><b>High</b><span>2 credits</span></div>
        </div>
        <div className="credit-packs">
          {packs.map((pack) => (
            <button key={pack.id} className="credit-pack" disabled={buying} onClick={() => buy(pack.id)}>
              {pack.tag && <small>{pack.tag}</small>}
              <b>{pack.credits} credit{pack.credits > 1 ? 's' : ''}</b>
              <span>{pack.price}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="generator-layout">
        <section className="box upload-panel">
          <h3>1 · Reference photo</h3>
          <label className="photo-drop">
            <input type="file" accept="image/*" onChange={pick} />
            {photo ? <img src={photo} alt="Reference preview" /> : <><b>Upload a clear photo</b><span>Front-facing or 3/4 angle works best · max 10 MB</span></>}
          </label>
          <p className="privacy-note">The selfie is sent only when you press Generate. The OpenAI key stays on the server and is never exposed to the browser.</p>

          <h3>2 · Composition</h3>
          <div className="mode-grid">
            {modes.map((m) => <button key={m.id} className={`mode-card ${options.mode === m.id ? 'active' : ''}`} onClick={() => setOptions((o) => ({ ...o, mode: m.id }))}><b>{m.label}</b><span>{m.desc}</span></button>)}
          </div>

          <h3>3 · Render quality</h3>
          <div className="quality-grid">
            <button className={`mode-card ${options.quality === 'medium' ? 'active' : ''}`} onClick={() => setOptions((o) => ({ ...o, quality: 'medium' }))}><b>Standard</b><span>Medium quality · 1 credit</span></button>
            <button className={`mode-card ${options.quality === 'high' ? 'active' : ''}`} onClick={() => setOptions((o) => ({ ...o, quality: 'high' }))}><b>Premium</b><span>High quality · 2 credits</span></button>
          </div>

          <div className="toggle-list">
            <label><input type="checkbox" checked={options.preserveHair} onChange={(e) => setOptions((o) => ({ ...o, preserveHair: e.target.checked }))} /> Preserve recognizable hair</label>
            <label><input type="checkbox" checked={options.showSummon} onChange={(e) => setOptions((o) => ({ ...o, showSummon: e.target.checked }))} /> Include summoning contract</label>
            <label><input type="checkbox" checked={options.showDojutsu} onChange={(e) => setOptions((o) => ({ ...o, showDojutsu: e.target.checked }))} /> Show inherited eye trait when relevant</label>
          </div>

          <details className="prompt-preview"><summary>Generation brief</summary><pre>{prompt}</pre></details>
          <button className="btn primary full generate-btn" disabled={!photo || busy || !complete || !user || (credits ?? 0) < generationCost} onClick={generate}>
            {!user ? 'Sign in to generate' : busy ? 'Forging visual identity…' : `Generate · ${generationCost} credit${generationCost === 1 ? '' : 's'}`}
          </button>
          {user && credits !== null && credits < generationCost && <p className="privacy-note">Purchase more credits above to generate this quality level.</p>}
          {error && <div className="generator-error">{error}</div>}
        </section>

        <section className="box result-panel">
          <h3>4 · Shinobi render</h3>
          <div className={`generation-canvas ${busy ? 'busy' : ''}`}>
            {busy ? <div className="generation-loader"><i /><b>Forging your shinobi</b><span>Reference identity · profile · chakra · village · summon</span></div> : result ? <img src={result} alt="Generated shinobi" /> : <div className="generation-empty"><img src="/demo-shinobi.png" alt="Example shinobi render" /><div><b>Your generated shinobi appears here</b><span>Phase 3 uses your actual reference image with OpenAI image editing.</span></div></div>}
          </div>
          {result && <div className="actions"><button className="btn primary" onClick={usePortrait}>{saved ? '✓ Dossier portrait saved' : 'Use as dossier portrait'}</button><a className="btn secondary download-link" href={result} download={`${(name || 'shinobi').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-shinobi.png`}>Save PNG</a><button className="btn ghost" onClick={generate}>Generate variation · {generationCost} cr</button></div>}
        </section>
      </div>
    </div>
  );
}
