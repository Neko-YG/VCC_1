/** 관리자 — 시즌/멤버/실적 입력, 데이터 반출입 */
import { h, fmt } from '../dom.js';
import { panel, emptyState, typeChip } from '../components.js';
import { store, uid } from '../../core/store.js';
import { KPIS } from '../../data/kpi.js';
import { BOSSES } from '../../data/bosses.js';
import { SPECIES } from '../../data/species.js';
import { NATURES, CONFIG } from '../../core/config.js';
import { targetFor } from '../../engine/scoring.js';
import { navigate } from '../router.js';

export function AdminScreen({ state, seasonId }) {
  const season = state.seasons.find((s) => s.id === seasonId) || state.seasons.at(-1);

  return h(
    'div',
    { class: 'screen screen--admin' },
    panel('시즌', seasonEditor(state, season)),
    season ? panel(`${fmt.season(season.id)} 실적 입력`, recordGrid(state, season)) : emptyState('시즌을 먼저 만들어 주세요.'),
    panel('트레이너 관리', memberEditor(state)),
    panel('데이터', dataTools(state)),
  );
}

/* ── 시즌 ─────────────────────────────────────────────── */

function seasonEditor(state, season) {
  const nextId = suggestNextSeasonId(state);

  return h(
    'div',
    { class: 'stack' },
    h(
      'div',
      { class: 'toolbar' },
      h(
        'label',
        { class: 'field field--inline' },
        h('span', {}, '현재 시즌'),
        h(
          'select',
          {
            onChange: (e) => {
              store.setSetting('currentSeasonId', e.target.value);
              navigate('/admin');
            },
          },
          state.seasons.map((s) => h('option', { value: s.id, selected: season?.id === s.id }, `${s.id} · ${s.title || ''}`)),
        ),
      ),
      h(
        'button',
        {
          class: 'btn btn--primary btn--sm',
          onClick: () => {
            store.upsertSeason({ id: nextId, title: `${Number(nextId.slice(5))}월`, bossId: BOSSES[0].id, records: {}, notes: {} });
            store.setSetting('currentSeasonId', nextId);
            navigate('/admin');
          },
        },
        `+ ${nextId} 시즌 추가`,
      ),
      season
        ? h(
            'button',
            {
              class: 'btn btn--danger btn--sm',
              onClick: () => {
                if (confirm(`${season.id} 시즌을 삭제할까요? 되돌릴 수 없습니다.`)) {
                  store.removeSeason(season.id);
                  navigate('/admin');
                }
              },
            },
            '시즌 삭제',
          )
        : null,
    ),
    season
      ? h(
          'div',
          { class: 'formgrid' },
          field('제목', h('input', { value: season.title || '', onChange: (e) => store.upsertSeason({ id: season.id, title: e.target.value }) })),
          field(
            '체육관 관장',
            h(
              'select',
              { onChange: (e) => store.upsertSeason({ id: season.id, bossId: e.target.value }) },
              BOSSES.map((b) => h('option', { value: b.id, selected: season.bossId === b.id }, `${b.title} ${b.name} (${b.type})`)),
            ),
          ),
          field(
            '관장 레벨 (비우면 팀 평균에 자동 맞춤)',
            h('input', {
              type: 'number',
              min: 1,
              max: 100,
              placeholder: '자동',
              value: season.bossLevel ?? '',
              onChange: (e) => {
                const v = e.target.value === '' ? null : Number(e.target.value);
                store.upsertSeason({ id: season.id, bossLevel: v });
              },
            }),
          ),
          field(
            '난이도 보정 (자동일 때 팀 평균 +N)',
            h('input', {
              type: 'number',
              step: 1,
              placeholder: String(CONFIG.battle.bossScaling.offset),
              value: season.bossLevelOffset ?? '',
              onChange: (e) => {
                const v = e.target.value === '' ? null : Number(e.target.value);
                store.upsertSeason({ id: season.id, bossLevelOffset: v });
              },
            }),
          ),
        )
      : null,
    season ? targetEditor(season) : null,
  );
}

function targetEditor(season) {
  return h(
    'details',
    { class: 'details' },
    h('summary', {}, '이번 달 목표치 조정 (기본값 덮어쓰기)'),
    h(
      'div',
      { class: 'formgrid' },
      KPIS.map((kpi) =>
        field(
          `${kpi.name} (${kpi.unit})`,
          h('input', {
            type: 'number',
            step: 'any',
            value: targetFor(kpi, season),
            onChange: (e) => {
              const v = Number(e.target.value);
              store.upsertSeason({ id: season.id, targets: { ...(season.targets || {}), [kpi.id]: v } });
            },
          }),
        ),
      ),
    ),
  );
}

/* ── 실적 입력 ─────────────────────────────────────────── */

function recordGrid(state, season) {
  if (!state.members.length) return emptyState('트레이너를 먼저 등록해 주세요.');

  return h(
    'div',
    { class: 'tablewrap' },
    h(
      'table',
      { class: 'table table--input' },
      h(
        'thead',
        {},
        h(
          'tr',
          {},
          h('th', {}, '트레이너'),
          KPIS.map((k) =>
            h(
              'th',
              {},
              h('div', { class: 'th__kpi' }, typeChip(k.type, { small: true }), h('span', {}, k.name)),
              h('span', { class: 'hint' }, `목표 ${targetFor(k, season)}${k.unit}`),
            ),
          ),
        ),
      ),
      h(
        'tbody',
        {},
        state.members.map((m) =>
          h(
            'tr',
            {},
            h('td', {}, h('strong', {}, m.name), h('div', { class: 'hint' }, m.role || '')),
            KPIS.map((k) =>
              h(
                'td',
                {},
                h('input', {
                  type: 'number',
                  step: 'any',
                  class: 'cellinput',
                  value: season.records?.[m.id]?.[k.id] ?? '',
                  placeholder: '0',
                  onChange: (e) => store.setRecord(season.id, m.id, k.id, e.target.value),
                }),
              ),
            ),
          ),
        ),
      ),
    ),
    h('p', { class: 'hint' }, '값을 입력하고 칸을 벗어나면 즉시 저장되고 레벨·배틀 결과가 다시 계산됩니다.'),
  );
}

/* ── 멤버 ─────────────────────────────────────────────── */

function memberEditor(state) {
  return h(
    'div',
    { class: 'stack' },
    h(
      'div',
      { class: 'tablewrap' },
      h(
        'table',
        { class: 'table table--input' },
        h(
          'thead',
          {},
          h('tr', {}, h('th', {}, '이름'), h('th', {}, '직무'), h('th', {}, '소속'), h('th', {}, '파트너'), h('th', {}, '성격'), h('th', {}, '')),
        ),
        h(
          'tbody',
          {},
          state.members.map((m) =>
            h(
              'tr',
              {},
              h('td', {}, h('input', { value: m.name, onChange: (e) => store.upsertMember({ id: m.id, name: e.target.value }) })),
              h('td', {}, h('input', { value: m.role || '', onChange: (e) => store.upsertMember({ id: m.id, role: e.target.value }) })),
              h('td', {}, h('input', { value: m.team || '', onChange: (e) => store.upsertMember({ id: m.id, team: e.target.value }) })),
              h(
                'td',
                {},
                h(
                  'select',
                  { onChange: (e) => store.upsertMember({ id: m.id, speciesId: e.target.value }) },
                  h('option', { value: '', selected: !m.speciesId }, '자동 (주력 영역)'),
                  SPECIES.map((s) => h('option', { value: s.id, selected: m.speciesId === s.id }, `${s.line[0].name} (${s.type})`)),
                ),
              ),
              h(
                'td',
                {},
                h(
                  'select',
                  { onChange: (e) => store.upsertMember({ id: m.id, natureId: e.target.value }) },
                  NATURES.map((n) => h('option', { value: n.id, selected: m.natureId === n.id }, n.name)),
                ),
              ),
              h(
                'td',
                {},
                h(
                  'button',
                  {
                    class: 'btn btn--danger btn--sm',
                    onClick: () => confirm(`${m.name} 트레이너를 삭제할까요?`) && store.removeMember(m.id),
                  },
                  '삭제',
                ),
              ),
            ),
          ),
        ),
      ),
    ),
    h(
      'button',
      {
        class: 'btn btn--primary btn--sm',
        onClick: () => store.upsertMember({ id: uid('m'), name: '새 트레이너', role: '', team: '', speciesId: '', natureId: 'hardy' }),
      },
      '+ 트레이너 추가',
    ),
  );
}

/* ── 데이터 ───────────────────────────────────────────── */

function dataTools(state) {
  const textarea = h('textarea', { rows: 8, class: 'json', spellcheck: 'false' });
  textarea.value = store.exportJson();

  return h(
    'div',
    { class: 'stack' },
    h(
      'div',
      { class: 'toolbar' },
      h(
        'button',
        {
          class: 'btn btn--sm',
          onClick: () => {
            const blob = new Blob([store.exportJson()], { type: 'application/json' });
            const a = h('a', { href: URL.createObjectURL(blob), download: `pokereview-${new Date().toISOString().slice(0, 10)}.json` });
            a.click();
            URL.revokeObjectURL(a.href);
          },
        },
        '⬇ JSON 내보내기',
      ),
      h(
        'button',
        {
          class: 'btn btn--sm',
          onClick: () => {
            try {
              store.importJson(textarea.value);
              alert('불러왔습니다.');
              navigate('/admin');
            } catch (e) {
              alert(`불러오기 실패: ${e.message}`);
            }
          },
        },
        '⬆ 아래 내용으로 가져오기',
      ),
      h(
        'button',
        { class: 'btn btn--sm btn--ghost', onClick: () => confirm('예시 데이터로 되돌릴까요?') && (store.reset(), navigate('/admin')) },
        '시드 데이터로 초기화',
      ),
      h(
        'button',
        { class: 'btn btn--sm btn--danger', onClick: () => confirm('모든 데이터를 지울까요?') && (store.clearAll(), navigate('/admin')) },
        '전체 삭제',
      ),
    ),
    textarea,
    h(
      'p',
      { class: 'hint' },
      `현재 ${state.members.length}명 · ${state.seasons.length}시즌. 데이터는 이 브라우저(localStorage)에만 저장됩니다. 공유하려면 JSON 을 내보내세요.`,
    ),
  );
}

/* ── 유틸 ─────────────────────────────────────────────── */

function field(label, control) {
  return h('label', { class: 'field' }, h('span', {}, label), control);
}

function suggestNextSeasonId(state) {
  const last = state.seasons.at(-1)?.id;
  const base = last ? new Date(`${last}-01T00:00:00`) : new Date();
  if (last) base.setMonth(base.getMonth() + 1);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
}
