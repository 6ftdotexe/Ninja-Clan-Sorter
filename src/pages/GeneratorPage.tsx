import { ChangeEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArchive } from '../store/useArchive';
import { buildShinobiPrompt } from '../features/generator/buildPrompt';
import { generateShinobiImage } from '../services/imageGeneration';
import { saveActivePortrait } from '../services/portraitDb';
import type { GeneratorOptions, PortraitMode } from '../types/generator';

const modes: { id: PortraitMode; label: string; desc: string }[] = [
  { id: 'portrait', label: 'Portrait', desc: 'Face-first cinematic character art' },
  { id: 'full-body', label: 'Full Body', desc: 'Complete outfit and shinobi silhouette' },
  { id: 'action', label: 'Action Scene', desc: 'Chakra, environment and combat presence' },
  { id: 'dossier', label: 'Dossier', desc: 'Clean vertical profile-card artwork' },
];

async function resizeImageFile(file: File, maxSide = 512): Promise<string> {
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
  return canvas.toDataURL('image/png');
}

export function GeneratorPage() {
  const nav = useNavigate();
  const { name, results } = useArchive();
  const [photo, setPhoto] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [options, setOptions] = useState<GeneratorOptions>({
    mode: 'full-body',
    quality: 'high',
    preserveHair: true,
    showSummon: true,
    showDojutsu: true,
  });
  const complete = ['clan', 'village', 'chakra'].every((k) => results[k as keyof typeof results]);
  const prompt = useMemo(() => buildShinobiPrompt(name, results, options), [name, results, options]);

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Choose a JPG, PNG, WEBP or other image file.');
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setError('Use a photo under 8 MB.');
      return;
    }
    try {
      const optimized = await resizeImageFile(f, 512);
      setPhoto(optimized);
      setResult('');
      setSaved(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not optimize the selected image.');
    }
  };

  const generate = async () => {
    if (!photo) return;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const out = await generateShinobiImage({ photoDataUrl: photo, prompt, mode: options.mode, quality: options.quality });
      setResult(out.imageDataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image generation failed.');
    } finally {
      setBusy(false);
    }
  };

  const usePortrait = async () => {
    if (!result) return;
    await saveActivePortrait(result);
    setSaved(true);
  };

  return <div className="screen generator-page"><div className="generator-head"><div><span className="eyebrow">V9 · VISUAL IDENTITY LAB</span><h2>Generate My Shinobi</h2><p>Your archived traits become the art direction. Your photo supplies the identity.</p></div><button className="btn ghost" onClick={() => nav('/archive')}>Back to archive</button></div>{!complete && <div className="generator-warning">Complete at least Clan, Village and Chakra trials for a meaningful generation.</div>}<div className="generator-layout"><section className="box upload-panel"><h3>1 · Reference photo</h3><label className="photo-drop"><input type="file" accept="image/*" onChange={pick} />{photo ? <img src={photo} alt="Reference preview" /> : <><b>Upload a clear photo</b><span>Front-facing or 3/4 angle works best · max 8 MB</span></>}</label><p className="privacy-note">Your reference photo is only sent when you press Generate. V9 does not save the uploaded selfie in the archive or localStorage. The app also optimizes the uploaded image to Cloudflare-friendly reference dimensions.</p><h3>2 · Composition</h3><div className="mode-grid">{modes.map((m) => <button key={m.id} className={`mode-card ${options.mode === m.id ? 'active' : ''}`} onClick={() => setOptions((o) => ({ ...o, mode: m.id }))}><b>{m.label}</b><span>{m.desc}</span></button>)}</div><div className="toggle-list"><label><input type="checkbox" checked={options.preserveHair} onChange={(e) => setOptions((o) => ({ ...o, preserveHair: e.target.checked }))} /> Preserve recognizable hair</label><label><input type="checkbox" checked={options.showSummon} onChange={(e) => setOptions((o) => ({ ...o, showSummon: e.target.checked }))} /> Include summoning contract</label><label><input type="checkbox" checked={options.showDojutsu} onChange={(e) => setOptions((o) => ({ ...o, showDojutsu: e.target.checked }))} /> Show inherited eye trait when relevant</label></div><details className="prompt-preview"><summary>Generation brief</summary><pre>{prompt}</pre></details><button className="btn primary full generate-btn" disabled={!photo || busy || !complete} onClick={generate}>{busy ? 'Forging visual identity…' : 'Generate my shinobi'}</button>{error && <div className="generator-error">{error}</div>}</section><section className="box result-panel"><h3>3 · Shinobi render</h3><div className={`generation-canvas ${busy ? 'busy' : ''}`}>{busy ? <div className="generation-loader"><i /><b>Combining identity seals</b><span>Face · clan · village · chakra · summon · combat profile</span></div> : result ? <img src={result} alt="Generated shinobi" /> : <div className="generation-empty"><img src="/demo-shinobi.png" alt="Example shinobi render" /><div><b>Your generated shinobi appears here</b><span>The example is V7's profile-driven concept art.</span></div></div>}</div>{result && <div className="actions"><button className="btn primary" onClick={usePortrait}>{saved ? '✓ Dossier portrait saved' : 'Use as dossier portrait'}</button><a className="btn secondary download-link" href={result} download={`${(name || 'shinobi').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-shinobi.png`}>Save PNG</a><button className="btn ghost" onClick={generate}>Generate variation</button></div>}</section></div></div>;
}
