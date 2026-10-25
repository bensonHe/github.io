export type LivingType = 'rural' | 'county' | 'city' | 'metro';
export type Phase = 'birth' | 'playing' | 'ended';
export type Career = 'none' | 'apprentice' | 'service' | 'technical' | 'professional' | 'public';
export type StatKey = 'health' | 'wellbeing' | 'knowledge' | 'relationships';

export interface Stats { health: number; wellbeing: number; knowledge: number; relationships: number }
export interface HistoryEntry { age: number; year: number; title: string; detail: string; key?: boolean }
export interface Finance {
  cash: number; livingDebt: number; educationDebt: number; houseValue: number;
  mortgagePrincipal: number; mortgageYears: number; mortgagePayment: number;
  lastIncome: number; lastExpense: number; wageHistory: number[];
}
export interface Person {
  id: string; rngState: number; name: string; gender: '男' | '女'; age: number; alive: boolean;
  province: string; provinceId: string; birthplace: string; residence: string; livingType: LivingType;
  familyResource: '紧张' | '普通' | '宽裕' | '充裕'; support: '有限' | '一般' | '充分';
  parentJobs: [string, string]; parentAges: [number, number]; siblings: number; interest: string; aptitude: number;
  stats: Stats; education: string; track: string; enrolled: boolean; graduationAge?: number;
  career: Career; skillLevel: number; careerLevel: number; retired: boolean; flexible: boolean;
  retirementIncome: number; partnered: boolean; childAge?: number; finance: Finance;
  flags: Record<string, boolean>; history: HistoryEntry[]; usedIncidents: string[]; lastIncidentAge?: number;
  ending?: { type: 'death' | 'horizon'; age: number };
}
export interface Option {
  id: string; text: string; hint: string; disabled?: boolean; reason?: string;
  effects?: Partial<Record<StatKey, number>>; cost?: number; tag?: string;
}
export interface GameEvent {
  instanceId: string; eventId: string; kind: 'milestone' | 'incident'; age: number;
  title: string; story: string; options: Option[]; resolved: boolean; result?: string;
  changes?: string[];
}
export interface Peer { person: Person; preference: '稳健' | '探索' | '关系' }
export interface GameState {
  schemaVersion: 1; configVersion: '1.0'; seed: string; revision: number; phase: Phase;
  player: Person; peers: Peer[]; currentEvent?: GameEvent;
}

interface Province { id: string; name: string; city: string; weight: number }
export const PROVINCES: Province[] = [
  ['11','北京','北京',2],['12','天津','天津',1],['13','河北','石家庄',6],['14','山西','太原',3],
  ['15','内蒙古','呼和浩特',2],['21','辽宁','沈阳',3],['22','吉林','长春',2],['23','黑龙江','哈尔滨',2],
  ['31','上海','上海',2],['32','江苏','南京',6],['33','浙江','杭州',5],['34','安徽','合肥',5],
  ['35','福建','福州',3],['36','江西','南昌',4],['37','山东','济南',8],['41','河南','郑州',8],
  ['42','湖北','武汉',4],['43','湖南','长沙',5],['44','广东','广州',9],['45','广西','南宁',4],
  ['46','海南','海口',1],['50','重庆','重庆',2],['51','四川','成都',7],['52','贵州','贵阳',3],
  ['53','云南','昆明',4],['54','西藏','拉萨',1],['61','陕西','西安',3],['62','甘肃','兰州',2],
  ['63','青海','西宁',1],['64','宁夏','银川',1],['65','新疆','乌鲁木齐',2],
].map(([id,name,city,weight]) => ({ id: String(id), name: String(name), city: String(city), weight: Number(weight) }));

const SURNAMES = ['陈','林','李','周','吴','徐','孙','胡','朱','高','何','郭','马','罗','梁','宋','郑','谢','韩','唐','冯','于','董','萧'];
const GIVEN = ['安然','知远','清和','嘉言','思齐','望舒','明川','亦宁','乐之','云舟','星野','景行','书遥','言蹊','初晴','向晚','沐阳','若川','南乔','予安','静好','怀瑾','闻溪','青禾','之恒','可心','知夏','明悦','嘉树','砚秋','念初','以宁'];
const JOBS = ['农业劳动者','制造业员工','司机','零售服务人员','技术人员','教师','医护人员','小店经营者','行政文职','自由职业者'];
const INTERESTS = ['技术','艺术','运动','阅读','社交','动手'];
const MILESTONE_AGES = [6,10,12,15,18,20,22,25,28,30,33,36,40,45,50,55,60,65,70,75,80,85];

export function hashSeed(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function nextRandom(state: number): [number, number] {
  const next = (state + 0x6D2B79F5) >>> 0;
  let t = next; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}
function random(p: Person): number { const [v, s] = nextRandom(p.rngState); p.rngState = s; return v; }
function int(p: Person, min: number, max: number) { return Math.floor(random(p) * (max - min + 1)) + min; }
function pick<T>(p: Person, list: readonly T[]): T { return list[Math.floor(random(p) * list.length)]; }
function weighted<T>(p: Person, items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((a,b) => a + b, 0); if (!Number.isFinite(total) || total <= 0 || weights.some(w => w < 0 || !Number.isFinite(w))) throw new Error('非法权重');
  const u = random(p) * total; let sum = 0;
  for (let i = 0; i < items.length; i++) { sum += weights[i]; if (sum > u) return items[i]; }
  return items[items.length - 1];
}
function clamp(v: number) { return Math.max(0, Math.min(100, Math.round(v * 10) / 10)); }
function addStats(p: Person, effects: Option['effects'] = {}) {
  (Object.keys(effects) as StatKey[]).forEach(k => { p.stats[k] = clamp(p.stats[k] + (effects[k] ?? 0)); });
}
function formatEffects(effects: Option['effects'] = {}) {
  const labels: Record<StatKey,string> = { health:'健康', wellbeing:'满意', knowledge:'知识', relationships:'关系' };
  return (Object.keys(effects) as StatKey[]).map(k => `${labels[k]}${(effects[k] ?? 0) >= 0 ? '+' : ''}${effects[k]}`).join(' · ');
}
function makePerson(id: string, seed: string, usedNames: Set<string>): Person {
  const shell = { rngState: hashSeed(`${seed}:${id}`) } as Person;
  const province = weighted(shell, PROVINCES, PROVINCES.map(x => x.weight));
  const livingType = weighted(shell, ['city','county','rural'] as LivingType[], [35,35,30]);
  let name = `${pick(shell,SURNAMES)}${pick(shell,GIVEN)}`; while (usedNames.has(name)) name = `${pick(shell,SURNAMES)}${pick(shell,GIVEN)}`; usedNames.add(name);
  const resource = weighted(shell, ['紧张','普通','宽裕','充裕'] as const, [30,50,18,2]);
  const support = weighted(shell, ['有限','一般','充分'] as const, [20,50,30]);
  const birthplace = livingType === 'city' ? province.city : `${province.name}${livingType === 'county' ? (['北京','天津','上海','重庆'].includes(province.name) ? '某郊区城镇' : '某县城') : '某村庄'}`;
  return {
    id, rngState: shell.rngState, name, gender: random(shell) < .5 ? '男' : '女', age: 0, alive: true,
    province: province.name, provinceId: province.id, birthplace, residence: birthplace, livingType,
    familyResource: resource, support, parentJobs: [pick(shell,JOBS),pick(shell,JOBS)], parentAges: [int(shell,24,38),int(shell,24,38)],
    siblings: weighted(shell,[0,1,2],[50,40,10]), interest: pick(shell,INTERESTS), aptitude: random(shell),
    stats: { health:int(shell,65,90), wellbeing:int(shell,50,75), knowledge:int(shell,5,15), relationships:int(shell,45,70) },
    education:'未入学', track:'none', enrolled:false, career:'none', skillLevel:0, careerLevel:0, retired:false, flexible:false,
    retirementIncome:0, partnered:false, finance:{ cash:0,livingDebt:0,educationDebt:0,houseValue:0,mortgagePrincipal:0,mortgageYears:0,mortgagePayment:0,lastIncome:0,lastExpense:0,wageHistory:[] },
    flags:{}, history:[], usedIncidents:[],
  };
}

export function createGame(seed: string): GameState {
  if (!seed.trim()) throw new Error('seed 不能为空');
  const names = new Set<string>(); const player = makePerson('player',seed,names);
  const peers: Peer[] = [1,2,3].map(n => ({ person:makePerson(`peer-${n}`,seed,names), preference: ['稳健','探索','关系'][hashSeed(`${seed}:pref:${n}`)%3] as Peer['preference'] }));
  return { schemaVersion:1, configVersion:'1.0', seed, revision:0, phase:'birth', player, peers };
}
export function startLife(state: GameState): GameState {
  const n = structuredClone(state); if (n.phase !== 'birth') return n; n.phase='playing'; n.revision++;
  n.player.history.push({age:0,year:2000,title:'出生',detail:`出生在${n.player.birthplace}，故事从这里开始。`,key:true});
  return continueLife(n);
}

const BASE: Record<number,{title:string;story:string;options:Option[]}> = {
  6:{title:'第一次走进学校',story:'校门在身后合上，新的名字和面孔在眼前铺开。你第一次意识到，世界比家门口大得多。',options:[
    {id:'study',text:'认真适应',hint:'把注意力放在课堂上',effects:{knowledge:5},tag:'稳健'},
    {id:'friends',text:'主动交朋友',hint:'认识身边的新同学',effects:{relationships:6,wellbeing:2},tag:'关系'},
    {id:'observe',text:'先慢慢观察',hint:'按自己的节奏熟悉环境',effects:{health:3,wellbeing:3},tag:'探索'}]},
  10:{title:'放学之后',story:'下午的阳光把影子拉得很长。作业以外，你开始拥有一小块真正属于自己的时间。',options:[
    {id:'read',text:'在书里远行',hint:'知识 +6',effects:{knowledge:6,wellbeing:1},tag:'稳健'},
    {id:'sport',text:'去操场奔跑',hint:'健康 +6',effects:{health:6,wellbeing:2},tag:'关系'},
    {id:'make',text:'拆装和制作',hint:'获得动手经验',effects:{knowledge:3,wellbeing:4},tag:'探索'}]},
  12:{title:'新学校，新同学',story:'熟悉的路在身后，新的班级像一张还没有落笔的纸。你要决定如何写下开头。',options:[
    {id:'group',text:'参加学习小组',hint:'知识 +5 · 关系 +2',effects:{knowledge:5,relationships:2},tag:'稳健'},
    {id:'club',text:'加入兴趣社团',hint:'关系 +5 · 满意 +4',effects:{relationships:5,wellbeing:4},tag:'关系'},
    {id:'pace',text:'保持自己的节奏',hint:'健康 +3 · 满意 +3',effects:{health:3,wellbeing:3},tag:'探索'}]},
  20:{title:'路径上的第一次考验',story:'选择渐渐变成日常，而日常也开始反过来塑造你。你想把力气放在哪里？',options:[
    {id:'learn',text:'专注学习与积累',hint:'知识 +6',effects:{knowledge:6},tag:'稳健'},
    {id:'practice',text:'争取实践机会',hint:'知识 +3 · 技能提升',effects:{knowledge:3,wellbeing:2},tag:'探索'},
    {id:'support',text:'与同伴互相支持',hint:'关系 +6 · 满意 +3',effects:{relationships:6,wellbeing:3},tag:'关系'}]},
  40:{title:'家人与距离',story:'你发现家中的长辈已经慢慢老去，而自己的生活也有许多不能轻易放下的部分。',options:[
    {id:'company',text:'留出陪伴的时间',hint:'关系 +8',effects:{relationships:8},tag:'关系'},
    {id:'help',text:'安排实际支持',hint:'支出 6,000 元 · 关系 +5',effects:{relationships:5},cost:6000,tag:'稳健'},
    {id:'share',text:'和家人协商分担',hint:'关系 +4 · 满意 +2',effects:{relationships:4,wellbeing:2},tag:'探索'}]},
  45:{title:'中途调整',story:'人生走到中段，曾经遥远的疲惫已经有了具体形状。你想怎样调整接下来的步幅？',options:[
    {id:'rest',text:'暂时休整',hint:'健康 +8 · 满意 +5',effects:{health:8,wellbeing:5},tag:'稳健'},
    {id:'rhythm',text:'转换生活节奏',hint:'健康 +3 · 满意 +3',effects:{health:3,wellbeing:3},cost:3000,tag:'探索'},
    {id:'continue',text:'继续当前道路',hint:'知识 +4 · 满意 +2',effects:{knowledge:4,wellbeing:2},tag:'关系'}]},
  50:{title:'技能与经验',story:'你积累的经验不再只是自己的行李，也可能成为照亮他人的灯。',options:[
    {id:'upgrade',text:'更新自己的技能',hint:'支出 3,000 元 · 技能提升',effects:{knowledge:4},cost:3000,tag:'探索'},
    {id:'mentor',text:'带一带年轻同事',hint:'关系 +6 · 满意 +3',effects:{relationships:6,wellbeing:3},tag:'关系'},
    {id:'ease',text:'减少额外投入',hint:'健康 +5 · 满意 +4',effects:{health:5,wellbeing:4},tag:'稳健'}]},
  55:{title:'为下一阶段准备',story:'你开始盘点时间、身体和身边的人。准备不等于焦虑，它也可以是一种温柔的笃定。',options:[
    {id:'save',text:'留出储备',hint:'形成储蓄习惯 · 满意 +2',effects:{wellbeing:2},tag:'稳健'},
    {id:'arrange',text:'整理生活安排',hint:'关系 +4 · 满意 +4',effects:{relationships:4,wellbeing:4},tag:'关系'},
    {id:'health',text:'投资健康习惯',hint:'支出 2,000 元 · 健康 +6',effects:{health:6},cost:2000,tag:'探索'}]},
  65:{title:'退休后的日常',story:'日历忽然空出了一些位置。过去由工作定义的时间，如今可以重新命名。',options:[
    {id:'community',text:'参与社区',hint:'关系 +7 · 满意 +3',effects:{relationships:7,wellbeing:3},tag:'关系'},
    {id:'learn',text:'保持学习',hint:'知识 +6 · 满意 +3',effects:{knowledge:6,wellbeing:3},tag:'探索'},
    {id:'exercise',text:'规律运动',hint:'健康 +6 · 满意 +3',effects:{health:6,wellbeing:3},tag:'稳健'}]},
  70:{title:'时间属于自己',story:'清晨不再被闹钟切开。你可以把日子交给亲友、远方，或者安静的窗前。',options:[
    {id:'people',text:'与亲友相处',hint:'关系 +6 · 满意 +4',effects:{relationships:6,wellbeing:4},tag:'关系'},
    {id:'travel',text:'来一次低成本远行',hint:'支出 3,000 元 · 满意 +7',effects:{wellbeing:7},cost:3000,tag:'探索'},
    {id:'quiet',text:'安静过日子',hint:'健康 +3 · 满意 +5',effects:{health:3,wellbeing:5},tag:'稳健'}]},
  75:{title:'如何接受帮助',story:'有些事开始需要借一双手。接受帮助并不意味着失去自己，而是重新理解人与人的联结。',options:[
    {id:'family',text:'接受亲友或社区支持',hint:'关系 +6 · 满意 +3',effects:{relationships:6,wellbeing:3},tag:'关系'},
    {id:'care',text:'安排日常照护',hint:'支出 4,000 元 · 健康 +5',effects:{health:5},cost:4000,tag:'稳健'},
    {id:'independent',text:'保持力所能及的独立',hint:'健康 +2 · 满意 +5',effects:{health:2,wellbeing:5},tag:'探索'}]},
  80:{title:'留下些什么',story:'旧物、经验和记忆都有了新的重量。你想把哪一部分轻轻递给后来的人？',options:[
    {id:'write',text:'写下经历',hint:'知识 +3 · 满意 +5',effects:{knowledge:3,wellbeing:5},tag:'稳健'},
    {id:'share',text:'把经验分享出去',hint:'关系 +6 · 满意 +4',effects:{relationships:6,wellbeing:4},tag:'关系'},
    {id:'objects',text:'整理珍贵物件',hint:'满意 +6',effects:{wellbeing:6},tag:'探索'}]},
  85:{title:'回望与当下',story:'远处的路已经走成身后的风景，而今天仍然是一张可以好好度过的纸。',options:[
    {id:'gather',text:'和重要的人相聚',hint:'关系 +5 · 满意 +5',effects:{relationships:5,wellbeing:5},tag:'关系'},
    {id:'hobby',text:'继续一个小爱好',hint:'满意 +7',effects:{wellbeing:7},tag:'探索'},
    {id:'daily',text:'珍惜寻常日子',hint:'健康 +3 · 满意 +4',effects:{health:3,wellbeing:4},tag:'稳健'}]},
};

function specialEvent(p: Person, age: number): {title:string;story:string;options:Option[]} | undefined {
  if (age===15) return {title:'升学方向',story:'一条路开始分成几条。它们没有高低之分，只会通往不同的日常。',options:[
    {id:'high',text:'进入普通高中',hint:'需要知识 ≥ 30 · 知识 +5',effects:{knowledge:5},disabled:p.stats.knowledge<30,reason:'当前知识不足 30',tag:'稳健'},
    {id:'vocational',text:'进入职业学校',hint:'知识 +3 · 技能 +1',effects:{knowledge:3},tag:'探索'},
    {id:'apprentice',text:'开始学徒生活',hint:'技能 +1 · 满意 +2',effects:{wellbeing:2},tag:'关系'}]};
  if (age===18) return {title:'十八岁的路口',story:'成年并没有一声清晰的钟响，只是一些选择忽然需要你自己承担后果。',options:[
    {id:'university',text:'尝试大学考试',hint:'需要高中轨道与知识 ≥ 40 · 结果有不确定性',disabled:p.track!=='high'||p.stats.knowledge<40,reason:'需要高中轨道且知识达到 40',tag:'探索'},
    {id:'college',text:'进入高职学习',hint:'三年教育 · 技能 +1',disabled:p.track==='apprentice',reason:'当前路线不适用',tag:'稳健'},
    {id:'work',text:'开始工作',hint:'从下一年获得劳动收入',tag:'关系'}]};
  if (age===22) return {title:'开始承担生活',story:'学习或学徒期告一段落，房租、工资和工作中的人际关系成为真实的重量。',options:[
    {id:'stable',text:'选择稳定的工作',hint:'延续现有方向，获得稳定收入',tag:'稳健'},
    {id:'technical',text:'选择技术职业',hint:'需要技能 ≥ 1',disabled:p.skillLevel<1,reason:'需要至少 1 级技能',tag:'探索'},
    {id:'professional',text:'选择文职专业工作',hint:'需大专、本科或知识 ≥ 55',disabled:!['大专','本科'].includes(p.education)&&p.stats.knowledge<55,reason:'学历或知识尚未达到门槛',tag:'关系'}]};
  if (age===25) return {title:'去哪里生活',story:'工作渐渐稳定，你开始思考：什么地方适合放下行李，建立自己的生活？',options:[
    {id:'stay',text:'留在现在的地方',hint:'关系 +4',effects:{relationships:4},tag:'稳健'},
    {id:'move',text:'迁往高成本都市',hint:'支出 8,000 元 · 改变工资与生活成本',cost:8000,disabled:p.finance.houseValue>0,reason:'首版暂不支持出售房屋后迁移',tag:'探索'},
    {id:'home',text:p.residence===p.birthplace?'改善日常':'回到出生地',hint:p.residence===p.birthplace?'健康 +3 · 满意 +3':'支出 2,000 元 · 关系 +6',cost:p.residence===p.birthplace?0:2000,effects:p.residence===p.birthplace?{health:3,wellbeing:3}:{relationships:6},disabled:p.finance.houseValue>0,reason:'首版暂不支持出售房屋后迁移',tag:'关系'}]};
  if (age===28) return {title:'关系与陪伴',story:'有些人走近，有些人走远。你想怎样安放亲密、友情与独处？',options:[
    {id:'partner',text:p.partnered?'经营已有关系':'认真发展亲密关系',hint:p.partnered?'关系 +6 · 满意 +4':'结果有不确定性',tag:'关系'},
    {id:'family',text:'重视朋友与家人',hint:'关系 +7 · 满意 +3',effects:{relationships:7,wellbeing:3},tag:'稳健'},
    {id:'solo',text:'专注独立生活',hint:'知识 +3 · 满意 +5',effects:{knowledge:3,wellbeing:5},tag:'探索'}]};
  if (age===30) { const price=costs(p.livingType).house; const down=Math.round(price*.35); return {title:'住房决定',story:'一把钥匙可以代表安定，也可能代表漫长的责任。租住同样是一种完整的生活。',options:[
    {id:'buy',text:'购买一处住房',hint:`首付 ${money(down)} · 25 年贷款`,disabled:p.finance.cash<down||p.finance.livingDebt>0||p.finance.houseValue>0,reason:p.finance.houseValue>0?'已经拥有住房':p.finance.livingDebt>0?'有生活欠款时不可购房':`现金需达到 ${money(down)}`,tag:'稳健'},
    {id:'rent',text:'继续租住',hint:'保留流动性 · 满意 +3',effects:{wellbeing:3},tag:'探索'},
    {id:'lower',text:'搬到较低成本地区',hint:'支出 3,000 元 · 改变生活成本',cost:3000,disabled:p.finance.houseValue>0,reason:'已有住房时不可迁移',tag:'关系'}]}; }
  if (age===33) return {title:'家庭与个人计划',story:'生活并不只有一种完整的样子。你和身边的人，正在讨论下一段日常。',options:p.partnered&&p.childAge===undefined?[
    {id:'child',text:'共同抚育一个孩子',hint:'关系 +5 · 满意 +4 · 增加家庭支出',effects:{relationships:5,wellbeing:4},tag:'关系'},
    {id:'couple',text:'保持两人生活',hint:'满意 +5',effects:{wellbeing:5},tag:'稳健'},
    {id:'grow',text:'优先个人发展',hint:'知识 +5',effects:{knowledge:5},tag:'探索'}]:[
    {id:'junior',text:'支持身边的晚辈',hint:'支出 2,000 元 · 关系 +5',cost:2000,effects:{relationships:5},tag:'关系'},
    {id:'hobby',text:'发展个人兴趣',hint:'满意 +5',effects:{wellbeing:5},tag:'稳健'},
    {id:'skill',text:'学习一项新技能',hint:'支出 2,000 元 · 技能 +1',cost:2000,tag:'探索'}]};
  if (age===36) return {title:'职业进阶',story:'经验让你站得更稳，也让新的方向变得可见。前进一步、转身，或守住节奏，都需要勇气。',options:[
    {id:'promote',text:'争取一次晋升',hint:'结果有不确定性',disabled:p.career==='none'||p.careerLevel>=3,reason:'当前没有可晋升的岗位',tag:'稳健'},
    {id:'change',text:'主动转换职业',hint:'支出 3,000 元 · 满意 +3',cost:3000,effects:{wellbeing:3},tag:'探索'},
    {id:'balance',text:'守住生活节奏',hint:'健康 +5 · 满意 +3',effects:{health:5,wellbeing:3},tag:'关系'}]};
  if (age===60) return {title:'退休，或继续工作',story:'工作曾经占据人生很大一部分。现在，你可以决定如何慢慢松开这根绳。',options:[
    {id:'retire',text:'现在退休',hint:'次年开始领取游戏内退休收入',tag:'稳健'},
    {id:'flex',text:'转为弹性工作',hint:'半份工资加退休收入，持续到 65 岁',tag:'探索'},
    {id:'continue',text:'继续原岗位',hint:'维持正常工资，65 岁统一退休',tag:'关系'}]};
  return undefined;
}
function makeEvent(p: Person, age: number): GameEvent {
  const d=specialEvent(p,age)??BASE[age];
  const options=d.options.map(o=>({...o,disabled:o.disabled||((o.cost??0)>p.finance.cash),reason:o.disabled?o.reason:((o.cost??0)>p.finance.cash?'现金不足':undefined)}));
  return {instanceId:`${p.id}:${age}:${p.rngState}`,eventId:`age-${age}`,kind:'milestone',age,title:d.title,story:d.story,options,resolved:false};
}
function costs(type: LivingType) { return type==='rural'?{wage:.8,life:1000,rent:500,house:300000}:type==='county'?{wage:.9,life:1500,rent:900,house:600000}:type==='city'?{wage:1,life:2400,rent:1600,house:1200000}:{wage:1.35,life:3400,rent:2600,house:2000000}; }
const BASE_WAGE:Record<Career,number>={none:0,apprentice:2500,service:5000,technical:6500,professional:7000,public:6500};
export function calculateNetWorth(p: Person) { return p.finance.cash+p.finance.houseValue-p.finance.livingDebt-p.finance.educationDebt-p.finance.mortgagePrincipal; }
export function calculateAnnualFinance(p: Person) {
  if(p.age<18) return {income:0,expense:0}; const c=costs(p.livingType);
  const full=Math.round(BASE_WAGE[p.career]*c.wage*(1+.15*p.careerLevel+.05*p.skillLevel)*12);
  let wage=p.retired&&!p.flexible?0:Math.round(full*(p.flexible?.5:1));
  if(p.flags.jobGap){wage=0;delete p.flags.jobGap;} if(full>0&&!p.retired){p.finance.wageHistory.push(full);p.finance.wageHistory=p.finance.wageHistory.slice(-10);}
  const studyAid=p.enrolled?({紧张:0,普通:12000,宽裕:30000,充裕:50000}[p.familyResource]):0;
  const retirement=p.retired||p.flexible?p.retirementIncome:0; const partner=p.partnered?Math.round((wage+retirement)*.6):0;
  const income=wage+retirement+partner+studyAid; let housing=p.finance.houseValue>0?p.finance.mortgagePayment:c.rent*12;
  if(p.finance.mortgagePrincipal>0){const interest=Math.round(p.finance.mortgagePrincipal*.035);housing=Math.min(housing,p.finance.mortgagePrincipal+interest);const principal=Math.max(0,housing-interest);p.finance.mortgagePrincipal=Math.max(0,p.finance.mortgagePrincipal-principal);p.finance.mortgageYears=Math.max(0,p.finance.mortgageYears-1);}
  const expense=Math.round(c.life*12*(p.partnered?1.6:1))+housing+(p.childAge!==undefined&&p.childAge<18?9600:0);
  let available=p.finance.cash+income-expense;
  if(available<0){p.finance.cash=0;p.finance.livingDebt+=-available;p.stats.wellbeing=clamp(p.stats.wellbeing-3);}else{
    const livingPay=Math.min(p.finance.livingDebt,Math.round(available*.3));p.finance.livingDebt-=livingPay;available-=livingPay;
    const eduPay=Math.min(p.finance.educationDebt,Math.round(available*.2));p.finance.educationDebt-=eduPay;available-=eduPay;p.finance.cash=Math.round(available);
  }
  p.finance.lastIncome=income;p.finance.lastExpense=expense;if(p.childAge!==undefined)p.childAge++;
  return {income,expense};
}
function setRetirement(p:Person){ if(!p.retirementIncome){const h=p.finance.wageHistory;p.retirementIncome=Math.max(12000,Math.round((h.reduce((a,b)=>a+b,0)/(h.length||1))*.35));} }
function annualUpdate(p:Person){
  if(p.enrolled)p.stats.knowledge=clamp(p.stats.knowledge+(p.age<=17?(p.support==='充分'?1.5:1):1.5));
  p.stats.health=clamp(p.stats.health-(p.age<45?.2:p.age<65?.6:1));
  if(p.graduationAge===p.age){p.enrolled=false;p.education=p.track==='university'?'本科':'大专';p.career=p.track==='university'?'professional':'technical';}
  if(p.age===65&&!p.retired){setRetirement(p);p.retired=true;p.flexible=false;}
  calculateAnnualFinance(p);
}
const INCIDENTS=[
  {id:'teacher',min:7,max:17,title:'一位愿意倾听的老师',text:'有人认真看见了你的好奇心，并给了你恰到好处的鼓励。',effects:{knowledge:4,relationships:2}},
  {id:'friend',min:10,max:60,title:'意外延续的友谊',text:'一次普通的交谈，后来成了彼此多年都记得的片段。',effects:{relationships:5,wellbeing:3}},
  {id:'health',min:18,max:75,title:'身体提醒你慢下来',text:'一场不严重的不适打乱了节奏，也让你重新注意自己的身体。',effects:{health:-4},cost:1000},
  {id:'repair',min:20,max:64,title:'一件突然坏掉的工具',text:'日常生活需要一点计划外的修补。',effects:{wellbeing:-1},cost:1500},
  {id:'bonus',min:20,max:64,title:'一笔意外的奖励',text:'过去的认真被人看见，收入里多了一笔小小的惊喜。',effects:{wellbeing:2},cash:3000},
  {id:'recognition',min:20,max:64,title:'经验被人认可',text:'你处理问题的方式帮助了别人，也让自己更有把握。',effects:{knowledge:3,wellbeing:3}},
  {id:'gap',min:25,max:54,title:'工作之间的空档',text:'一段工作告一段落。短暂的不确定，也给了你重新整理方向的时间。',effects:{relationships:1,wellbeing:-3},flag:'jobGap'},
  {id:'community',min:18,max:89,title:'来自社区的善意',text:'有人在你需要的时候搭了把手，你也记住了这种朴素的互助。',effects:{relationships:4,wellbeing:3}},
] as const;
function maybeIncident(p:Person): GameEvent|undefined{
  if(p.usedIncidents.length>=8||(p.lastIncidentAge!==undefined&&p.age-p.lastIncidentAge<3)||random(p)>=.12)return;
  const list=INCIDENTS.filter(x=>p.age>=x.min&&p.age<=x.max&&!p.usedIncidents.includes(x.id));if(!list.length)return;
  const x=pick(p,list);addStats(p,x.effects);if('cost'in x&&x.cost){const paid=Math.min(p.finance.cash,x.cost);p.finance.cash-=paid;p.finance.livingDebt+=x.cost-paid;}if('cash'in x&&x.cash)p.finance.cash+=x.cash;if('flag'in x&&x.flag)p.flags[x.flag]=true;
  p.usedIncidents.push(x.id);p.lastIncidentAge=p.age;p.history.push({age:p.age,year:2000+p.age,title:x.title,detail:x.text});
  return {instanceId:`${p.id}:incident:${p.age}:${x.id}`,eventId:x.id,kind:'incident',age:p.age,title:x.title,story:x.text,options:[],resolved:true,result:'这段插曲已经成为人生的一部分。',changes:[formatEffects(x.effects)]};
}
function survival(p:Person){if(p.age<18)return true;const base=p.age<45?.0002:p.age<65?.002:p.age<75?.008:p.age<85?.03:.08;const factor=Math.max(.5,Math.min(2,1+(50-p.stats.health)/50));return random(p)>=base*factor;}
function advancePerson(p:Person, stopForPlayer:boolean):GameEvent|undefined{
  while(p.alive&&p.age<90){p.age++;if(p.age===90){p.ending={type:'horizon',age:90};return;}
    annualUpdate(p);if(!survival(p)){p.alive=false;p.ending={type:'death',age:p.age};p.history.push({age:p.age,year:2000+p.age,title:'这一生在这里结束',detail:'走过的日子留在了相识的人与曾经的选择里。',key:true});return;}
    if(MILESTONE_AGES.includes(p.age)){const e=makeEvent(p,p.age);if(stopForPlayer)return e;autoChoose(p,e);continue;}
    const incident=maybeIncident(p);if(incident&&stopForPlayer)return incident;
  }
}
function executeChoice(p:Person,e:GameEvent,o:Option){
  if(o.disabled)throw new Error(o.reason||'该选项不可用');if(o.cost)p.finance.cash-=o.cost;addStats(p,o.effects);let result=`你选择了“${o.text}”。`;
  if(p.age===6){p.education='小学';p.enrolled=true;} if(p.age===12)p.education='初中';
  if(p.age===10&&o.id==='make')p.flags.handsOn=true;
  if(p.age===15){if(o.id==='high'){p.track='high';p.education='高中';p.enrolled=true;}if(o.id==='vocational'){p.track='vocational';p.education='职校';p.enrolled=true;p.skillLevel++;}if(o.id==='apprentice'){p.track='apprentice';p.education='初中毕业';p.enrolled=false;p.career='apprentice';p.skillLevel++;}}
  if(p.age===18){if(o.id==='university'){const chance=Math.min(.85,.2+.006*(p.stats.knowledge-40)+.15*p.aptitude);const ok=random(p)<chance;p.track=ok?'university':'college';p.enrolled=true;p.graduationAge=ok?22:21;p.skillLevel+=ok?0:1;addStats(p,ok?{knowledge:8,wellbeing:5}:{knowledge:3,wellbeing:-2});const fee=ok?40000:18000;const aid={紧张:0,普通:10000,宽裕:30000,充裕:60000}[p.familyResource];p.finance.educationDebt=Math.max(0,fee-aid);result+=ok?' 你如愿进入大学。':' 结果不如预期，但你转入高职，继续向前。';}if(o.id==='college'){p.track='college';p.enrolled=true;p.graduationAge=21;p.skillLevel++;p.finance.educationDebt=Math.max(0,18000-({紧张:0,普通:10000,宽裕:30000,充裕:60000}[p.familyResource]));}if(o.id==='work'){p.enrolled=false;p.education=p.track==='high'?'高中':'初中毕业';p.career=p.skillLevel?'technical':'service';}}
  if(p.age===20&&o.id==='practice'){p.skillLevel=Math.min(5,p.skillLevel+1);p.finance.cash+=3000;}
  if(p.age===22){p.enrolled=false;if(o.id==='technical')p.career='technical';else if(o.id==='professional')p.career='professional';else if(p.career==='none')p.career=p.education==='本科'?'professional':'service';}
  if(p.age===25&&o.id==='move'){p.residence='一座高成本都市';p.livingType='metro';}if(p.age===25&&o.id==='home'){p.residence=p.birthplace;p.livingType=p.birthplace.includes('村庄')?'rural':p.birthplace.includes('县城')||p.birthplace.includes('城镇')?'county':'city';}
  if(p.age===28&&o.id==='partner'){if(p.partnered)addStats(p,{relationships:6,wellbeing:4});else{const chance=Math.max(.2,Math.min(.8,.45+.004*(p.stats.relationships-50)+.002*(p.stats.wellbeing-50)));if(random(p)<chance){p.partnered=true;addStats(p,{relationships:8,wellbeing:5});result+=' 你们决定认真走进彼此的生活。';}else{addStats(p,{relationships:2,wellbeing:-2});result+=' 这段关系没有继续，但坦诚让你更了解自己。';}}}
  if(p.age===30&&o.id==='buy'){const price=costs(p.livingType).house;const down=Math.round(price*.35);p.finance.cash-=down;p.finance.houseValue=price;p.finance.mortgagePrincipal=price-down;p.finance.mortgageYears=25;p.finance.mortgagePayment=Math.round((price-down)*.035*1.035**25/(1.035**25-1));}if(p.age===30&&o.id==='lower'){p.livingType=p.livingType==='metro'||p.livingType==='city'?'county':'rural';p.residence=p.livingType==='county'?`${p.province}某县城`:`${p.province}某村庄`;}
  if(p.age===33&&o.id==='child')p.childAge=0;if(p.age===33&&o.id==='skill')p.skillLevel=Math.min(5,p.skillLevel+1);
  if(p.age===36&&o.id==='promote'){const chance=Math.max(.1,Math.min(.85,.3+.004*(p.stats.knowledge-40)+.08*p.skillLevel+.002*(p.stats.relationships-50)));if(random(p)<chance){p.careerLevel=Math.min(3,p.careerLevel+1);addStats(p,{wellbeing:5});result+=' 晋升顺利落定。';}else{addStats(p,{wellbeing:-2,knowledge:2});result+=' 这次没有成功，但你积累了新的经验。';}}if(p.age===36&&o.id==='change'){p.career=p.skillLevel?'technical':'service';p.careerLevel=0;}
  if(p.age===50&&o.id==='upgrade')p.skillLevel=Math.min(5,p.skillLevel+1);if(p.age===55&&o.id==='save')p.flags.savingPreference=true;
  if(p.age===60){setRetirement(p);if(o.id==='retire')p.retired=true;if(o.id==='flex')p.flexible=true;}
  const changes=[formatEffects(o.effects),o.cost?`现金 -${money(o.cost)}`:''].filter(Boolean);e.resolved=true;e.result=result;e.changes=changes;p.history.push({age:p.age,year:2000+p.age,title:e.title,detail:result,key:true});
}
function autoChoose(p:Person,e:GameEvent,preference:Peer['preference']='稳健'){const available=e.options.filter(x=>!x.disabled);if(!available.length)return;const ranked=[...available].sort((a,b)=>((b.tag===preference?3:1)+random(p)*.5)-((a.tag===preference?3:1)+random(p)*.5));executeChoice(p,e,ranked[0]);}
function syncPeers(state:GameState){for(const peer of state.peers){while(peer.person.alive&&peer.person.age<state.player.age){const e=advancePerson(peer.person,true);if(e&&e.kind==='milestone')autoChoose(peer.person,e,peer.preference);}}}
export function chooseOption(state:GameState,optionId:string):GameState{
  const n=structuredClone(state);const e=n.currentEvent;if(n.phase!=='playing'||!e||e.resolved||e.kind!=='milestone')throw new Error('当前没有可处理的选择');const o=e.options.find(x=>x.id===optionId);if(!o)throw new Error('选项不存在');executeChoice(n.player,e,o);n.revision++;return n;
}
export function continueLife(state:GameState):GameState{
  const n=structuredClone(state);if(n.phase!=='playing')return n;if(n.currentEvent&&!n.currentEvent.resolved)throw new Error('请先完成当前选择');n.currentEvent=advancePerson(n.player,true);syncPeers(n);if(n.player.ending){n.phase='ended';n.currentEvent=undefined;}n.revision++;return n;
}
export function careerName(c:Career){return {none:'暂无职业',apprentice:'学徒',service:'服务劳动职业',technical:'技术职业',professional:'文职专业',public:'公共服务文职'}[c];}
export function money(v:number){return new Intl.NumberFormat('zh-CN',{style:'currency',currency:'CNY',maximumFractionDigits:0}).format(v);}
export function lifeStage(age:number){return age<6?'幼年':age<18?'成长':age<30?'青年':age<45?'而立':age<60?'中年':age<75?'晚年':'暮年';}
export function endingText(p:Person){const places=p.residence===p.birthplace?`一直在${p.province}生活`:`从${p.birthplace}走到${p.residence}`;const relation=p.partnered?'曾与另一个人共同经营家庭':'也认真守护了属于自己的生活空间';const child=p.childAge!==undefined?'，陪伴一个孩子慢慢长大':'';return `${p.name}在2000年出生于${p.birthplace}。${places}，从${p.education}走向${careerName(p.career)}，那些在学校、工作和家庭之间做出的选择，渐渐组成了一条只属于自己的路。${relation}${child}。这一生有宽裕的日子，也有需要重新打算的时候；有些愿望实现了，有些改变了形状。回头看，价值并不只藏在数字里，也在曾经学会的事、认真相处过的人，以及一次次继续向前的决定中。出生给了故事一个开头，而后来的每一页，都留下了选择与偶然共同写下的字迹。`;}
export function createSeed(){const bytes=new Uint32Array(2);crypto.getRandomValues(bytes);return `${bytes[0].toString(36)}-${bytes[1].toString(36)}`;}
