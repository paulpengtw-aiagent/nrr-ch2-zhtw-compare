import type { Lint, R2Data, R2Section } from '@/types';
import { buildRoundHash } from '@/lib/ui/round';
import { tally2All, tallyOf2, verdictLabel2, type VerdictStore2 } from '@/lib/ui/verdicts2';
import { InfoTip } from './InfoTip';

const cell = 'py-2 pr-4 tabular-nums';

const sumLint = (lints: Lint[]): Lint =>
  lints.reduce(
    (acc, l) => ({
      total: acc.total + l.total,
      translationese: (acc.translationese ?? 0) + (l.translationese ?? 0),
      mainland: (acc.mainland ?? 0) + (l.mainland ?? 0),
      other: (acc.other ?? 0) + (l.other ?? 0),
    }),
    { total: 0, translationese: 0, mainland: 0, other: 0 },
  );

const per1k = (count: number, han: number): string => (han > 0 ? ((count / han) * 1000).toFixed(2) : '—');

const lintText = (l: Lint) => `${l.total} (${l.translationese}/${l.mainland}/${l.other})`;

/** Round-2 總覽: verdict tally, timings, --check output, lint per file, old-vs-new lint, notes. Reuses the round-1 overview styling. */
export function OverviewViewR2({ data, store }: { data: R2Data; store: VerdictStore2 }) {
  const { sections, meta, checkOutput, checkWarnings } = data;
  const n = sections.length;
  const total = tally2All(sections, store);
  const verdictCount = total.good + total.ok + total.fix;
  const rowCount = sections.reduce((a, s) => a + s.rows.length, 0);

  const notes: { section: R2Section; rowN: number; rowId: string; verdict: string; note: string }[] = [];
  for (const s of sections) {
    for (const row of s.rows) {
      const entry = store[row.id];
      if (entry?.note?.trim()) {
        notes.push({
          section: s,
          rowN: row.n,
          rowId: row.id,
          verdict: entry.verdict ? verdictLabel2(entry.verdict) : '未評判',
          note: entry.note.trim(),
        });
      }
    }
  }
  const known = sections.flatMap((s) => s.rows.flatMap((row) => row.notes.map((text) => ({ section: s, rowN: row.n, text }))));

  const newLint = sumLint(sections.map((s) => s.lint));
  const newHan = sections.reduce((a, s) => a + s.han, 0);
  const oldLint = sumLint(sections.map((s) => s.oldLint));
  const oldHan = sections.reduce((a, s) => a + s.oldHan, 0);
  const growth = oldHan > 0 ? Math.round((newHan / oldHan - 1) * 100) : null;

  return (
    <div data-testid="overview-r2" className="space-y-10">
      <section aria-labelledby="overview-title" className="space-y-2">
        <h2 id="overview-title" className="text-xl font-semibold tracking-tight sm:text-2xl">
          總覽
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          第二輪全部 {n} 節的評判、耗時、--check 結果與 Lint。數字依這個瀏覽器中儲存的第二輪評判即時計算。
        </p>
      </section>

      <section aria-labelledby="ov2-verdicts" className="space-y-3">
        <h3 id="ov2-verdicts" className="text-sm font-semibold">
          評判統計
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border bg-card p-4">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">
                  節
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  通順
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  尚可
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  需修
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  已評判 / 列數
                </th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => {
                const t = tallyOf2(s, store);
                return (
                  <tr key={s.id} className="border-t border-border">
                    <th scope="row" className="py-2 pr-4 text-left font-normal">
                      <InfoTip content={`前往第二輪第 ${s.id} 節：${s.titleEn}`}>
                        <a href={buildRoundHash(2, s.id)} className="underline underline-offset-4 hover:text-foreground">
                          {s.id} {s.titleZh}
                        </a>
                      </InfoTip>
                    </th>
                    <td className={cell}>{t.good}</td>
                    <td className={cell}>{t.ok}</td>
                    <td className={cell}>{t.fix}</td>
                    <td className={cell}>
                      {t.good + t.ok + t.fix} / {s.rows.length}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border font-semibold">
                <th scope="row" className="py-2 pr-4 text-left">
                  全部
                </th>
                <td className={cell}>{total.good}</td>
                <td className={cell}>{total.ok}</td>
                <td className={cell}>{total.fix}</td>
                <td className={cell}>
                  {verdictCount} / {rowCount}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="ov2-time" className="space-y-3">
        <h3 id="ov2-time" className="text-sm font-semibold">
          耗時（Gemini 網頁版）
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border bg-card p-4">
          <table data-testid="time-table-r2" className="w-full min-w-[26rem] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">
                  節
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  秒數
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  執行說明
                </th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.id} className="border-t border-border align-top">
                  <th scope="row" className="py-2 pr-4 text-left font-normal">
                    {s.id} {s.titleZh}
                  </th>
                  <td className={cell}>{s.seconds == null ? '待補' : `${s.seconds} 秒`}</td>
                  <td className="py-2 leading-relaxed">{s.attemptNote || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{meta.timingNote}</p>
      </section>

      <section aria-labelledby="ov2-check" className="space-y-3">
        <h3 id="ov2-check" className="text-sm font-semibold">
          結構檢查（--check）
        </h3>
        <div className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed">
          <p>
            --check 回報 <strong className="font-semibold">{checkWarnings} 個警告</strong>（退出碼 1），兩個都是連結：2.0（OONI、Al Jazeera）與 2.1（Domino Theory），
            Gemini 以全形「）」收尾連結，連結吞掉後文。2.2、2.3、2.4 與英文原文無差異。
          </p>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground">
              原始輸出（check-output.txt）
            </summary>
            <pre
              data-testid="check-output-r2"
              className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-xs leading-relaxed [overflow-wrap:anywhere]"
            >
              {checkOutput}
            </pre>
          </details>
        </div>
      </section>

      <section aria-labelledby="ov2-lint" className="space-y-3">
        <h3 id="ov2-lint" className="text-sm font-semibold">
          Lint（新英文，每檔一次）
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border bg-card p-4">
          <table data-testid="lint-table-r2" className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">
                  節
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  總計
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  翻譯腔
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  大陸用語
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  其他
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  漢字
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  每千漢字
                </th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <th scope="row" className="py-2 pr-4 text-left font-normal">
                    {s.id} {s.titleZh}
                  </th>
                  <td className={cell}>{s.lint.total}</td>
                  <td className={cell}>{s.lint.translationese}</td>
                  <td className={cell}>{s.lint.mainland}</td>
                  <td className={cell}>{s.lint.other}</td>
                  <td className={cell}>{s.han.toLocaleString('zh-TW')}</td>
                  <td className={cell}>{per1k(s.lint.total, s.han)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-semibold">
                <th scope="row" className="py-2 pr-4 text-left">
                  全部
                </th>
                <td className={cell}>{newLint.total}</td>
                <td className={cell}>{newLint.translationese}</td>
                <td className={cell}>{newLint.mainland}</td>
                <td className={cell}>{newLint.other}</td>
                <td className={cell}>{newHan.toLocaleString('zh-TW')}</td>
                <td className={cell}>{per1k(newLint.total, newHan)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          欄位：翻譯腔 ／ 大陸用語（cross_strait 規則）／ 其他（ai_style、grammar 等）。{meta.lintTool}
        </p>
        <p data-testid="lint-caveat" className="text-sm font-medium text-foreground">
          Lint 只計算表面字詞模式（翻譯腔、大陸用語等），不衡量讀起來是否清楚。
        </p>
      </section>

      <section aria-labelledby="ov2-compare" className="space-y-3">
        <h3 id="ov2-compare" className="text-sm font-semibold">
          舊英文 → 新英文（Gemini 譯文）
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border bg-card p-4">
          <table data-testid="compare-table-r2" className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">
                  節
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  舊英文：Lint（翻譯腔 ／ 大陸 ／ 其他）
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  舊漢字
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  舊每千漢字
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  新英文：Lint（翻譯腔 ／ 大陸 ／ 其他）
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  新漢字
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  新每千漢字
                </th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <th scope="row" className="py-2 pr-4 text-left font-normal">
                    {s.id}
                  </th>
                  <td className={cell}>{lintText(s.oldLint)}</td>
                  <td className={cell}>{s.oldHan.toLocaleString('zh-TW')}</td>
                  <td className={cell}>{per1k(s.oldLint.total, s.oldHan)}</td>
                  <td className={cell}>{lintText(s.lint)}</td>
                  <td className={cell}>{s.han.toLocaleString('zh-TW')}</td>
                  <td className={cell}>{per1k(s.lint.total, s.han)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-semibold">
                <th scope="row" className="py-2 pr-4 text-left">
                  全部
                </th>
                <td className={cell}>{lintText(oldLint)}</td>
                <td className={cell}>{oldHan.toLocaleString('zh-TW')}</td>
                <td className={cell}>{per1k(oldLint.total, oldHan)}</td>
                <td className={cell}>{lintText(newLint)}</td>
                <td className={cell}>{newHan.toLocaleString('zh-TW')}</td>
                <td className={cell}>{per1k(newLint.total, newHan)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          新英文的譯文漢字數比舊英文多 {growth ?? '—'}%；每千漢字的 lint 數幾乎持平。舊英文為第一輪使用的英文原文，舊漢字為第一輪 Gemini 譯文的漢字數；新英文為 Fable 改寫後的英文。
        </p>
      </section>

      <section aria-labelledby="ov2-known" className="space-y-3">
        <h3 id="ov2-known" className="text-sm font-semibold">
          已知問題（列旁標示）
        </h3>
        {known.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground">
            尚無已知問題。
          </p>
        ) : (
          <ul className="space-y-2">
            {known.map((k) => (
              <li key={`${k.section.id}-${k.rowN}-${k.text}`} className="rounded-lg border border-warn bg-warn-soft px-4 py-3 text-sm leading-relaxed text-warn-foreground">
                <span className="font-mono text-xs">{k.section.id}</span>
                <a href={buildRoundHash(2, k.section.id, k.rowN)} className="ml-3 font-medium underline underline-offset-4">
                  第 {k.rowN} 列
                </a>
                <p className="mt-1 break-words">{k.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ov2-notes" className="space-y-3">
        <h3 id="ov2-notes" className="text-sm font-semibold">
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
                    <a href={buildRoundHash(2, item.section.id, item.rowN)} className="font-medium text-foreground underline underline-offset-4">
                      第 {item.rowN} 列
                    </a>
                  </InfoTip>
                  <span>{item.verdict}</span>
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
