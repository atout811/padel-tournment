import { useEffect, useRef, useState } from 'react';
import { Button } from './Ui.jsx';
import { useI18n } from '../i18n/useI18n.js';

function NamePill({ name, selected, disabled, onToggle, onForget, copy }) {
  const timer = useRef(null);
  const origin = useRef(null);
  const held = useRef(false);
  const cancel = () => { clearTimeout(timer.current); timer.current = null; };
  useEffect(() => () => clearTimeout(timer.current), []);
  return <button type="button" aria-pressed={selected} disabled={disabled}
    className={`name-pill saved-name-pill ${selected ? 'is-selected' : ''}`}
    onPointerDown={(event) => {
      if (event.button !== 0 || disabled) return;
      cancel(); held.current = false; origin.current = { x: event.clientX, y: event.clientY };
      timer.current = setTimeout(() => { held.current = true; onForget(name); }, 600);
    }}
    onPointerMove={(event) => {
      if (origin.current && Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > 10) cancel();
    }}
    onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel}
    onContextMenu={(event) => { event.preventDefault(); cancel(); held.current = true; onForget(name); }}
    onKeyDown={(event) => { if (event.key === 'Delete') { event.preventDefault(); onForget(name); } }}
    onClick={() => { if (held.current) { held.current = false; return; } onToggle(name); }}
    title={copy('دوس مطوّل عشان تمسح الاسم', 'Hold to forget this name')}>
    <span className="pill-avatar" aria-hidden="true">{selected ? '✓' : name.charAt(0).toUpperCase()}</span>{name}
    <span className="pill-add" aria-hidden="true">{selected ? '−' : '+'}</span>
  </button>;
}

export default function SavedPlayerNames({ names, players, disabled, onToggle, onForget }) {
  const { isRtl } = useI18n();
  const copy = (ar, en) => isRtl ? ar : en;
  const [expanded, setExpanded] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const listDialog = useRef(null);
  const deleteDialog = useRef(null);
  useEffect(() => { if (expanded) listDialog.current.showModal(); }, [expanded]);
  useEffect(() => { if (pendingDelete) deleteDialog.current.showModal(); }, [pendingDelete]);
  const pills = (items) => items.map((name) => <NamePill key={name} name={name}
    selected={players.some((player) => player.toLowerCase() === name.toLowerCase())}
    disabled={disabled} onToggle={onToggle} onForget={setPendingDelete} copy={copy} />);
  if (!names.length && !expanded && !pendingDelete) return null;
  return <div className="remembered-players">
    <p className="field-caption">{copy('صحاب الملعب', 'FAMILIAR FACES')} <span>{copy('دوس تختار · دوس مطوّل تمسح', 'Tap to pick · Hold to forget')}</span></p>
    <div className="flex flex-wrap gap-2">{pills(names.slice(0, 15))}</div>
    {names.length > 15 && <Button tone="quiet" className="mt-2" disabled={disabled} onClick={() => setExpanded(true)}>{copy('إظهار المزيد', 'Show more')} <span>({names.length - 15})</span></Button>}
    {expanded && <dialog ref={listDialog} className="saved-names-dialog" aria-labelledby="saved-names-title" onCancel={() => setExpanded(false)} onClose={() => setExpanded(false)} onClick={(event) => { if (event.target === event.currentTarget) setExpanded(false); }}>
      <div className="flex items-center justify-between gap-3 mb-2"><h3 id="saved-names-title" className="text-xl font-black">{copy('كل صحاب الملعب', 'All saved players')} <span className="text-club-muted text-sm">({names.length})</span></h3><Button autoFocus tone="quiet" aria-label={copy('اقفل', 'Close')} onClick={() => setExpanded(false)}>×</Button></div>
      <p className="mb-4 text-sm text-club-muted">{copy('اختار اللي هيلعب. ولو اسم مش محتاجه، دوس عليه مطوّل.', 'Pick who’s playing. Hold a name to forget it.')}</p>
      <div className="saved-names-scroll flex flex-wrap gap-2">{pills(names)}</div>
      <Button className="mt-5 w-full" onClick={() => setExpanded(false)}>{copy('تمام', 'Done')}</Button>
    </dialog>}
    {pendingDelete && <dialog ref={deleteDialog} className="saved-names-dialog" aria-labelledby="forget-name-title" onCancel={() => setPendingDelete(null)} onClose={() => setPendingDelete(null)}>
      <h3 id="forget-name-title" className="text-xl font-black break-words">{copy(`نمسح ${pendingDelete} من المحفوظين؟`, `Forget ${pendingDelete}?`)}</h3>
      <p className="mt-2 text-sm text-club-muted">{copy('الماتشات القديمة وشلة النهارده هيفضلوا زي ما هم.', 'Past matches and today’s lineup will stay the same.')}</p>
      <div className="mt-5 flex gap-2"><Button tone="danger" onClick={() => { onForget(pendingDelete); setPendingDelete(null); }}>{copy('امسح الاسم', 'Forget name')}</Button><Button autoFocus tone="secondary" onClick={() => setPendingDelete(null)}>{copy('خليه', 'Keep it')}</Button></div>
    </dialog>}
  </div>;
}
