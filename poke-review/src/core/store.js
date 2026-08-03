/**
 * 상태 보관소 — localStorage 영속 + 구독.
 * 서버가 없으므로 데이터의 원본은 브라우저다. 백업은 관리자 화면의 JSON 내보내기.
 */
import { makeSeedState } from '../data/seed.js';

const KEY = 'pokereview.state.v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return makeSeedState();
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch (e) {
    console.warn('[store] 불러오기 실패, 시드 데이터로 시작합니다.', e);
    return makeSeedState();
  }
}

/** 스키마 버전이 올라갈 때 여기서 변환 */
function migrate(state) {
  if (!state.version) state.version = 1;
  state.members ||= [];
  state.seasons ||= [];
  state.settings ||= { orgName: '트레이너 리그', currentSeasonId: state.seasons.at(-1)?.id };
  return state;
}

let state = load();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('[store] 저장 실패', e);
  }
}

function emit() {
  for (const fn of listeners) fn(state);
}

export const store = {
  get: () => state,

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** mutator(draft) 안에서 state 를 직접 수정 */
  update(mutator) {
    mutator(state);
    persist();
    emit();
  },

  replace(next) {
    state = migrate(next);
    persist();
    emit();
  },

  reset() {
    store.replace(makeSeedState());
  },

  clearAll() {
    store.replace({ version: 1, members: [], seasons: [], settings: { orgName: '트레이너 리그' } });
  },

  // ── 편의 액션 ───────────────────────────────────────────
  upsertMember(member) {
    store.update((s) => {
      const i = s.members.findIndex((m) => m.id === member.id);
      if (i >= 0) s.members[i] = { ...s.members[i], ...member };
      else s.members.push(member);
    });
  },

  removeMember(id) {
    store.update((s) => {
      s.members = s.members.filter((m) => m.id !== id);
      s.seasons.forEach((se) => {
        delete se.records?.[id];
        delete se.notes?.[id];
      });
    });
  },

  upsertSeason(season) {
    store.update((s) => {
      const i = s.seasons.findIndex((x) => x.id === season.id);
      if (i >= 0) s.seasons[i] = { ...s.seasons[i], ...season };
      else s.seasons.push({ records: {}, notes: {}, ...season });
      s.seasons.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    });
  },

  removeSeason(id) {
    store.update((s) => {
      s.seasons = s.seasons.filter((x) => x.id !== id);
      if (s.settings.currentSeasonId === id) s.settings.currentSeasonId = s.seasons.at(-1)?.id;
    });
  },

  setRecord(seasonId, memberId, kpiId, value) {
    store.update((s) => {
      const season = s.seasons.find((x) => x.id === seasonId);
      if (!season) return;
      season.records ||= {};
      season.records[memberId] ||= {};
      season.records[memberId][kpiId] = Number(value) || 0;
    });
  },

  setNote(seasonId, memberId, text) {
    store.update((s) => {
      const season = s.seasons.find((x) => x.id === seasonId);
      if (!season) return;
      season.notes ||= {};
      season.notes[memberId] = text;
    });
  },

  setSetting(key, value) {
    store.update((s) => {
      s.settings[key] = value;
    });
  },

  exportJson() {
    return JSON.stringify(state, null, 2);
  },

  importJson(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.members)) {
      throw new Error('형식이 올바르지 않습니다 (members 배열이 필요).');
    }
    store.replace(parsed);
  },
};

/** 새 id 생성 */
export function uid(prefix = 'm') {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e3).toString(36)}`;
}
