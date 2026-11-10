import type { Meta, ModelId, Section } from '@/types';
import { Button } from '@/components/ui/button';
import { buildHash } from '@/lib/ui/links';
import { MODEL_COLOR } from '@/lib/ui/models';
import type { VerdictStore } from '@/lib/ui/verdicts';
import {
  failedAttemptNote,
  fileMeta,
  fmtTokens,
  fmtUsd,
  MODEL_IDS,
  PENDING,
  shortName,
  sumKnown,
  tallyOf,
} from '@/lib/ui/stats';
import { InfoTip } from './InfoTip';

interface OverviewViewProps {
  sections: Section[];
  meta: Meta;
  store: VerdictStore;
  names: Record<ModelId, string>;
  blind: boolean;
  onReveal: () => void;
}

export function OverviewView({ sections, meta, store, names, blind, onReveal }: OverviewViewProps) {
  if (blind) {
    return (
      <section
        data-testid="overview-blind"
        aria-labelledby="overview-title"
        className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center"
      >
        <h2 id="overview-title" className="text-lg font-semibold">
          總覽
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">揭曉後顯示</p>
        <div className="mt-4 flex justify-center">
          <InfoTip content="結束盲測，顯示模型名稱與總覽統計。">
            <Button data-testid="overview-reveal" size="sm" onClick={onReveal}>
              揭曉
            </Button>
          </InfoTip>
        </div>
      </section>
    );
  }

  const total = { kimi: 0, gemini: 0, tie: 0, verdicts: 0, rows: 0 };
  const perSection = sections.map((s) => {
    const t = tallyOf(s, store);
    const verdicts = t.kimi + t.gemini + t.tie;
    total.kimi += t.kimi;
    total.gemini += t.gemini;
    total.tie += t.tie;
    total.verdicts += verdicts;
    total.rows += s.rows.length;
    return { section: s, tally: t, verdicts };
  });

  const notes: { section: Section; rowN: number; rowId: string; winner: string | undefined; note: string }[] = [];
  for (const s of sections) {
    for (const row of s.rows) {
      const v = store[row.id];
      if (v?.note?.trim()) {
        notes.push({ section: s, rowN: row.n, rowId: row.id, winner: v.winner, note: v.note.trim() });
      }
    }
  }

  const fileFor = (m: ModelId, s: Section) => fileMeta(meta, m, s.file);
  // First per-file note of a kind (the flat-rate note of a subscription run); null when no file has one.
  const noteOf = (m: ModelId, key: 'costNote' | 'tokensNote') =>
    sections.map((s) => fileFor(m, s)?.[key]).find((v): v is string => !!v) ?? null;
  const secondsOf = (m: ModelId) => sumKnown(sections.map((s) => fileFor(m, s)?.seconds));
  const costOf = (m: ModelId) => sumKnown(sections.map((s) => fileFor(m, s)?.costUsd));
  const lintOf = (m: ModelId) => sumKnown(sections.map((s) => fileFor(m, s)?.lint?.total));
  const diffsOf = (m: ModelId) => sumKnown(sections.map((s) => fileFor(m, s)?.structureDiffs));
  // Sections with a known structure check; a model with no data shows 待補 instead of 0 / n.
  const passOf = (m: ModelId) => ({
    pass: sections.filter((s) => fileFor(m, s)?.structureDiffs === 0).length,
    known: sections.filter((s) => fileFor(m, s)?.structureDiffs != null).length,
  });
  const failed = MODEL_IDS.flatMap((m) =>
    sections.flatMap((s) => (fileFor(m, s)?.failedAttempts ?? []).map((attempt) => ({ model: m, section: s, attempt }))),
  );
  const n = sections.length;

  const winnerLabel = (w: string | undefined) => {
    if (w === undefined) return '未評判';
    if (w === 'tie') return '差不多';
    if (w === 'kimi' || w === 'gemini') return `${names[w]} 較好`;
    return '未評判';
  };

  const cell = 'py-2 pr-4 tabular-nums';

  return (
    <div className="space-y-10">
      <section aria-labelledby="overview-title" className="space-y-2">
        <h2 id="overview-title" className="text-xl font-semibold tracking-tight sm:text-2xl">
          總覽
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          全部 {n} 節的評判、耗時、花費、Lint 與結構統計。數字依這個瀏覽器中儲存的評判即時計算。
        </p>
      </section>

      <section aria-labelledby="ov-verdicts" className="space-y-3">
        <h3 id="ov-verdicts" className="text-sm font-semibold">
          評判統計
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border bg-card p-4">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">
                  節
                </th>
                <th scope="col" className="py-2 pr-4 font-medium" style={{ color: MODEL_COLOR.kimi }}>
                  {names.kimi}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  平手
                </th>
                <th scope="col" className="py-2 pr-4 font-medium" style={{ color: MODEL_COLOR.gemini }}>
                  {names.gemini}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  已評判 / 列數
                </th>
              </tr>
            </thead>
            <tbody>
              {perSection.map(({ section: s, tally: t, verdicts }) => (
                <tr key={s.id} className="border-t border-border">
                  <th scope="row" className="py-2 pr-4 text-left font-normal">
                    <InfoTip content={`前往第 ${s.id} 節：${s.titleEn}`}>
                      <a href={buildHash(s.id)} className="underline underline-offset-4 hover:text-foreground">
                        {s.id} {s.titleZh}
                      </a>
                    </InfoTip>
                  </th>
                  <td className={cell}>{t.kimi}</td>
                  <td className={cell}>{t.tie}</td>
                  <td className={cell}>{t.gemini}</td>
                  <td className={cell}>
                    {verdicts} / {s.rows.length}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-semibold">
                <th scope="row" className="py-2 pr-4 text-left">
                  全部
                </th>
                <td className={cell}>{total.kimi}</td>
                <td className={cell}>{total.tie}</td>
                <td className={cell}>{total.gemini}</td>
                <td className={cell}>
                  {total.verdicts} / {total.rows}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="ov-time" className="space-y-3">
        <h3 id="ov-time" className="text-sm font-semibold">
          耗時與花費
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {MODEL_IDS.map((m) => {
            const totals = meta.models[m]?.totals ?? null;
            const sec = secondsOf(m);
            const cost = costOf(m);
            const failedSec = failed
              .filter((x) => x.model === m)
              .reduce((acc, x) => acc + (x.attempt.seconds ?? 0), 0);

            // Run-JSON totals include failed attempts; the per-file sums are the fallback (manual values).
            const timeMain =
              totals?.seconds != null
                ? `${totals.seconds.toFixed(1)} 秒`
                : sec.known > 0
                  ? `${sec.sum.toFixed(1)} 秒`
                  : PENDING;
            // No failed requests (count and failed seconds both zero): the adopted-vs-failed split line is omitted.
            const hasFailed = (totals?.failedRequests ?? 0) > 0 || failedSec > 0;
            const timeSub =
              totals?.seconds != null
                ? hasFailed
                  ? `僅計採用的結果 ${sec.sum.toFixed(1)} 秒；另有失敗嘗試 ${failedSec.toFixed(1)} 秒`
                  : null
                : sec.known > 0 && sec.known < n
                  ? `（${sec.known}/${n} 檔有資料）`
                  : null;

            const costMain =
              totals?.costUsd != null
                ? fmtUsd(totals.costUsd)
                : cost.known > 0
                  ? `${fmtUsd(cost.sum)}${cost.known < n ? `（${cost.known}/${n} 檔有資料）` : ''}`
                  : (noteOf(m, 'costNote') ?? PENDING);
            const costSub = totals?.costCachedUsd != null ? `全價上限；計入快取後 ${fmtUsd(totals.costCachedUsd)}` : null;
            const tokenMain = totals?.tokens ? fmtTokens(totals.tokens) : (noteOf(m, 'tokensNote') ?? PENDING);
            const tokenSub = totals?.tokens && (totals.failedRequests ?? 0) > 0 ? '含失敗的嘗試' : null;

            return (
              <div key={m} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold" style={{ color: MODEL_COLOR[m] }}>
                  {names[m]}
                </p>
                <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-muted-foreground">總耗時</dt>
                  <dd className="tabular-nums">
                    {timeMain}
                    {timeSub && <span className="mt-0.5 block text-xs text-muted-foreground">{timeSub}</span>}
                  </dd>
                  <dt className="text-muted-foreground">總花費</dt>
                  <dd className="tabular-nums">
                    {costMain}
                    {costSub && <span className="mt-0.5 block text-xs text-muted-foreground">{costSub}</span>}
                  </dd>
                  <dt className="text-muted-foreground">總 Token</dt>
                  <dd className="tabular-nums">
                    {tokenMain}
                    {tokenSub && <span className="mt-0.5 block text-xs text-muted-foreground">{tokenSub}</span>}
                  </dd>
                  {totals?.requests != null && (
                    <>
                      <dt className="text-muted-foreground">請求次數</dt>
                      <dd className="tabular-nums">
                        {totals.requests} 次
                        {totals.failedRequests ? `（含失敗 ${totals.failedRequests} 次）` : ''}
                      </dd>
                    </>
                  )}
                </dl>
                {m === 'gemini' && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Gemini 時間取自 run-log.md：送出至回覆完成，每 20 秒輪詢，誤差 ±20 秒；與 Kimi 的 API 計時僅在此誤差內可比。
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="ov-runs" className="space-y-3">
        <h3 id="ov-runs" className="text-sm font-semibold">
          執行備註
        </h3>
        {failed.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground">
            尚無失敗嘗試的紀錄。
          </p>
        ) : (
          <ul className="space-y-2">
            {failed.map((x) => (
              <li
                key={`${x.model}-${x.section.id}-${x.attempt.attempt}`}
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed"
              >
                {failedAttemptNote(shortName(meta, x.model), x.section.id, x.attempt)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ov-lint" className="space-y-3">
        <h3 id="ov-lint" className="text-sm font-semibold">
          Lint 與結構
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border bg-card p-4">
          <table className="w-full min-w-[26rem] border-collapse text-sm">
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
              <tr className="border-t border-border">
                <th scope="row" className="py-2 pr-4 text-left font-normal">
                  Lint 發現合計
                </th>
                {MODEL_IDS.map((m) => {
                  const l = lintOf(m);
                  return (
                    <td key={m} className={cell}>
                      {l.known > 0 ? `${l.sum} 項` : PENDING}
                      {l.known < n && l.known > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">（{l.known}/{n} 檔）</span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-t border-border">
                <th scope="row" className="py-2 pr-4 text-left font-normal">
                  結構差異合計
                </th>
                {MODEL_IDS.map((m) => {
                  const d = diffsOf(m);
                  return (
                    <td key={m} className={cell}>
                      {d.known > 0 ? `${d.sum} 處不同` : PENDING}
                      {d.known < n && d.known > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">（{d.known}/{n} 檔）</span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-t border-border">
                <th scope="row" className="py-2 pr-4 text-left font-normal">
                  結構與原文一致的節數
                </th>
                {MODEL_IDS.map((m) => {
                  const p = passOf(m);
                  return (
                    <td key={m} className={cell}>
                      {p.known === 0 ? PENDING : `${p.pass} / ${n}`}
                      {p.known > 0 && p.known < n && (
                        <span className="ml-1 text-xs text-muted-foreground">（{p.known}/{n} 檔）</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="ov-notes" className="space-y-3">
        <h3 id="ov-notes" className="text-sm font-semibold">
          備註列表
        </h3>
        {notes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            尚無備註。在各列底部的備註欄輸入後，會列在這裡。
          </p>
        ) : (
          <ul className="space-y-2">
            {notes.map((item) => (
              <li key={item.rowId} className="rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-mono">{item.section.id}</span>
                  <InfoTip content="跳到這一列（會開啟該節並標示此列）">
                    <a
                      href={buildHash(item.section.id, item.rowN)}
                      className="font-medium text-foreground underline underline-offset-4"
                    >
                      第 {item.rowN} 列
                    </a>
                  </InfoTip>
                  <span>{winnerLabel(item.winner)}</span>
                </div>
                <p className="mt-1 break-words">{item.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
