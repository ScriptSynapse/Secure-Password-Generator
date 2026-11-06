import { useCallback, useEffect, useRef, useState } from 'react';
import type { PasswordOptions } from '../types/password';
import { generateMany, generateFromPlan } from '../lib/generator';
import { planGeneration } from '../lib/passwordValidation';
import { copyText } from '../hooks/useClipboard';
import { useAnnounce } from '../hooks/useAnnouncer';
import { SaveToBrowserButton } from './SaveToBrowser';
import { IconAlert, IconCheck, IconCopy, IconDownload, IconEye, IconEyeOff, IconRefresh, IconTrash, IconLayers } from './Icons';

const COUNTS = [5, 10, 25, 50] as const;

interface Props {
  options: PasswordOptions;
  summary: string;
  onEditSettings: () => void;
  onSaveToBrowser?: (value: string) => void;
}

interface Row {
  id: number;
  value: string;
}

export function BulkGenerator({ options, summary, onEditSettings, onSaveToBrowser }: Props) {
  const announce = useAnnounce();
  const [count, setCount] = useState<(typeof COUNTS)[number]>(10);
  const [rows, setRows] = useState<Row[]>([]);
  const [masked, setMasked] = useState(false);
  const [copiedId, setCopiedId] = useState<number | 'all' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  const flash = (id: number | 'all') => {
    setCopiedId(id);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopiedId(null), 1600);
  };

  const generate = () => {
    try {
      const list = generateMany(options, count);
      setRows(list.map((value) => ({ id: ++idRef.current, value })));
      setError(null);
      announce(`${count} new passwords generated`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate passwords.');
    }
  };

  const regenerateOne = (id: number) => {
    try {
      const plan = planGeneration(options);
      setRows((r) => r.map((row) => (row.id === id ? { id: ++idRef.current, value: generateFromPlan(plan) } : row)));
      announce('Password regenerated');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate a password.');
    }
  };

  const copyOne = async (row: Row) => {
    const ok = await copyText(row.value);
    if (ok) {
      flash(row.id);
      announce('Password copied to clipboard');
    } else announce('Copy failed. Select the password and copy it manually.');
  };

  const copyAll = async () => {
    const ok = await copyText(rows.map((r) => r.value).join('\n'));
    if (ok) {
      flash('all');
      announce(`${rows.length} passwords copied to clipboard`);
    } else announce('Copy failed.');
  };

  const clear = useCallback(() => {
    setRows((r) => {
      r.forEach((x) => (x.value = ''));
      return [];
    });
    announce('Password list cleared');
  }, [announce]);

  const doDownload = () => {
    const blob = new Blob([rows.map((r) => r.value).join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaultkey-passwords-${rows.length}.txt`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    dialogRef.current?.close();
    announce('Download started');
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Bulk generation</h2>
            <p className="mt-1 text-sm text-muted">
              Each password is generated independently with: <span className="text-ink">{summary}</span>.{' '}
              <button type="button" className="text-primary underline underline-offset-2" onClick={onEditSettings}>
                Change settings
              </button>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="seg" role="radiogroup" aria-label="How many passwords">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={count === c}
                  className="seg-btn min-w-[3rem]"
                  onClick={() => setCount(c)}
                  data-testid={`bulk-count-${c}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-primary" onClick={generate} data-testid="bulk-generate">
              <IconLayers size={18} />
              Generate {count}
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-warn">
            {error}
          </p>
        )}
      </div>

      {rows.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3 sm:p-4">
            <span className="mr-auto text-sm text-muted" data-testid="bulk-count-label">
              {rows.length} passwords · kept in memory only
            </span>
            <button type="button" className="icon-btn" onClick={() => setMasked((m) => !m)} aria-pressed={masked} aria-label={masked ? 'Show passwords' : 'Hide passwords'}>
              {masked ? <IconEye size={18} /> : <IconEyeOff size={18} />}
            </button>
            <button type="button" className={`btn btn-ghost !min-h-[2.75rem] ${copiedId === 'all' ? '!border-primary !text-primary' : ''}`} onClick={copyAll} data-testid="bulk-copy-all">
              {copiedId === 'all' ? <IconCheck size={18} /> : <IconCopy size={18} />}
              {copiedId === 'all' ? 'Copied all' : 'Copy all'}
            </button>
            <button type="button" className="btn btn-ghost !min-h-[2.75rem]" onClick={() => dialogRef.current?.showModal()} data-testid="bulk-download">
              <IconDownload size={18} />
              Download .txt
            </button>
            <button type="button" className="btn btn-ghost !min-h-[2.75rem]" onClick={clear} data-testid="bulk-clear">
              <IconTrash size={18} />
              Clear
            </button>
          </div>
          <ol className="divide-y divide-line" data-testid="bulk-list">
            {rows.map((row, i) => (
              <li key={row.id} className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
                <span className="w-7 flex-none text-right text-xs tabular-nums text-subtle" aria-hidden="true">
                  {i + 1}
                </span>
                <code
                  className="char-in min-w-0 flex-1 select-all break-all font-mono text-[0.95rem] text-ink"
                  aria-label={masked ? `Password ${i + 1}, hidden` : `Password ${i + 1}`}
                  data-testid="bulk-item"
                >
                  {masked ? '•'.repeat(row.value.length) : row.value}
                </code>
                <button
                  type="button"
                  className={`icon-btn !h-10 !w-10 ${copiedId === row.id ? 'is-success' : ''}`}
                  onClick={() => copyOne(row)}
                  aria-label={`Copy password ${i + 1}`}
                >
                  {copiedId === row.id ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </button>
                <button type="button" className="icon-btn !h-10 !w-10" onClick={() => regenerateOne(row.id)} aria-label={`Regenerate password ${i + 1}`}>
                  <IconRefresh size={16} />
                </button>
                {onSaveToBrowser && <SaveToBrowserButton compact onClick={() => onSaveToBrowser(row.value)} />}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="card grid place-items-center gap-2 p-10 text-center">
          <IconLayers size={28} className="text-primary" />
          <p className="font-medium">No passwords yet</p>
          <p className="max-w-sm text-sm text-muted">Choose how many you need and press Generate. Nothing is saved — closing or reloading the tab discards the list.</p>
        </div>
      )}

      <dialog ref={dialogRef} className="vk-dialog" aria-labelledby="dl-title" aria-describedby="dl-desc" data-testid="download-dialog">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-warn/15 text-warn">
              <IconAlert size={20} />
            </span>
            <h2 id="dl-title" className="text-lg font-semibold">
              Download passwords as plain text?
            </h2>
          </div>
          <div id="dl-desc" className="mt-4 space-y-2 text-sm text-muted">
            <p>
              The file will contain <strong className="text-ink">{rows.length} unencrypted passwords</strong>. Anyone who can open it — or any app that syncs
              your Downloads folder — can read them.
            </p>
            <p>Move them into a password manager as soon as possible, then delete the file (and empty the trash).</p>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn btn-ghost" onClick={() => dialogRef.current?.close()} autoFocus data-testid="download-cancel">
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={doDownload} data-testid="download-confirm">
              <IconDownload size={18} />I understand, download
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
