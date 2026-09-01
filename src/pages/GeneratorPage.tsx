import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useArchive } from '../store/useArchive';
import { useAuth } from '../contexts/AuthContext';
import {
  buildShinobiPrompt,
  createGenerationCheckout,
  DEFAULT_GENERATOR_OPTIONS,
  generateShinobiImage,
  GENERATION_PACKS,
  GENERATOR_MODES,
  generationCost,
  generatorDownloadName,
  getGenerationCredits,
  optimizeReferenceImage,
  saveActivePortrait,
  type GenerationPackId,
  validateReferenceImage,
} from '../features/generator';
import type { GeneratorOptions, PortraitMode } from '../types';
import { errorMessage, Feedback, PageHeader } from '../lib/app';

type Controller = ReturnType<typeof useGeneratorController>;

function useGeneratorController() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { name, results } = useArchive();
  const [photo, setPhoto] = useState('');
  const [result, setResult] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const [options, setOptions] = useState<GeneratorOptions>(DEFAULT_GENERATOR_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [buying, setBuying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const generationLock = useRef(false);
  const creditRequest = useRef(0);

  const complete = ['clan', 'village', 'chakra'].every((key) => results[key as keyof typeof results]);
  const prompt = useMemo(() => buildShinobiPrompt(name, results, options), [name, results, options]);
  const cost = generationCost(options);

  const refreshCredits = useCallback(async (silent = false) => {
    const requestId = ++creditRequest.current;
    if (!user) { setCredits(null); return null; }
    try {
      const next = await getGenerationCredits();
      if (requestId === creditRequest.current) setCredits(next);
      return next;
    } catch (err) {
      if (!silent && requestId === creditRequest.current) setError(errorMessage(err, 'Could not load credits.'));
      return null;
    }
  }, [user?.id]);

  useEffect(() => { void refreshCredits(); }, [refreshCredits]);

  useEffect(() => {
    const purchase = searchParams.get('purchase');
    if (!purchase) return;
    setNotice(purchase === 'success'
      ? 'Payment received. Your credits will appear as soon as Stripe confirms the payment.'
      : 'Checkout cancelled — no charge was made.');
    let cancelled = false;
    if (purchase === 'success') {
      void (async () => {
        for (const delay of [600, 1400, 2600, 4500, 7500]) {
          await new Promise((resolve) => window.setTimeout(resolve, delay));
          if (cancelled) return;
          const nextCredits = await refreshCredits(true);
          if (nextCredits !== null && nextCredits > 0) {
            setNotice('Payment confirmed. Your generation credits are ready.');
            return;
          }
        }
        if (!cancelled) setNotice('Payment was received, but Stripe confirmation is still processing. Refresh credits in a moment if they do not appear.');
      })();
    }
    const next = new URLSearchParams(searchParams);
    next.delete('purchase');
    setSearchParams(next, { replace: true });
    return () => { cancelled = true; };
  }, [refreshCredits, searchParams, setSearchParams]);

  const selectPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validation = validateReferenceImage(file);
    if (validation) return setError(validation);
    try {
      setPhoto(await optimizeReferenceImage(file));
      setResult(''); setSaved(false); setError('');
    } catch (err) { setError(errorMessage(err, 'Could not optimize the selected image.')); }
  };

  const generate = async () => {
    if (generationLock.current) return;
    if (!user) return nav('/login', { state: { from: '/generator' } });
    if (!photo) return setError('Upload a reference photo before generating.');
    if (credits === null) return setError('Credits are still loading. Try again in a moment.');
    if (credits < cost) return setError(`You need ${cost} credit${cost === 1 ? '' : 's'} for this render.`);
    generationLock.current = true;
    setBusy(true); setError(''); setSaved(false);
    try {
      const output = await generateShinobiImage({ photoDataUrl: photo, prompt, mode: options.mode, quality: options.quality });
      setResult(output.imageDataUrl);
      setCredits(Number.isFinite(output.creditsRemaining) ? Math.max(0, output.creditsRemaining!) : Math.max(0, credits - cost));
    } catch (err) {
      setError(errorMessage(err, 'Image generation failed.'));
      await refreshCredits(true);
    } finally { generationLock.current = false; setBusy(false); }
  };

  const buy = async (packId: GenerationPackId) => {
    if (!user) return nav('/login', { state: { from: '/generator' } });
    setBuying(true); setError('');
    try { window.location.href = await createGenerationCheckout(packId); }
    catch (err) { setError(errorMessage(err, 'Could not start checkout.')); setBuying(false); }
  };

  const savePortrait = async () => {
    if (!result) return;
    try { await saveActivePortrait(result); setSaved(true); }
    catch (err) { setError(errorMessage(err, 'Could not save dossier portrait.')); }
  };

  return { user, name, photo, result, credits, options, busy, buying, saved, error, notice, complete, prompt, cost, setOptions, selectPhoto, generate, buy, savePortrait, nav };
}

function CreditPanel({ c }: { c: Controller }) {
  return <section className="box credit-panel">
    <div className="credit-summary">
      <div><span className="eyebrow">GENERATION CREDITS</span><strong>{c.user ? (c.credits ?? '…') : 'Sign in'}</strong></div>
      <div className="credit-cost"><b>Medium</b><span>1 credit</span><b>High</b><span>2 credits</span></div>
    </div>
    <div className="credit-packs">{GENERATION_PACKS.map((pack) =>
      <button key={pack.id} className="credit-pack" disabled={c.buying} onClick={() => c.buy(pack.id)}>
        {'tag' in pack && pack.tag && <small>{pack.tag}</small>}<b>{pack.credits} credit{pack.credits > 1 ? 's' : ''}</b><span>{pack.price}</span>
      </button>)}</div>
  </section>;
}

function OptionCard({ active, label, desc, onClick }: { active: boolean; label: string; desc: string; onClick: () => void }) {
  return <button className={`mode-card ${active ? 'active' : ''}`} onClick={onClick}><b>{label}</b><span>{desc}</span></button>;
}

function ControlsPanel({ c }: { c: Controller }) {
  const update = <K extends keyof GeneratorOptions>(key: K, value: GeneratorOptions[K]) => c.setOptions((current) => ({ ...current, [key]: value }));
  return <section className="box upload-panel">
    <h3>1 · Reference photo</h3>
    <label className="photo-drop"><input type="file" accept="image/*" onChange={c.selectPhoto} />
      {c.photo ? <img src={c.photo} alt="Reference preview" /> : <><b>Upload a clear photo</b><span>Front-facing or 3/4 angle works best · max 10 MB</span></>}
    </label>
    <p className="privacy-note">The selfie is sent only when you press Generate. The OpenAI key stays on the server and is never exposed to the browser.</p>

    <h3>2 · Composition</h3>
    <div className="mode-grid">{GENERATOR_MODES.map((mode) => <OptionCard key={mode.id} active={c.options.mode === mode.id} label={mode.label} desc={mode.desc} onClick={() => update('mode', mode.id as PortraitMode)} />)}</div>

    <h3>3 · Render quality</h3>
    <div className="quality-grid">
      <OptionCard active={c.options.quality === 'medium'} label="Standard" desc="Medium quality · 1 credit" onClick={() => update('quality', 'medium')} />
      <OptionCard active={c.options.quality === 'high'} label="Premium" desc="High quality · 2 credits" onClick={() => update('quality', 'high')} />
    </div>

    <div className="toggle-list">
      <label><input type="checkbox" checked={c.options.preserveHair} onChange={(e) => update('preserveHair', e.target.checked)} /> Preserve recognizable hair</label>
      <label><input type="checkbox" checked={c.options.showSummon} onChange={(e) => update('showSummon', e.target.checked)} /> Include summoning contract</label>
      <label><input type="checkbox" checked={c.options.showDojutsu} onChange={(e) => update('showDojutsu', e.target.checked)} /> Show inherited eye trait when relevant</label>
    </div>

    <details className="prompt-preview"><summary>Generation brief</summary><pre>{c.prompt}</pre></details>
    <button className="btn primary full generate-btn" disabled={!c.photo || c.busy || !c.complete || !c.user || (c.credits ?? 0) < c.cost} onClick={c.generate}>
      {!c.user ? 'Sign in to generate' : c.busy ? 'Forging visual identity…' : `Generate · ${c.cost} credit${c.cost === 1 ? '' : 's'}`}
    </button>
    {c.user && c.credits !== null && c.credits < c.cost && <p className="privacy-note">Purchase more credits above to generate this quality level.</p>}
    <Feedback error={c.error} />
  </section>;
}

function ResultPanel({ c }: { c: Controller }) {
  return <section className="box result-panel">
    <h3>4 · Shinobi render</h3>
    <div className={`generation-canvas ${c.busy ? 'busy' : ''}`}>
      {c.busy
        ? <div className="generation-loader"><i /><b>Forging your shinobi</b><span>Reference identity · profile · chakra · village · summon</span></div>
        : c.result
          ? <img src={c.result} alt="Generated shinobi" />
          : <div className="generation-empty"><img src="/demo-shinobi.png" alt="Example shinobi render" /><div><b>Your generated shinobi appears here</b><span>Your reference image is used directly with OpenAI image editing.</span></div></div>}
    </div>
    {c.result && <div className="actions">
      <button className="btn primary" onClick={c.savePortrait}>{c.saved ? '✓ Dossier portrait saved' : 'Use as dossier portrait'}</button>
      <a className="btn secondary download-link" href={c.result} download={generatorDownloadName(c.name)}>Save PNG</a>
      <button className="btn ghost" onClick={c.generate}>Generate variation · {c.cost} cr</button>
    </div>}
  </section>;
}

export function GeneratorPage() {
  const c = useGeneratorController();
  return <div className="screen generator-page">
    <PageHeader eyebrow="V11 · OPENAI VISUAL LAB" title="Generate My Shinobi" description="Your actual reference photo + full identity profile are sent to OpenAI for a higher-fidelity transformation." action={<button className="btn ghost" onClick={() => c.nav('/archive')}>Back to archive</button>} />
    <Feedback notice={c.notice} />
    {!c.complete && <div className="generator-warning">Complete at least Clan, Village and Chakra trials for a meaningful generation.</div>}
    <CreditPanel c={c} />
    <div className="generator-layout"><ControlsPanel c={c} /><ResultPanel c={c} /></div>
  </div>;
}
