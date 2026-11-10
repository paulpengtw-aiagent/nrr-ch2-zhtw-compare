import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FileMeta, Meta, ModelId, Section, StructStats } from '@/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MODEL_COLOR } from '@/lib/ui/models';
import {
  cleanNotes,
  fileMeta,
  fmtCost,
  fmtCount,
  fmtLint,
  fmtSeconds,
  fmtTokens,
  MODEL_IDS,
  PENDING,
  structureMark,
} from '@/lib/ui/stats';
import { cn } from '@/lib/ui/utils';
import { InfoTip } from './InfoTip';

const STRUCT_ROWS: [keyof StructStats, string][] = [
  ['blocks', '區塊'],
  ['headings', '標題'],
  ['tables', '表格'],
  ['links', '連結'],
  ['lists', '清單'],
];

const SOURCE_LABEL: Record<FileMeta['source'], string> = {
  'run-json': '執行紀錄（JSON）',
  manual: '人工填寫',
  none: '尚無資料',
};

const NONE = '無';

function Note({ children }: { children: ReactNode }) {
  return <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{children}</span>;
}

/** One-line per-model summary: seconds, cost (or 訂閱方案), structure mark, lint count. Click to expand the full table. */
export function SummaryStrip({
  section,
  meta,
  names,
}: {
  section: Section;
  meta: Meta;
  names: Record<ModelId, string>;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `stats-${section.id}`;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-5">
      <InfoTip content="點一下展開本節完整統計表（耗時、花費、Token、結構差異、Lint、主要發現、備註與資料來源）。">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            data-testid="summary-strip"
            aria-controls={panelId}
            className="group flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-left text-xs outline-none transition-colors duration-200 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          >
            {MODEL_IDS.map((m) => {
              const f = fileMeta(meta, m, section.file);
              return (
                <span key={m} className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
                  <span className="font-semibold" style={{ color: MODEL_COLOR[m] }}>
                    {names[m]}
                  </span>
                  <span>耗時 {fmtSeconds(f?.seconds)}</span>
                  <span aria-hidden="true" className="text-muted-foreground">
                    ·
                  </span>
                  <span>{fmtCost(meta, m, f?.costUsd)}</span>
                  <span aria-hidden="true" className="text-muted-foreground">
                    ·
                  </span>
                  <span>結構 {structureMark(f?.structureDiffs)}</span>
                  <span aria-hidden="true" className="text-muted-foreground">
                    ·
                  </span>
                  <span>Lint {f?.lint ? f.lint.total : PENDING}</span>
                </span>
              );
            })}
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
              詳細統計
              <ChevronDown aria-hidden="true" className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </span>
          </button>
        </CollapsibleTrigger>
      </InfoTip>
      <CollapsibleContent id={panelId}>
        <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-card p-4">
          <FullStatsTable section={section} meta={meta} names={names} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Full per-model stats table for one section. */
export function FullStatsTable({
  section,
  meta,
  names,
}: {
  section: Section;
  meta: Meta;
  names: Record<ModelId, string>;
}) {
  const fm = (m: ModelId): FileMeta | undefined => fileMeta(meta, m, section.file);
  const rows: { key: string; label: ReactNode; render: (m: ModelId) => ReactNode }[] = [
    {
      key: 'seconds',
      label: '耗時',
      render: (m) => (
        <>
          {fmtSeconds(fm(m)?.seconds)}
          {fm(m)?.secondsNote && <Note>{fm(m)?.secondsNote}</Note>}
        </>
      ),
    },
    {
      key: 'cost',
      label: '花費',
      render: (m) => (
        <>
          {fmtCost(meta, m, fm(m)?.costUsd)}
          {fm(m)?.costNote && <Note>{fm(m)?.costNote}</Note>}
        </>
      ),
    },
    { key: 'tokens', label: 'Token', render: (m) => fmtTokens(fm(m)?.tokens) },
    { key: 'price', label: '價格說明', render: (m) => meta.models[m]?.priceNote || '—' },
    {
      key: 'structure',
      label: (
        <InfoTip content={meta.structureCheckDesc || '結構檢查說明待補'}>
          <span
            tabIndex={0}
            className="cursor-help underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            結構差異
          </span>
        </InfoTip>
      ),
      render: (m) => {
        const d = fm(m)?.structureDiffs;
        if (d == null) return PENDING;
        return d === 0 ? '0 處不同（與原文一致）' : `${d} 處不同`;
      },
    },
    {
      key: 'lint',
      label: (
        <InfoTip content={meta.lintTool || 'Lint 工具說明待補'}>
          <span
            tabIndex={0}
            className="cursor-help underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Lint 發現
          </span>
        </InfoTip>
      ),
      render: (m) => {
        const l = fm(m)?.lint;
        if (!l) return PENDING;
        return (
          <>
            {fmtLint(l)}
            <Note>
              翻譯腔 {fmtCount(l.translationese)} ／ 大陸用語 {fmtCount(l.mainland)} ／ 其他 {fmtCount(l.other)}
            </Note>
          </>
        );
      },
    },
    {
      key: 'findings',
      label: '主要發現',
      render: (m) => {
        const items = cleanNotes(fm(m)?.topFindings);
        if (items.length === 0) return NONE;
        return (
          <ul className="list-disc space-y-0.5 pl-4 leading-relaxed">
            {items.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        );
      },
    },
    {
      key: 'notes',
      label: '備註',
      render: (m) => (fm(m)?.notes?.trim() ? fm(m)?.notes : NONE),
    },
    {
      key: 'source',
      label: '資料來源',
      render: (m) => SOURCE_LABEL[fm(m)?.source ?? 'none'],
    },
  ];

  return (
    <table className="w-full min-w-[28rem] border-collapse text-sm">
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          <th scope="col" className="py-2 pr-4 font-medium">
            項目
          </th>
          {MODEL_IDS.map((m) => (
            <th key={m} scope="col" className="py-2 pr-4 font-medium" style={{ color: MODEL_COLOR[m] }}>
              {names[m]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-border align-top">
            <th scope="row" className="py-2 pr-4 text-left font-normal text-muted-foreground">
              {r.label}
            </th>
            {MODEL_IDS.map((m) => (
              <td key={m} className="py-2 pr-4 tabular-nums">
                {r.render(m)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** End-of-section block: full stats, structure summary vs source, glossary notes. Hidden while blind. */
export function SectionStats({
  section,
  meta,
  names,
}: {
  section: Section;
  meta: Meta;
  names: Record<ModelId, string>;
}) {
  return (
    <div className="mt-10 space-y-5">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">本節統計</h3>
        <div className="overflow-x-auto">
          <FullStatsTable section={section} meta={meta} names={names} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">結構對照（與英文原文比較）</h3>
        <StructureTable section={section} names={names} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <Collapsible>
          <InfoTip content="展開各模型在本節的詞彙決定（用詞備註）。">
            <CollapsibleTrigger className="group flex cursor-pointer items-center gap-2 text-sm font-semibold outline-none hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring">
              <ChevronDown aria-hidden="true" className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              詞彙備註
            </CollapsibleTrigger>
          </InfoTip>
          <CollapsibleContent>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {MODEL_IDS.map((m) => (
                <GlossaryList key={m} model={m} section={section} meta={meta} names={names} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

function StructureTable({ section, names }: { section: Section; names: Record<ModelId, string> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">
              項目
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              英文原文
            </th>
            {MODEL_IDS.map((m) => (
              <th key={m} scope="col" className="py-2 pr-4 font-medium" style={{ color: MODEL_COLOR[m] }}>
                {names[m]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STRUCT_ROWS.map(([key, label]) => {
            const en = section.enStructure[key];
            return (
              <tr key={key} className="border-t border-border">
                <th scope="row" className="py-2 pr-4 text-left font-normal">
                  {label}
                </th>
                <td className="py-2 pr-4 tabular-nums">{en}</td>
                {MODEL_IDS.map((m) => {
                  const structure = section.models[m].structure;
                  const v = structure ? structure[key] : null;
                  const mismatch = v !== null && v !== en;
                  return (
                    <td
                      key={m}
                      className={cn('py-2 pr-4 tabular-nums', mismatch && 'bg-warn-soft font-medium text-warn-foreground')}
                    >
                      {v === null ? PENDING : v}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GlossaryList({
  model,
  section,
  meta,
  names,
}: {
  model: ModelId;
  section: Section;
  meta: Meta;
  names: Record<ModelId, string>;
}) {
  const fromMeta = fileMeta(meta, model, section.file)?.glossaryNotes;
  const notes = cleanNotes(fromMeta && fromMeta.length > 0 ? fromMeta : section.models[model].glossaryNotes);
  return (
    <div>
      <h4 className="mb-1.5 text-sm font-semibold" style={{ color: MODEL_COLOR[model] }}>
        {names[model]}
      </h4>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{NONE}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
          {notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
