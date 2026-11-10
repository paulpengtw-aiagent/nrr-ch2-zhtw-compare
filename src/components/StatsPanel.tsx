import { ChevronDown } from 'lucide-react';
import type { FileMeta, Meta, ModelId, Section, StructStats } from '@/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MODEL_COLOR, MODEL_NAME } from '@/lib/ui/models';
import { cn } from '@/lib/ui/utils';
import { ModelChip } from './ModelChip';

const MODELS: ModelId[] = ['kimi', 'gemini'];
const STRUCT_ROWS: [keyof StructStats, string][] = [
  ['blocks', '區塊'],
  ['headings', '標題'],
  ['tables', '表格'],
  ['links', '連結'],
  ['lists', '清單'],
];
const PENDING = '待補';
const NONE = '—';

/** Drops bullet markers and placeholder entries such as "- none" so an empty list shows 無. */
function cleanNotes(notes: string[] | null | undefined): string[] {
  return (notes ?? [])
    .map((n) => n.replace(/^\s*[-*]\s*/, '').trim())
    .filter((n) => n.length > 0 && !/^(none|無|n\/a)$/i.test(n));
}

function fmtSeconds(v: number | null | undefined, unavailable: boolean): string {
  if (v == null) return unavailable ? PENDING : NONE;
  return `${v.toFixed(1)} 秒`;
}

function fmtCost(v: number | null | undefined, unavailable: boolean): string {
  if (v == null) return unavailable ? PENDING : NONE;
  return `US$ ${v.toFixed(3)}`;
}

function fmtTokens(t: FileMeta['tokens'] | undefined, unavailable: boolean): string {
  if (t == null) return unavailable ? PENDING : NONE;
  if (typeof t === 'number') return `${t.toLocaleString('zh-TW')} tokens`;
  return `輸入 ${t.input.toLocaleString('zh-TW')} ／ 輸出 ${t.output.toLocaleString('zh-TW')}`;
}

export function StatsPanel({ section, meta }: { section: Section; meta: Meta }) {
  return (
    <Collapsible defaultOpen className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
      <CollapsibleTrigger className="group flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        本節統計與備註
        <ChevronDown aria-hidden="true" className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-4 border-t border-border p-4 md:grid-cols-2">
          {MODELS.map((m) => (
            <ModelStatsCard key={m} model={m} section={section} meta={meta} />
          ))}
        </div>
        <div className="border-t border-border p-4">
          <h3 className="mb-2 text-sm font-semibold">結構對照（與英文原文比較）</h3>
          <StructureTable section={section} />
        </div>
        <div className="border-t border-border p-4">
          <Collapsible>
            <CollapsibleTrigger className="group flex cursor-pointer items-center gap-2 text-sm font-semibold outline-none hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring">
              <ChevronDown aria-hidden="true" className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              詞彙備註
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {MODELS.map((m) => (
                  <GlossaryList key={m} model={m} section={section} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ModelStatsCard({ model, section, meta }: { model: ModelId; section: Section; meta: Meta }) {
  const ms = section.models[model];
  const file: FileMeta | undefined = meta.models[model]?.files[section.file];
  const na = !ms.available;
  const seconds = file?.seconds ?? null;
  const cost = file?.costUsd ?? null;
  const tokens = file?.tokens ?? null;
  const lint = file?.lintFindings ?? null;
  const notes = file?.notes?.trim() ? file.notes : '無';

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3">
        <ModelChip label={MODEL_NAME[model]} color={MODEL_COLOR[model]} />
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        <Stat label="耗時" value={fmtSeconds(seconds, na)} />
        {model === 'kimi' && <Stat label="花費" value={fmtCost(cost, na)} />}
        {model === 'kimi' && <Stat label="Token" value={fmtTokens(tokens, na)} />}
        <Stat label="結構檢查" value={file?.structureCheck ? file.structureCheck : PENDING} />
        <Stat label="Lint 發現" value={lint === null ? (na ? PENDING : NONE) : `${lint} 項`} />
        <Stat label="哨兵標記" value={ms.sentinel ? '有' : '無'} />
        <Stat label="第二部分" value={ms.part2 ? '有' : '無'} />
        <Stat label="備註" value={notes} />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium tabular-nums">{value}</dd>
    </>
  );
}

function StructureTable({ section }: { section: Section }) {
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
            {MODELS.map((m) => (
              <th key={m} scope="col" className="py-2 pr-4 font-medium" style={{ color: MODEL_COLOR[m] }}>
                {MODEL_NAME[m]}
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
                {MODELS.map((m) => {
                  const structure = section.models[m].structure;
                  const v = structure ? structure[key] : null;
                  const mismatch = v !== null && v !== en;
                  return (
                    <td
                      key={m}
                      className={cn(
                        'py-2 pr-4 tabular-nums',
                        mismatch && 'bg-warn-soft font-medium text-warn-foreground',
                      )}
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

function GlossaryList({ model, section }: { model: ModelId; section: Section }) {
  const notes = cleanNotes(section.models[model].glossaryNotes);
  return (
    <div>
      <h4 className="mb-1.5 text-sm font-semibold" style={{ color: MODEL_COLOR[model] }}>
        {MODEL_NAME[model]}
      </h4>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">無</p>
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
