/** 도감 — 트레이너 목록 (최신 시즌 기준) */
import { h, fmt } from '../dom.js';
import { panel, memberCard, emptyState, typeChip } from '../components.js';
import { TYPE_LIST } from '../../data/kpi.js';
import { navigate } from '../router.js';

let filterType = 'all';
let sortKey = 'exp';

export function PokedexScreen({ league }) {
  const entries = league.members.map((m) => league.latest[m.id]).filter(Boolean);
  if (!entries.length) return emptyState('아직 평가된 트레이너가 없습니다.');

  const filtered = entries
    .filter((e) => filterType === 'all' || e.species.type === filterType)
    .sort((a, b) => {
      if (sortKey === 'exp') return b.totalExp - a.totalExp;
      if (sortKey === 'overall') return b.overall - a.overall;
      if (sortKey === 'name') return a.member.name.localeCompare(b.member.name);
      return 0;
    });

  const rerender = () => navigate('/dex');

  return h(
    'div',
    { class: 'screen' },
    panel(
      null,
      h(
        'div',
        { class: 'toolbar' },
        h(
          'div',
          { class: 'toolbar__group' },
          h(
            'button',
            { class: `pill ${filterType === 'all' ? 'is-on' : ''}`, onClick: () => ((filterType = 'all'), rerender()) },
            '전체',
          ),
          TYPE_LIST.map((t) =>
            h(
              'button',
              {
                class: `pill ${filterType === t.id ? 'is-on' : ''}`,
                style: { '--chip': t.color },
                onClick: () => ((filterType = t.id), rerender()),
              },
              `${t.name}·${t.domain}`,
            ),
          ),
        ),
        h(
          'label',
          { class: 'toolbar__sort' },
          '정렬 ',
          h(
            'select',
            { onChange: (e) => ((sortKey = e.target.value), rerender()) },
            h('option', { value: 'exp', selected: sortKey === 'exp' }, '누적 EXP'),
            h('option', { value: 'overall', selected: sortKey === 'overall' }, '최근 종합'),
            h('option', { value: 'name', selected: sortKey === 'name' }, '이름'),
          ),
        ),
      ),
    ),
    h(
      'div',
      { class: 'grid grid--cards' },
      filtered.map((e) => memberCard(e, { onClick: (r) => navigate(`/dex/${r.memberId}`) })),
    ),
    h(
      'p',
      { class: 'hint' },
      `총 ${filtered.length}명 · 최신 시즌 ${fmt.season(entries[0].seasonId)} 기준 · 타입은 파트너 종족 기준 `,
      typeChip(entries[0].species.type, { small: true }),
    ),
  );
}
