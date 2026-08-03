/**
 * 데이터 스키마 정의 (JSDoc 전용 — 런타임 코드 없음).
 * 새 필드를 추가할 땐 여기 먼저 적고 data/ 와 engine/ 을 맞춘다.
 */

/**
 * @typedef {'hp'|'atk'|'def'|'spa'|'spd'|'spe'} StatId
 * @typedef {'fire'|'steel'|'psychic'|'water'|'electric'|'grass'} TypeId
 */

/**
 * 평가 항목. 하나의 KPI = 하나의 기술(Move) = 하나의 타입.
 * @typedef {object} Kpi
 * @property {string} id
 * @property {string} name        표시 이름 (기술 이름으로도 쓰임)
 * @property {TypeId} type        속성
 * @property {StatId} stat        이 항목이 키우는 스탯
 * @property {'physical'|'special'} category 배틀에서 쓰는 공격 분류
 * @property {number} weight      EXP 가중치 (1.0 기준)
 * @property {number} target      기본 목표치
 * @property {string} unit        단위 (%, 건, 점 ...)
 * @property {string} desc        평가 기준 설명
 */

/**
 * 진화 라인. stage 는 1부터.
 * @typedef {object} Species
 * @property {string} id
 * @property {TypeId} type
 * @property {{hp:number,atk:number,def:number,spa:number,spd:number,spe:number}} base 종족값
 * @property {{name:string, minLevel:number, tagline:string}[]} line 진화 단계 목록
 */

/**
 * 팀원.
 * @typedef {object} Member
 * @property {string} id
 * @property {string} name
 * @property {string} [role]      직무/직급
 * @property {string} [team]      소속
 * @property {string} speciesId   파트너 종족. 없으면 주력 타입으로 자동 배정
 * @property {string} [natureId]  성격. 없으면 id 해시로 결정
 * @property {string} [joinedAt]  'YYYY-MM'
 */

/**
 * 월간 시즌. records 는 { [memberId]: { [kpiId]: number } }.
 * @typedef {object} Season
 * @property {string} id          'YYYY-MM'
 * @property {string} title
 * @property {string} bossId      이번 달 체육관 관장
 * @property {Record<string, number>} [targets] KPI별 이번 달 목표 override
 * @property {Record<string, Record<string, number>>} records
 * @property {Record<string, string>} [notes]   멤버별 코멘트
 */

/**
 * 체육관 관장(월간 목표의 의인화).
 * @typedef {object} Boss
 * @property {string} id
 * @property {string} name
 * @property {string} title
 * @property {TypeId} type
 * @property {number} level
 * @property {{hp:number,atk:number,def:number,spa:number,spd:number,spe:number}} base
 * @property {{name:string, type:TypeId, power:number, category:'physical'|'special'}[]} moves
 * @property {string} badgeId     쓰러뜨리면 주는 배지
 * @property {string} quote
 */

/**
 * 배지 정의.
 * @typedef {object} Badge
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {'gym'|'achievement'} kind
 * @property {string} desc
 */

/**
 * 엔진이 계산해 내는 결과들.
 * @typedef {object} KpiScore
 * @property {string} kpiId
 * @property {number} value    입력 실적
 * @property {number} target   적용된 목표
 * @property {number} raw      value/target
 * @property {number} score    상한 적용 후 점수
 * @property {number} exp      이 항목이 준 EXP
 * @property {number} ev       이 항목이 준 노력치
 * @property {boolean} cleared 목표 달성 여부
 */

/**
 * @typedef {object} MemberSeasonResult
 * @property {string} memberId
 * @property {string} seasonId
 * @property {KpiScore[]} kpiScores
 * @property {number} overall      가중 평균 점수
 * @property {object} grade
 * @property {number} expGained
 * @property {number} totalExp
 * @property {object} progress     레벨/다음 레벨까지
 * @property {object} form         현재 진화 형태
 * @property {object} stats        실제 스탯
 * @property {Record<StatId, number>} evs
 * @property {string[]} badges     이 시즌에 새로 얻은 배지
 * @property {object} battle       배틀 리포트
 */

export {};
