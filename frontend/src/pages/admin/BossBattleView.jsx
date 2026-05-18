import React, { useEffect, useRef, useCallback } from 'react';
import { useGlobalGameState, useLeaderboardContext } from '../../context';

/* ─── constants ─── */
const FRAME_W = 40, FRAME_H = 64, TOTAL_FRAMES = 21;

/* base-64 player sprite (first chunk – enough for the walk cycle) */
const PLAYER_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAA0gAAABACAYAAAAgXFcrAAAnLUlEQVR4nO2df2xW13nHvxBIB9KyKqrBX' +
  'vdKBBsKTaAOgQCrmyrKVKUgU0EjlEZWMhpa0lb5I0OonSet7dZ4P2gbaVWXpIG6RWhpEcUTVn4oWlTF8Y' +
  'YJP+wBLR62E0teZQNZpbURqHGJ98f7Pvd97nnPufec++s9b/Z8JYT9+r73ft7nOffc77TOefcufcFRCKR' +
  'SCQSiUQikUgkEolEIpFIJBKJRCKRSCQSiUQikUgkEolEIpFIJBKJRCQS';

/* ─── helpers ─── */
function getPhase(cur, max) {
  const p = max > 0 ? cur / max : 1;
  return p > 0.666 ? 1 : p > 0.333 ? 2 : 3;
}

const PHASE_FILL  = ['#b81a14', '#8818b0', '#1830c0'];
const PHASE_LABEL = ['I', 'II', 'III'];
const PHASE_PILL_BG     = ['#200a0a', '#160a20', '#080a20'];
const PHASE_PILL_BORDER = ['#5a1818', '#4a1870', '#1828a0'];
const PHASE_PILL_COLOR  = ['#e04040', '#b050e0', '#4060ff'];

/* ─── canvas: background hex-grid ─── */
function drawBackground(c) {
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.fillStyle = '#0c110c'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#1e2e1a'; ctx.lineWidth = 0.5;
  const s = 26;
  for (let row = 0; row < 16; row++)
    for (let col = 0; col < 32; col++) {
      const x = col*s*1.5, y = row*s*0.87+(col%2)*s*0.435;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI/180*(60*i-30);
        i===0 ? ctx.moveTo(x+s*Math.cos(a), y+s*Math.sin(a))
              : ctx.lineTo(x+s*Math.cos(a), y+s*Math.sin(a));
      }
      ctx.closePath(); ctx.stroke();
    }
  ctx.fillStyle='#0f1a0f'; ctx.fillRect(0,H-82,W,82);
  ctx.fillStyle='#162214'; ctx.fillRect(0,H-82,W,6);
  ctx.strokeStyle='#1a2c18'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,H-82); ctx.lineTo(W,H-82); ctx.stroke();
}

/* ─── canvas: boss sprite ─── */
function drawBoss(c, phase) {
  if (!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 130, 170);
  const t = Date.now()/1000;
  ctx.save();
  ctx.translate(65, 90 + Math.sin(t*1.3)*2);
  const pal = phase===1 ? ['#2a1040','#5828a0','#8848e0','#c070ff','#e8a030','#ff3030']
            : phase===2 ? ['#200830','#501090','#9020c0','#d050ff','#ff4090','#ff6020']
                        : ['#08082a','#102090','#2040d0','#4070ff','#60c0ff','#a020ff'];
  // body
  ctx.fillStyle=pal[0]; ctx.beginPath();
  ctx.moveTo(0,-80); ctx.bezierCurveTo(30,-70,35,-40,28,-15);
  ctx.lineTo(0,5); ctx.lineTo(-28,-15); ctx.bezierCurveTo(-35,-40,-30,-70,0,-80); ctx.fill();
  ctx.fillStyle=pal[1]; ctx.beginPath();
  ctx.moveTo(0,-74); ctx.bezierCurveTo(22,-65,26,-38,20,-16);
  ctx.lineTo(0,-2); ctx.lineTo(-20,-16); ctx.bezierCurveTo(-26,-38,-22,-65,0,-74); ctx.fill();
  // horns
  ctx.fillStyle=pal[0];
  [[- 12,-74,-24,-90,-16,-76],[0,-80,0,-96,6,-78],[12,-74,24,-90,16,-76]].forEach(([ax,ay,bx,by,cx,cy])=>{
    ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.lineTo(cx,cy); ctx.fill();
  });
  // face
  ctx.fillStyle=pal[1]; ctx.beginPath(); ctx.ellipse(0,-52,13,18,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=pal[2]; ctx.beginPath(); ctx.ellipse(0,-52,9,13,0,0,Math.PI*2); ctx.fill();
  const ep=0.7+Math.sin(t*4)*0.3;
  ctx.fillStyle=pal[5]; ctx.shadowColor=pal[5]; ctx.shadowBlur=8*ep;
  for(let i=-1;i<=1;i+=2){ctx.beginPath();ctx.ellipse(i*6,-52+Math.sin(t*3.5)*0.5,3,3.5,0,0,Math.PI*2);ctx.fill();}
  ctx.shadowBlur=0;
  // wings
  ctx.fillStyle=pal[3];
  ctx.beginPath(); ctx.moveTo(-14,-40); ctx.bezierCurveTo(-36,-30+Math.sin(t*2)*5,-42,-5+Math.sin(t*1.8)*4,-30,12);
  ctx.lineTo(-22,5); ctx.lineTo(-18,-8); ctx.lineTo(-12,-16); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14,-40); ctx.bezierCurveTo(36,-30+Math.sin(t*2)*5,42,-5+Math.sin(t*1.8)*4,30,12);
  ctx.lineTo(22,5); ctx.lineTo(18,-8); ctx.lineTo(12,-16); ctx.closePath(); ctx.fill();
  // torso / legs / orb
  ctx.fillStyle=pal[1]; ctx.beginPath();
  ctx.moveTo(-14,-8); ctx.bezierCurveTo(-18,10,-16,32,-12,50+Math.sin(t*1.6)*2);
  ctx.lineTo(0,44); ctx.lineTo(12,50+Math.sin(t*1.6)*2); ctx.bezierCurveTo(16,32,18,10,14,-8);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle=pal[0];
  for(let i=-1;i<=1;i+=2){ctx.beginPath();ctx.moveTo(i*6,36);ctx.bezierCurveTo(i*14,48,i*16,60,i*12,72+Math.sin(t*1.5)*2);ctx.lineTo(i*4,68);ctx.lineTo(0,56);ctx.closePath();ctx.fill();}
  ctx.fillStyle=pal[3]; ctx.shadowColor=pal[3]; ctx.shadowBlur=12;
  ctx.beginPath(); ctx.arc(0,-34,7+Math.sin(t*5)*1.5,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle=pal[4]; ctx.lineWidth=1; ctx.globalAlpha=0.45;
  for(let i=0;i<3;i++){const a=t*1.1+i*(Math.PI*2/3);ctx.beginPath();ctx.arc(Math.cos(a)*26,-34+Math.sin(a)*10,2.5,0,Math.PI*2);ctx.stroke();}
  ctx.globalAlpha=1; ctx.restore();
}

/* ─── canvas: players ─── */
function drawPlayers(refs, img, frames) {
  if (!img?.complete) return;
  refs.forEach((c, i) => {
    if (!c) return;
    const ctx=c.getContext('2d');
    ctx.clearRect(0,0,40,64);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(img, frames[i]*FRAME_W, 0, FRAME_W, FRAME_H, 0, 0, 40, 64);
  });
}

/* ══════════════════════════════════════════════════════════
   Component
══════════════════════════════════════════════════════════ */
export default function BossBattleView() {
  const { gameState } = useGlobalGameState();
  const { teams }     = useLeaderboardContext();

  const bgRef      = useRef(null);
  const bossRef    = useRef(null);
  const playerRefs = useRef([null,null,null,null,null]);
  const imgRef     = useRef(null);
  const framesRef  = useRef([0,4,8,12,16]);
  const tickRef    = useRef(0);
  const rafRef     = useRef(null);

  /* top-5 sorted by damage */
  const top5  = [...teams].sort((a,b)=>(b.total_damage_dealt||0)-(a.total_damage_dealt||0)).slice(0,5);
  const maxDmg= Math.max(...top5.map(t=>t.total_damage_dealt||0), 1);

  /* live game data */
  const bossHp    = gameState?.boss_current_hp ?? 0;
  const bossMaxHp = gameState?.boss_max_hp      ?? 1000;
  const bossName  = gameState?.boss_name         || 'Ancient Boss';
  const phase     = getPhase(bossHp, bossMaxHp);
  const hpPct     = bossMaxHp > 0 ? Math.max(0, Math.min(100, (bossHp/bossMaxHp)*100)) : 0;
  const totalDmg  = teams.reduce((s,t)=>s+(t.total_damage_dealt||0), 0);
  const rage      = Math.min(100, Math.round((1-hpPct/100)*120));

  /* animation loop */
  const loop = useCallback(() => {
    tickRef.current++;
    if (tickRef.current % 8 === 0) {
      framesRef.current = framesRef.current.map(f=>(f+1)%TOTAL_FRAMES);
      drawPlayers(playerRefs.current, imgRef.current, framesRef.current);
    }
    drawBoss(bossRef.current, phase);
    rafRef.current = requestAnimationFrame(loop);
  }, [phase]);

  useEffect(() => {
    if (!imgRef.current) {
      const img = new Image();
      img.src = 'data:image/png;base64,' + PLAYER_B64;
      img.onload = () => drawPlayers(playerRefs.current, img, framesRef.current);
      imgRef.current = img;
    }
    drawBackground(bgRef.current);
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [loop]);

  /* ── no event guard ── */
  if (!gameState) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',
                   height:'100%',minHeight:'300px',fontFamily:"'Courier New',monospace",
                   color:'#3a5a20',flexDirection:'column',gap:'8px'}}>
        <div style={{fontSize:'13px',letterSpacing:'0.12em'}}>NO ACTIVE EVENT LOADED</div>
        <div style={{fontSize:'10px',color:'#2a3a18'}}>Select an event from Arena View first</div>
      </div>
    );
  }

  /* ══════════ RENDER ══════════ */
  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'1fr 320px',
      gridTemplateRows:'auto 1fr',
      height:'100vh',
      minHeight:0,
      background:'#060a06',
      fontFamily:"'Courier New',monospace",
      overflow:'hidden',
    }}>

      {/* ── TOP BAR (spans both columns) ── */}
      <div style={{
        gridColumn:'1 / -1',
        background:'#0a0f0a',
        borderBottom:'1px solid #1a2418',
        padding:'10px 20px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div>
          <div style={{fontSize:'16px',fontWeight:700,letterSpacing:'0.14em',
                       textTransform:'uppercase',color:'#e8c060'}}>
            {bossName.toUpperCase()}
          </div>
          <div style={{fontSize:'10px',color:'#5a6a40',letterSpacing:'0.14em',textTransform:'uppercase',marginTop:'2px'}}>
            Boss Raid — Phase {PHASE_LABEL[phase-1]}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{fontSize:'11px',color:'#3a5a20',letterSpacing:'0.1em'}}>
            ● LIVE
          </div>
          <div style={{
            fontSize:'11px', letterSpacing:'0.12em', padding:'4px 14px',
            borderRadius:'4px', background:PHASE_PILL_BG[phase-1],
            border:`1px solid ${PHASE_PILL_BORDER[phase-1]}`,
            color:PHASE_PILL_COLOR[phase-1],
            textTransform:'uppercase', fontWeight:700,
          }}>
            Phase {PHASE_LABEL[phase-1]}
          </div>
          <div style={{fontSize:'10px',color:'#2a4a18',letterSpacing:'0.08em'}}>
            {gameState?.game_status || 'UNKNOWN'}
          </div>
        </div>
      </div>

      {/* ══ LEFT: Arena + HP bar ══ */}
      <div style={{
        display:'flex', flexDirection:'column', overflow:'hidden',
        borderRight:'1px solid #1a2418', minHeight:0,
      }}>

        {/* Arena canvas area — scales to fill */}
        <div style={{
          position:'relative', flex:'1 1 0', minHeight:0, overflow:'hidden',
          background:'#0c110c',
        }}>
          <canvas ref={bgRef} width={680} height={340}
            style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'fill'}} />

          {/* Boss centred */}
          <div style={{
            position:'absolute', left:'50%', top:'40%',
            transform:'translate(-50%,-50%)',
            display:'flex', flexDirection:'column', alignItems:'center', zIndex:2,
          }}>
            <canvas ref={bossRef} width={130} height={170}
              style={{imageRendering:'pixelated'}} />
            <div style={{width:'100px',height:'14px',background:'#000',
                         borderRadius:'50%',opacity:0.5,marginTop:'-4px'}} />
          </div>

          {/* Player row — bottom of arena */}
          <div style={{
            position:'absolute', bottom:'16px', left:0, right:0,
            display:'flex', justifyContent:'center', alignItems:'flex-end',
            gap:'4px', zIndex:4,
          }}>
            {Array.from({length:5}).map((_,i)=>{
              const team = top5[i];
              return (
                <div key={i} style={{
                  display:'flex', flexDirection:'column', alignItems:'center',
                  width:'72px',
                }}>
                  <div style={{
                    fontSize:'8px', color:'#2a5a20', background:'#0a1808',
                    border:'1px solid #1a3010', borderRadius:'2px',
                    padding:'1px 4px', letterSpacing:'0.06em', marginBottom:'2px',
                  }}>#{i+1}</div>
                  <canvas ref={el=>playerRefs.current[i]=el} width={40} height={64}
                    style={{imageRendering:'pixelated',display:'block'}} />
                  <div style={{
                    width:'24px', height:'5px', background:'#000',
                    borderRadius:'50%', opacity:0.4, marginTop:'-2px',
                  }} />
                  <div style={{
                    fontSize:'8px', color:'#4a7a3a', letterSpacing:'0.06em',
                    textAlign:'center', whiteSpace:'nowrap',
                    maxWidth:'70px', overflow:'hidden', textOverflow:'ellipsis',
                    marginTop:'2px',
                  }}>
                    {team ? team.team_name : '---'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* HP bar panel */}
        <div style={{
          background:'#080c08', borderTop:'1px solid #1a2418',
          padding:'12px 16px', flexShrink:0,
        }}>
          {/* Label row */}
          <div style={{display:'flex',justifyContent:'space-between',
                       alignItems:'center',marginBottom:'6px'}}>
            <span style={{fontSize:'10px',color:'#3a5a2a',letterSpacing:'0.14em',textTransform:'uppercase'}}>
              Boss HP
            </span>
            <span style={{fontSize:'13px',color:'#b09030',letterSpacing:'0.06em',fontWeight:700}}>
              {Math.max(0,bossHp).toLocaleString()} / {bossMaxHp.toLocaleString()}
            </span>
          </div>

          {/* Bar */}
          <div style={{position:'relative',height:'24px'}}>
            <div style={{
              position:'absolute', inset:0, background:'#100e08',
              border:'1.5px solid #2a1e08',
              clipPath:'polygon(10px 0%,calc(100% - 10px) 0%,100% 50%,calc(100% - 10px) 100%,10px 100%,0% 50%)',
            }} />
            <div style={{
              position:'absolute', top:0, left:0, bottom:0,
              width:`${hpPct}%`,
              background: PHASE_FILL[phase-1],
              clipPath:'polygon(10px 0%,calc(100% - 2px) 0%,calc(100% - 2px) 100%,10px 100%,0% 50%)',
              transition:'width 0.5s cubic-bezier(.4,0,.2,1)',
            }} />
            <div style={{
              position:'absolute', top:'4px', left:'14px', right:'4px',
              height:'3px', background:'rgba(255,255,255,0.05)',
            }} />
          </div>

          {/* Phase markers */}
          <div style={{height:'14px',position:'relative',marginTop:'3px'}}>
            {[{p:66.6,l:'P2'},{p:33.3,l:'P3'}].map(m=>(
              <div key={m.l} style={{
                position:'absolute',left:`${m.p}%`,top:0,
                display:'flex',flexDirection:'column',alignItems:'center',
                transform:'translateX(-50%)',
              }}>
                <div style={{width:'1.5px',height:'6px',background:'#5a1a1a'}} />
                <div style={{fontSize:'9px',color:'#6a2020',letterSpacing:'0.1em',marginTop:'1px'}}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ RIGHT: Stats + Top-5 ══ */}
      <div style={{
        display:'flex', flexDirection:'column', overflow:'auto',
        background:'#060a06', gap:0,
      }}>

        {/* Stats grid */}
        <div style={{
          display:'grid', gridTemplateColumns:'1fr 1fr',
          gap:'8px', padding:'14px 14px 8px',
          borderBottom:'1px solid #101808',
        }}>
          {[
            {l:'Phase',     v: PHASE_LABEL[phase-1], color:'#c09030'},
            {l:'HP %',      v: `${Math.round(hpPct)}%`,
             color: hpPct<33?'#d03030':hpPct<66?'#b07020':'#c09030'},
            {l:'Rage',      v: rage, color:'#d03030'},
            {l:'Total DMG', v: totalDmg.toLocaleString(), color:'#b09030'},
          ].map(s=>(
            <div key={s.l} style={{
              background:'#0a0f0a', border:'1px solid #1a2010',
              borderRadius:'6px', padding:'8px 10px',
            }}>
              <div style={{fontSize:'9px',color:'#3a5a20',letterSpacing:'0.12em',textTransform:'uppercase'}}>
                {s.l}
              </div>
              <div style={{fontSize:'20px',fontWeight:700,color:s.color,marginTop:'2px',letterSpacing:'0.04em'}}>
                {s.v}
              </div>
            </div>
          ))}
        </div>

        {/* Top 5 Damage Dealers */}
        <div style={{padding:'12px 14px', flex:1}}>
          <div style={{
            fontSize:'10px', color:'#2a4a20', letterSpacing:'0.18em',
            textTransform:'uppercase', marginBottom:'10px',
          }}>
            Top 5 Damage Dealers
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {Array.from({length:5}).map((_,i)=>{
              const team   = top5[i];
              const dmg    = team?.total_damage_dealt || 0;
              const barW   = Math.round(dmg/maxDmg*100);
              const isLead = i === 0 && dmg > 0;
              return (
                <div key={i} style={{
                  background: isLead ? '#0c1a0c' : '#08100a',
                  border:`1px solid ${isLead?'#2a4a18':'#182010'}`,
                  borderRadius:'6px', padding:'8px 10px',
                  transition:'all 0.3s',
                }}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <span style={{
                        fontSize:'10px', color: isLead?'#a0c060':'#2a5a1a',
                        fontWeight: isLead?700:400,
                      }}>
                        {isLead ? '👑' : `#${i+1}`}
                      </span>
                      <span style={{
                        fontSize:'12px', color: isLead?'#c0e080':'#a0c060',
                        fontWeight:700, letterSpacing:'0.04em',
                        overflow:'hidden', textOverflow:'ellipsis',
                        whiteSpace:'nowrap', maxWidth:'140px',
                      }}>
                        {team ? team.team_name : '---'}
                      </span>
                    </div>
                    <span style={{
                      fontSize:'11px', color: isLead?'#c0e080':'#6a9040',
                      fontWeight: isLead?700:400, letterSpacing:'0.04em',
                    }}>
                      {dmg.toLocaleString()}
                    </span>
                  </div>
                  {/* mini damage bar */}
                  <div style={{height:'3px',background:'#0f1a0c',borderRadius:'2px',overflow:'hidden'}}>
                    <div style={{
                      height:'100%', borderRadius:'2px',
                      width:`${barW}%`,
                      background: isLead ? '#5a9030' : '#3a6020',
                      transition:'width 0.5s',
                    }} />
                  </div>
                  {team && (
                    <div style={{fontSize:'9px',color:'#2a4a18',marginTop:'4px',letterSpacing:'0.06em'}}>
                      {team.puzzles_solved||0} puzzles solved
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
