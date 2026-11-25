import { Eye, Info } from 'lucide-react';
import type { R3Data } from '@/types';
import { Button } from '@/components/ui/button';
import { R3_COLORS, TIE, tally3All, tallyOf3, type VerdictStore3 } from '@/lib/ui/verdicts3';
import { InfoTip } from './InfoTip';

const dash = '—';

/** Round-3 總覽: per model, verdict tally, time and tokens per file (run-log.md), and the check findings (summary.json). */
export function OverviewViewR3({ data, store, blind, onReveal }: { data: R3Data; store: VerdictStore3; blind: boolean; onReveal: () => void }) {
  const models = data.meta.models;
  const total = tally3All(data.sections, store, models);
  const anyPresent = data.sections.some((s) => models.some((m) => s.models[m.id]?.present));

  if (blind) {
    return (
      <section data-testid="overview-r3-blind" className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm leading-relaxed text-muted-foreground">盲測模式中，總覽會揭露模型名稱與各模型的統計，因此先隱藏。評判會保留。</p>
        <Button data-testid="reveal-r3" className="mt-4" onClick={onReveal}>
          <Eye aria-hidden="true" />
          揭曉模型並查看總覽
        </Button>
      </section>
    );
  }

  return (
    <section data-testid="overview-r3" className="min-w-0 space-y-8">
      <header className="border-b border-border pb-4">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">第三輪總覽</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.meta.run
            ? `執行資料夾 ${data.meta.run.sha.slice(0, 7)}，抓取於 ${data.meta.run.fetchedAt}；run-log 共 ${data.meta.callsLogged} 筆呼叫。`
            : '尚未抓取執行資料夾。'}
          {!anyPresent && ' 目前還沒有任何模型的譯文，下表為佔位。'}
        </p>
      </header>

      <div>
        <h3 className="mb-2 text-base font-semibold">評判統計</h3>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table data-testid="r3-tally-table" className="w-full min-w-[36rem] text-sm tabular-nums">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium">模型</th>
                {data.sections.map((s) => (
                  <th key={s.id} className="px-3 py-2 font-medium">{s.id}</th>
                ))}
                <th className="px-3 py-2 font-medium">合計</th>
              </tr>
            </thead>
            <tbody>
              {[...models.map((m) => ({ id: m.id, label: m.label })), { id: TIE, label: '差不多' }].map((m) => (
                <tr key={m.id} className="border-b border-border/60 last:border-0">
                  <th scope="row" className="px-3 py-2 text-left font-medium" style={{ color: R3_COLORS[m.id] }}>{m.label}</th>
                  {data.sections.map((s) => (
                    <td key={s.id} className="px-3 py-2">{tallyOf3(s, store, models)[m.id] ?? 0}</td>
                  ))}
                  <td data-testid={`r3-total-${m.id}`} className="px-3 py-2 font-semibold">{total[m.id] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-base font-semibold">
          耗時、tokens 與檢查結果
          <InfoTip content="耗時與 tokens 取自 output/run-log.md（同一檔多次呼叫會加總）；檢查結果取自 check/<模型>/summary.json：還原的英文字串、骨架差異、連結問題、--check 結果與漢字數。">
            <Info tabIndex={0} className="size-4 cursor-help text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="說明" />
          </InfoTip>
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table data-testid="r3-stats-table" className="w-full min-w-[52rem] text-sm tabular-nums">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium">模型</th>
                <th className="px-3 py-2 font-medium">檔案</th>
                <th className="px-3 py-2 font-medium">耗時</th>
                <th className="px-3 py-2 font-medium">tokens 輸入 / 輸出</th>
                <th className="px-3 py-2 font-medium">呼叫</th>
                <th className="px-3 py-2 font-medium">詞彙表備註</th>
                <th className="px-3 py-2 font-medium">還原字串</th>
                <th className="px-3 py-2 font-medium">骨架差異</th>
                <th className="px-3 py-2 font-medium">連結問題</th>
                <th className="px-3 py-2 font-medium">--check</th>
                <th className="px-3 py-2 font-medium">漢字數</th>
              </tr>
            </thead>
            <tbody>
              {models.flatMap((m) =>
                data.sections.map((s, i) => {
                  const st = s.models[m.id];
                  const c = st?.check;
                  return (
                    <tr key={`${m.id}-${s.id}`} data-testid={`r3-stat-${m.id}-${s.id}`} className="border-b border-border/60 align-top last:border-0">
                      {i === 0 && (
                        <th scope="rowgroup" rowSpan={data.sections.length} className="px-3 py-2 text-left font-medium" style={{ color: R3_COLORS[m.id] }}>
                          {m.label}
                        </th>
                      )}
                      <td className="px-3 py-2">
                        {s.id}
                        {st?.source === 'raw' && <span className="block text-[0.7rem] text-muted-foreground">原始回覆</span>}
                      </td>
                      {!st?.present ? (
                        <td colSpan={9} className="px-3 py-2 text-muted-foreground">尚未翻譯（not translated yet）</td>
                      ) : (
                        <>
                          <td className="px-3 py-2">{st.seconds != null ? `${st.seconds} 秒` : dash}</td>
                          <td className="px-3 py-2">
                            {st.tokensIn != null || st.tokensOut != null ? (
                              <InfoTip content={`輸入 ${st.tokensIn?.toLocaleString() ?? dash} · 輸出 ${st.tokensOut?.toLocaleString() ?? dash}（其中思考 ${st.tokensThink?.toLocaleString() ?? dash}）`}>
                                <span tabIndex={0} className="cursor-help whitespace-nowrap underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                  {st.tokensIn?.toLocaleString() ?? dash} / {st.tokensOut?.toLocaleString() ?? dash}
                                </span>
                              </InfoTip>
                            ) : st.tokens != null ? (
                              st.tokens.toLocaleString()
                            ) : (
                              dash
                            )}
                          </td>
                          <td className="px-3 py-2">{st.calls ? `${st.calls}${st.statuses.length ? `（${st.statuses.join('、')}）` : ''}` : dash}</td>
                          <Findings items={st.glossary.map((g) => `${g.term} → ${g.used}`)} />
                          <Findings items={[...(c?.restored ?? []), ...(c?.notRestored ?? []).map((x) => `未還原：${x}`)]} count={c?.restoredCount} />
                          <Findings items={c?.skeleton} />
                          <Findings items={c?.links} />
                          <td className="max-w-[12rem] break-words px-3 py-2">
                            {c?.check ?? dash}
                            {c && c.checkWarnings.length > 0 && <span className="block text-xs text-warn-foreground">{c.checkWarnings.length} 個警告</span>}
                            {c && c.fence.length > 0 && <span className="block text-xs text-warn-foreground">程式碼圍欄 {c.fence.length}</span>}
                            {c && c.completeness.some((x) => !/: complete$/.test(x)) && <span className="block text-xs text-warn-foreground">不完整</span>}
                          </td>
                          <td className="px-3 py-2">{c?.cjk ?? st.cjk ?? dash}</td>
                        </>
                      )}
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div data-testid="r3-glossary">
        <h3 className="mb-2 text-base font-semibold">詞彙表備註（各模型回覆的 GLOSSARY-NOTES）</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {models.map((m) => {
            const notes = data.sections.flatMap((s) => (s.models[m.id]?.glossary ?? []).map((g) => ({ id: s.id, g })));
            return (
              <div key={m.id} data-testid={`r3-glossary-${m.id}`} className="min-w-0 rounded-xl border border-border bg-card p-4">
                <p className="font-semibold" style={{ color: R3_COLORS[m.id] }}>
                  {m.label} <span className="text-sm font-normal text-muted-foreground">· {notes.length} 則</span>
                </p>
                {notes.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">三個檔案都寫「none」。</p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm leading-relaxed">
                    {notes.map(({ id, g }) => (
                      <li key={`${id}-${g.term}`} className="break-words">
                        <span className="font-mono text-xs text-muted-foreground">{id}</span> <strong className="font-semibold">{g.term.replace(/\*\*/g, '')}</strong>：詞彙表「{g.glossary}」→ 譯為「{g.used}」
                        <span className="block text-muted-foreground">{g.reason}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {data.readmeTable && (
        <div data-testid="r3-readme-table">
          <h3 className="mb-1 text-base font-semibold">check/README.md 的結果表</h3>
          <p className="mb-2 text-sm text-muted-foreground">原樣照錄：每檔的 agy 秒數與輸出／思考 tokens（輸出包含思考），以及各項檢查結果。</p>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[56rem] text-sm tabular-nums">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  {data.readmeTable.header.map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.readmeTable.rows.map((r, i) => (
                  <tr key={i} className={/total/i.test(r[0] ?? '') ? 'border-b border-border bg-muted/50 font-semibold' : 'border-b border-border/60'}>
                    {r.map((c, j) => (
                      <td key={j} className="whitespace-nowrap px-3 py-1.5">{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-base font-semibold">已發布譯本（參考欄）</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {data.sections.map((s) => (
            <li key={s.id} data-testid={`r3-published-${s.id}`}>
              {s.id}：{s.published.present ? (s.published.state === 'stale' ? '已過期' : s.published.state === 'current' ? '與英文同步' : '無法判斷') : '沒有已發布譯本'}
              {s.published.detail && `（${s.published.detail}）`}
            </li>
          ))}
        </ul>
      </div>

      {data.sections.some((s) => s.unmatchedNotes.length) && (
        <div>
          <h3 className="mb-2 text-base font-semibold">未對到列的檢查發現</h3>
          <ul className="space-y-1 text-sm">
            {data.sections.flatMap((s) =>
              s.unmatchedNotes.map((n) => (
                <li key={`${s.id}-${n.model}-${n.text}`} data-testid="r3-unmatched" className="break-words">
                  {s.id} · {models.find((m) => m.id === n.model)?.label ?? n.model}：{n.text}
                </li>
              )),
            )}
          </ul>
        </div>
      )}
    </section>
  );
}

function Findings({ items, count }: { items: string[] | undefined; count?: number | undefined }) {
  const n = count ?? items?.length;
  if (n == null) return <td className="px-3 py-2">{dash}</td>;
  if (!items?.length) return <td className="px-3 py-2">{n}</td>;
  return (
    <td className="px-3 py-2">
      <InfoTip content={<ul className="max-w-xs list-disc space-y-0.5 pl-4 text-left">{items.slice(0, 12).map((t) => <li key={t}>{t}</li>)}</ul>}>
        <span tabIndex={0} className="cursor-help underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {n}
        </span>
      </InfoTip>
    </td>
  );
}
