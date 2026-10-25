import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, BriefcaseBusiness, ChevronDown, CircleDollarSign, Download, GraduationCap, HeartHandshake, HeartPulse, House, Info, Leaf, MapPinned, Menu, RotateCcw, Sparkles, Users, X } from 'lucide-react';
import { GameState, Person, calculateNetWorth, careerName, chooseOption, continueLife, createGame, createSeed, endingText, lifeStage, money, startLife } from './game';

const SAVE_KEY = 'this-life-china:save:v1';
type Screen = 'home' | 'game';

function readSave(): { state?: GameState; error?: string } {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return {};
    const state = JSON.parse(raw) as GameState;
    if (state.schemaVersion !== 1 || state.configVersion !== '1.0' || !state.player) return { error:'存档版本不兼容，无法安全继续。' };
    return { state };
  } catch { return { error:'本机存档已经损坏。你可以下载原始数据后重新开始。' }; }
}
function download(content: string, filename: string) {
  const blob=new Blob([content],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}

export default function App() {
  const initial=useMemo(readSave,[]);const [screen,setScreen]=useState<Screen>('home');const [game,setGame]=useState<GameState|undefined>(initial.state);
  const [modal,setModal]=useState<'about'|'restart'|'menu'|'copy'|null>(null);const [saveError,setSaveError]=useState(initial.error);const [busy,setBusy]=useState(false);
  useEffect(()=>{if(!game)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(game));setSaveError(undefined);}catch{setSaveError('本机保存不可用，请及时导出当前人生。');}},[game]);
  const act=(fn:()=>GameState)=>{if(busy)return;setBusy(true);try{setGame(fn());}catch(e){setSaveError(e instanceof Error?e.message:'操作未完成');}window.setTimeout(()=>setBusy(false),320);};
  const newGame=()=>{const next=createGame(createSeed());setGame(next);setScreen('game');setModal(null);};
  const exportGame=()=>{if(game)download(JSON.stringify(game,null,2),`此生中国-${game.player.name}-${game.player.age}岁.json`);};
  return <div className="app-shell">
    {screen==='home'?<Home save={game} error={saveError} onNew={()=>game?setModal('restart'):newGame()} onContinue={()=>setScreen('game')} onAbout={()=>setModal('about')}/>:game?<GameView game={game} busy={busy} onStart={()=>act(()=>startLife(game))} onChoose={id=>act(()=>chooseOption(game,id))} onContinue={()=>act(()=>continueLife(game))} onMenu={()=>setModal('menu')} onRestart={()=>setModal('restart')} onExport={exportGame} onCopy={()=>setModal('copy')}/>:null}
    {saveError&&screen==='game'&&<div className="toast" role="status">{saveError}<button aria-label="关闭提示" onClick={()=>setSaveError(undefined)}><X size={16}/></button></div>}
    {modal==='about'&&<About onClose={()=>setModal(null)}/>} 
    {modal==='menu'&&<Settings onClose={()=>setModal(null)} onAbout={()=>setModal('about')} onExport={exportGame} onRestart={()=>setModal('restart')}/>} 
    {modal==='restart'&&<ConfirmRestart hasSave={!!game} onCancel={()=>setModal(null)} onExport={exportGame} onConfirm={newGame}/>} 
    {modal==='copy'&&game&&<CopyReview game={game} onClose={()=>setModal(null)}/>} 
  </div>;
}

function Home({save,error,onNew,onContinue,onAbout}:{save?:GameState;error?:string;onNew:()=>void;onContinue:()=>void;onAbout:()=>void}) {
  return <main className="home-page">
    <nav className="home-nav"><span className="brand-mark">此生中国</span><button className="text-button" onClick={onAbout}><Info size={17}/> 模型与数据</button></nav>
    <section className="hero">
      <div className="hero-index" aria-hidden="true"><span>人生样本</span><b>31</b><small>省区市 / 2000</small></div>
      <div className="seal">演示<br/>模型</div><p className="eyebrow">CHINA LIFE ARCHIVE · 个人档案 0001</p>
      <h1>换一个起点，<br/><em>走过另一种人生。</em></h1>
      <p className="hero-copy">从中国大陆 31 个省区市随机出生。你无法选择家庭，却可以在有限的机会里，决定下一步往哪里走。</p>
      <div className="hero-rule" aria-hidden="true"><span>出生</span><i/><span>选择</span><i/><span>回望</span></div>
      <div className="hero-actions">{save&&<button className="primary large" onClick={onContinue}>继续 {save.player.name} 的人生 <ArrowRight size={19}/><small>{save.player.age} 岁 · {save.player.province}</small></button>}<button className={save?'secondary large':'primary large'} onClick={onNew}>{save?'新的开始':'开始这一生'} <Sparkles size={18}/></button></div>
      {error&&<p className="inline-alert">{error}</p>}
    </section>
    <section className="how-it-works"><div><span>01</span><Leaf/><h3>随机出生</h3><p>省份、城乡、家庭与兴趣，构成一个无法预先挑选的起点。</p></div><div><span>02</span><BookOpen/><h3>做出选择</h3><p>22 个人生节点。每个决定真实影响此后的机会与生活。</p></div><div><span>03</span><Users/><h3>彼此照见</h3><p>与三位同年出生的人同行，不比较高低，只看见不同。</p></div></section>
    <footer>游戏演示模型，非真实人口抽样或人生预测 · 所有数据仅保存在本机</footer>
  </main>;
}

function GameView({game,busy,onStart,onChoose,onContinue,onMenu,onRestart,onExport,onCopy}:{game:GameState;busy:boolean;onStart:()=>void;onChoose:(id:string)=>void;onContinue:()=>void;onMenu:()=>void;onRestart:()=>void;onExport:()=>void;onCopy:()=>void}) {
  if(game.phase==='birth')return <BirthCard game={game} onStart={onStart} onMenu={onMenu}/>;
  if(game.phase==='ended')return <Ending game={game} onRestart={onRestart} onExport={onExport} onCopy={onCopy} onMenu={onMenu}/>;
  const p=game.player,e=game.currentEvent;return <main className="life-page">
    <header className="life-header"><div className="brand-small"><span>此生</span> 中国</div><div className="life-heading"><b>{p.name}</b><span>{p.age} 岁 · {2000+p.age} 年 {p.age>26&&<i>架空未来</i>}</span></div><button className="icon-btn" aria-label="打开设置" onClick={onMenu}><Menu/></button></header>
    <div className="life-layout"><section className="story-column">
      <div className="chapter-line"><span>档案 / {String(p.history.filter(x=>x.key).length).padStart(2,'0')}</span><div/><span>{lifeStage(p.age)}阶段</span></div>
      {e&&<article className="event-card"><p className="event-year">{2000+p.age} · {p.age} 岁</p><h1>{e.title}</h1><p className="story-text">{e.story}</p>
        {!e.resolved?<div className="choices" aria-label="人生选择">{e.options.map((o,i)=><button key={o.id} disabled={o.disabled||busy} onClick={()=>onChoose(o.id)} className="choice"><span className="choice-number">{String(i+1).padStart(2,'0')}</span><span><b>{o.text}</b><small>{o.disabled?o.reason:o.hint}</small></span><ArrowRight/></button>)}</div>:<div className="result-panel"><span>选择已落笔</span><p>{e.result}</p>{e.changes?.length?<div>{e.changes.map(x=><small key={x}>{x}</small>)}</div>:null}</div>}
        {e.resolved&&<button className="primary continue" disabled={busy} onClick={onContinue}>{busy?'岁月流转中…':'继续人生'} <ArrowRight size={18}/></button>}
      </article>}
      <Timeline person={p}/>
    </section><aside className="side-column"><PersonPanel person={p}/><PeerPanel game={game}/><p className="model-note"><Info size={15}/> 2026 年后的内容为架空未来。金额按 2025 年购买力记账。</p></aside></div>
  </main>;
}

function BirthCard({game,onStart,onMenu}:{game:GameState;onStart:()=>void;onMenu:()=>void}) {const p=game.player;return <main className="birth-page">
  <header className="simple-header"><span className="brand-mark">此生中国</span><button className="icon-btn" onClick={onMenu}><Menu/></button></header>
  <div className="birth-wrap"><p className="eyebrow">公元二〇〇〇年 · 一段人生由此开始</p><section className="birth-card">
    <div className="birth-title"><div><small>你的名字是</small><h1>{p.name}</h1><p>{p.gender} · 出生于 {p.province}</p></div><span className="stamp">生于<br/>此间</span></div>
    <div className="birth-place"><small>最初看见的世界</small><b>{p.birthplace}</b><p>{p.livingType==='city'?'大城市':p.livingType==='county'?'县城':'乡村'}生活 · 2000 年出生</p></div>
    <div className="birth-facets" aria-label="出生背景">
      <OriginFacet icon={<House/>} label="家庭光景" value={`${p.familyResource}家庭`}/>
      <OriginFacet icon={<BriefcaseBusiness/>} label="父母工作" value={p.parentJobs.join('、')}/>
      <OriginFacet icon={<Users/>} label="家庭成员" value={p.siblings?`有 ${p.siblings} 位兄弟姐妹`:'独生子女'}/>
      <OriginFacet icon={<HeartHandshake/>} label="成长支持" value={`${p.support}支持`}/>
      <OriginFacet icon={<MapPinned/>} label="生活环境" value={p.livingType==='city'?'大城市':p.livingType==='county'?'县城':'乡村'}/>
      <OriginFacet icon={<Sparkles/>} label="兴趣种子" value={p.interest}/>
    </div>
    <section className="life-domains" aria-label="人生领域预告"><header><small>你将逐渐走进</small><b>五个生活领域</b></header><div><span><GraduationCap/><b>求学</b><small>知识与技能</small></span><span><BriefcaseBusiness/><b>工作</b><small>职业与收入</small></span><span><MapPinned/><b>迁移</b><small>城市与居所</small></span><span><HeartHandshake/><b>关系</b><small>亲友与家庭</small></span><span><HeartPulse/><b>健康</b><small>身体与时间</small></span></div></section>
    <blockquote>你出生在{p.birthplace}。窗外的声音、家人的忙碌和四季的变化，构成了最初的世界。家庭能给你的并非无限，但有人会用自己的方式陪你长大。你还不知道未来会去哪里，也不知道哪些偶然会改写方向。此刻，一切才刚刚开始。</blockquote>
    <Stats person={p}/><button className="primary large start-life" onClick={onStart}>开始这一生 <ArrowRight/></button>
  </section><p className="model-note centered">出生地按游戏演示权重抽取，不代表 2000 年各省真实出生概率。</p></div></main>}
function OriginFacet({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="origin-facet"><i>{icon}</i><span><small>{label}</small><b>{value}</b></span></div>}
function InfoLine({label,value}:{label:string;value:string}){return <div><small>{label}</small><b>{value}</b></div>}

function PersonPanel({person:p}:{person:Person}){return <section className="side-card profile-card"><div className="card-label"><span>此刻的你</span><span>{lifeStage(p.age)}</span></div><div className="location"><House/><div><b>{p.residence}</b><small>{careerName(p.career)} · {p.education}</small></div></div><Stats person={p}/><hr/><div className="finance-title"><span><CircleDollarSign size={17}/> 家庭账本</span><small>2025年购买力</small></div><div className="finance-grid"><div><small>现金</small><b>{money(p.finance.cash)}</b></div><div><small>净资产</small><b>{money(calculateNetWorth(p))}</b></div><div><small>上年收入</small><b>{money(p.finance.lastIncome)}</b></div><div><small>总负债</small><b>{money(p.finance.livingDebt+p.finance.educationDebt+p.finance.mortgagePrincipal)}</b></div></div></section>}
function Stats({person:p}:{person:Person}){const list=[['健康',p.stats.health,'health'],['满意',p.stats.wellbeing,'wellbeing'],['知识',p.stats.knowledge,'knowledge'],['关系',p.stats.relationships,'relationships']] as const;return <div className="stats">{list.map(([label,v,key])=><div key={key}><span><b>{Math.round(v)}</b><small>{label}</small></span><div><i style={{width:`${v}%`}}/></div></div>)}</div>}
function PeerPanel({game}:{game:GameState}){return <section className="side-card peers"><div className="finance-title"><span><Users size={17}/> 同年出生的人</span><small>截至你 {game.player.age} 岁</small></div>{game.peers.map(({person:p})=><div className="peer" key={p.id}><div className="avatar">{p.name.slice(-1)}</div><div><b>{p.name} <small>· {p.province}</small></b><p>{p.ending?p.ending.type==='death'?`${p.ending.age} 岁，人生落幕`:'90 岁，人生回望':`${p.age} 岁，${p.retired?'已退休':careerName(p.career)}`}</p></div></div>)}</section>}
function Timeline({person:p}:{person:Person}){const [open,setOpen]=useState(false);const entries=[...p.history].reverse().slice(0,open?undefined:5);return <section className="timeline"><button onClick={()=>setOpen(!open)}><span>人生手记</span><small>{open?'收起':'查看全部'} <ChevronDown className={open?'up':''} size={16}/></small></button>{entries.map((h,i)=><div className="timeline-row" key={`${h.age}-${i}`}><span>{h.age}<small>岁</small></span><i/><div><b>{h.title}</b><p>{h.detail}</p></div></div>)}</section>}

function Ending({game,onRestart,onExport,onCopy,onMenu}:{game:GameState;onRestart:()=>void;onExport:()=>void;onCopy:()=>void;onMenu:()=>void}){const p=game.player;const key=p.history.filter(x=>x.key).slice(-8);return <main className="ending-page"><header className="simple-header"><span className="brand-mark">此生中国</span><button className="icon-btn" onClick={onMenu}><Menu/></button></header><section className="ending-hero"><p className="eyebrow">{p.ending?.type==='horizon'?'九十岁 · 人生回望':`享年 ${p.age} 岁`}</p><h1>{p.name} 的<br/><em>一生手记</em></h1><p>{endingText(p)}</p></section><section className="ending-content"><div className="ending-main"><h2>一生的刻度</h2><Stats person={p}/><div className="ending-facts"><InfoLine label="出生与居所" value={`${p.birthplace} → ${p.residence}`}/><InfoLine label="求学与职业" value={`${p.education} · ${careerName(p.career)}`}/><InfoLine label="家庭与陪伴" value={`${p.partnered?'有伴侣':'独立生活'}${p.childAge!==undefined?' · 抚育孩子':''}`}/><InfoLine label="最终净资产" value={money(calculateNetWorth(p))}/></div><h2>曾经的路口</h2>{key.map((x,i)=><div className="ending-node" key={i}><span>{x.age} 岁</span><div><b>{x.title}</b><p>{x.detail}</p></div></div>)}</div><aside><PeerPanel game={game}/><div className="ending-actions"><button className="primary" onClick={onCopy}>复制人生回望</button><button className="secondary" onClick={onExport}><Download size={17}/> 下载人生 JSON</button><button className="text-button danger" onClick={onRestart}><RotateCcw size={17}/> 再活一次</button></div></aside></section></main>}

function Modal({children,onClose,title}:{children:React.ReactNode;onClose:()=>void;title:string}){return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><button className="modal-close" onClick={onClose}><X/></button>{children}</section></div>}
function About({onClose}:{onClose:()=>void}){return <Modal onClose={onClose} title="模型与数据说明"><p className="eyebrow">模型与数据说明</p><h2>这是一场关于可能性的游戏</h2><p>《此生中国》使用虚构的演示模型。31 个省区市的抽取权重不代表真实出生概率，家庭、职业、收入、事件和寿命也不是现实预测。</p><div className="about-list"><div><b>统一口径</b><p>金额以 2025 年购买力表示，方便跨年龄比较，不预测通胀与真实房价。</p></div><div><b>温和简化</b><p>18 岁前不模拟死亡；成年后采用明确的虚构概率。健康为 0 也不意味着立即离世。</p></div><div><b>本地运行</b><p>无需账号或服务器。进度仅存储在当前浏览器中，可以随时导出 JSON。</p></div></div><button className="primary" onClick={onClose}>我知道了</button></Modal>}
function Settings({onClose,onAbout,onExport,onRestart}:{onClose:()=>void;onAbout:()=>void;onExport:()=>void;onRestart:()=>void}){return <Modal onClose={onClose} title="设置"><p className="eyebrow">人生菜单</p><h2>设置与存档</h2><div className="menu-list"><button onClick={onAbout}><Info/> 模型与数据说明 <ArrowRight/></button><button onClick={onExport}><Download/> 下载当前人生 JSON <ArrowRight/></button><button className="danger" onClick={onRestart}><RotateCcw/> 结束本局并重开 <ArrowRight/></button></div></Modal>}
function ConfirmRestart({hasSave,onCancel,onExport,onConfirm}:{hasSave:boolean;onCancel:()=>void;onExport:()=>void;onConfirm:()=>void}){return <Modal onClose={onCancel} title="确认重新开始"><p className="eyebrow">重新开始</p><h2>{hasSave?'要告别当前人生吗？':'准备开始吗？'}</h2><p>当前人生仅保存在本机。开始新人生会覆盖当前存档，你可以先导出留存。</p><div className="modal-actions">{hasSave&&<button className="secondary" onClick={onExport}>先导出</button>}<button className="secondary" onClick={onCancel}>取消</button><button className="danger-button" onClick={onConfirm}>确认重开</button></div></Modal>}
function CopyReview({game,onClose}:{game:GameState;onClose:()=>void}){const text=`${game.player.name} · ${game.player.ending?.type==='horizon'?'90岁人生回望':`享年${game.player.age}岁`}\n\n${endingText(game.player)}`;const [copied,setCopied]=useState(false);const copy=async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);}catch{setCopied(false);}};return <Modal onClose={onClose} title="复制人生回望"><p className="eyebrow">人生回望</p><h2>带走这段故事</h2><textarea readOnly value={text}/><button className="primary" onClick={copy}>{copied?'已复制':'复制文字'}</button><p className="copy-tip">若复制不可用，可直接选中上方文字。</p></Modal>}
