import { describe, expect, it } from 'vitest';
import { PROVINCES, calculateAnnualFinance, chooseOption, continueLife, createGame, hashSeed, nextRandom, startLife } from './game';

describe('可复现随机系统', () => {
  it('同一 seed 产生相同序列且值位于 [0,1)', () => {
    let a=hashSeed('固定人生'),b=hashSeed('固定人生');const left:number[]=[],right:number[]=[];
    for(let i=0;i<20;i++){const an=nextRandom(a),bn=nextRandom(b);left.push(an[0]);right.push(bn[0]);a=an[1];b=bn[1];}
    expect(left).toEqual(right);expect(left.every(v=>v>=0&&v<1)).toBe(true);
  });
  it('不同 seed 可区分',()=>expect(hashSeed('甲')).not.toBe(hashSeed('乙')));
});

describe('出生配置',()=>{
  it('包含 31 个唯一且权重大于零的省区市',()=>{
    expect(PROVINCES).toHaveLength(31);expect(new Set(PROVINCES.map(x=>x.id)).size).toBe(31);expect(PROVINCES.every(x=>x.weight>0)).toBe(true);
  });
  it('同一 seed 完整出生状态一致，四人不重名',()=>{
    const a=createGame('reproducible-seed'),b=createGame('reproducible-seed');expect(a).toEqual(b);
    expect(new Set([a.player.name,...a.peers.map(x=>x.person.name)]).size).toBe(4);
  });
});

describe('财务模型',()=>{
  it('县城服务职业年度结余为 25200',()=>{
    const p=createGame('finance-a').player;p.age=25;p.livingType='county';p.career='service';p.stats.wellbeing=60;
    const result=calculateAnnualFinance(p);expect(result).toEqual({income:54000,expense:28800});expect(p.finance.cash).toBe(25200);
  });
  it('建立伴侣后年度结余为 46800',()=>{
    const p=createGame('finance-b').player;p.age=25;p.livingType='county';p.career='service';p.partnered=true;
    const result=calculateAnnualFinance(p);expect(result).toEqual({income:86400,expense:39600});expect(p.finance.cash).toBe(46800);
  });
});

describe('引擎闭环',()=>{
  function autoRun(seed:string){let g=startLife(createGame(seed));let guard=0;while(g.phase==='playing'&&guard++<100){const e=g.currentEvent;if(!e)g=continueLife(g);else if(e.resolved)g=continueLife(g);else{const option=e.options.find(x=>!x.disabled);expect(option).toBeDefined();g=chooseOption(g,option!.id);}}return g;}
  it('固定选择可复现并能走到人生终点',()=>{const a=autoRun('whole-life'),b=autoRun('whole-life');expect(a).toEqual(b);expect(a.phase).toBe('ended');expect(a.player.age).toBeGreaterThanOrEqual(18);expect(a.player.finance.cash).toBeGreaterThanOrEqual(0);});
  it('所有属性始终位于 0 到 100',()=>{const g=autoRun('bounded-life');expect(Object.values(g.player.stats).every(v=>v>=0&&v<=100)).toBe(true);});
  it('平行人物只推进到玩家当前年龄',()=>{const g=startLife(createGame('peer-sync'));expect(g.player.age).toBe(6);expect(g.peers.every(x=>x.person.age===6||!x.person.alive)).toBe(true);});
});
