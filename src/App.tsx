import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowUpCircle, ArrowDownCircle, ChevronRight, Search, Check,
  UserPlus, UserMinus, Users, Shield, Send, MessageCircle, Hash,
  Calendar, Clock, X, CheckCircle2, XCircle, Info, AlertTriangle,
} from 'lucide-react';
import { gasApi } from './gas-api';

interface Moderator {
  id: string;
  nick_name: string;
  timezone: string;
  vk: string;
  forum: string;
  tg: string;
  discord: string;
  discord_id: string;
  age: string;
  position: number;
  created_at: string;
  updated_at: string;
}

/* ── Position helpers ── */

interface PositionInfo {
  label: string;
  color: string;
  text: string;
  bg: string;
  border: string;
}

const POSITIONS: Record<number, PositionInfo> = {
  1: { label: 'Мл. Модератор', color: '#60a5fa', text: '#ffffff', bg: '#1e3a8a', border: '#3b82f6' },
  2: { label: 'Модератор', color: '#22d3ee', text: '#ffffff', bg: '#164e63', border: '#06b6d4' },
  3: { label: 'Ст. Модератор', color: '#f59e0b', text: '#ffffff', bg: '#78350f', border: '#d97706' },
  4: { label: 'Куратор', color: '#f97316', text: '#ffffff', bg: '#7c2d12', border: '#ea580c' },
  5: { label: 'Зам. Гл. Модератора', color: '#ef4444', text: '#ffffff', bg: '#7f1d1d', border: '#dc2626' },
  6: { label: 'Гл. Модератор', color: '#a855f7', text: '#ffffff', bg: '#581c87', border: '#9333ea' },
};


function getPositionInfo(position: number): PositionInfo {
  return POSITIONS[position] || POSITIONS[1];
}
function getNextPosition(position: number): number {
  return position < 6 ? position + 1 : 6;
}
function getPrevPosition(position: number): number {
  return position > 1 ? position - 1 : 1;
}

/* ── Notice types ── */

type NoticeType = 'success' | 'error' | 'info';
interface NoticeData { type: NoticeType; title: string; message: string }

type ViewName = 'main' | 'assign' | 'promote' | 'demote' | 'dismiss' | 'list';

/* ── SpaceBackground ── */

interface Star { x: number; y: number; z: number; size: number; baseAlpha: number; twinkleSpeed: number; twinklePhase: number; color: [number, number, number] }
interface Particle { x: number; y: number; z: number; size: number; glow: number; spike: boolean; spikeLength: number; color: [number, number, number] }
interface ShootingStar { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; length: number }
interface Nebula { x: number; y: number; radius: number; color: [number, number, number]; alpha: number; driftX: number; driftY: number; phase: number }
interface OrbitParticle { angle: number; speed: number; radiusOffset: number; size: number; color: [number, number, number]; verticalOffset: number }

function pseudoRandom(value: number): number {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const STAR_COLORS: [number, number, number][] = [[244,244,239],[200,220,255],[180,210,255],[255,230,200],[210,230,255],[220,240,255],[255,220,180]];
const NEBULA_COLORS: [number, number, number][] = [[30,60,120],[80,30,100],[20,80,100],[60,20,80],[10,50,90],[40,70,130]];
const SPHERE_COLORS: [number, number, number][] = [[244,244,239],[180,220,255],[140,200,255],[255,220,180],[200,230,255],[160,210,255]];
const ORBIT_COLORS: [number, number, number][] = [[34,211,238],[96,165,250],[167,139,250],[245,158,11],[244,244,239]];

function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let stars: Star[] = [];
    let particles: Particle[] = [];
    let shootingStars: ShootingStar[] = [];
    let nebulae: Nebula[] = [];
    let orbits: OrbitParticle[] = [];
    let width = 0, height = 0, dpr = 1, frame = 0, rafId = 0;
    let nextShootingStarFrame = 120;

    function setupSpace() {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const isMobile = width < 600;

      const starCount = isMobile ? 180 : 340;
      stars = Array.from({ length: starCount }, (_, i) => ({
        x: (pseudoRandom(i + 2) - 0.5) * width * 1.8,
        y: (pseudoRandom(i + 94) - 0.5) * height * 1.8,
        z: 0.06 + pseudoRandom(i + 281) * 0.94,
        size: 0.3 + pseudoRandom(i + 672) * 1.6,
        baseAlpha: 0.12 + pseudoRandom(i + 811) * 0.7,
        twinkleSpeed: 0.008 + pseudoRandom(i + 333) * 0.025,
        twinklePhase: pseudoRandom(i + 555) * Math.PI * 2,
        color: STAR_COLORS[Math.floor(pseudoRandom(i + 77) * STAR_COLORS.length)],
      }));

      const particleCount = isMobile ? 700 : 1300;
      const golden = Math.PI * (3 - Math.sqrt(5));
      particles = Array.from({ length: particleCount }, (_, i) => {
        const y = 1 - (i / (particleCount - 1)) * 2;
        const radius = Math.sqrt(1 - y * y);
        const theta = golden * i;
        const spike = pseudoRandom(i * 2.17 + 7) > 0.74;
        return {
          x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius,
          size: 0.45 + pseudoRandom(i + 500) * 1.6,
          glow: 0.22 + pseudoRandom(i + 830) * 0.78,
          spike, spikeLength: spike ? 2 + pseudoRandom(i + 1050) * 16 : 0,
          color: SPHERE_COLORS[Math.floor(pseudoRandom(i + 222) * SPHERE_COLORS.length)],
        };
      });

      const nebulaCount = isMobile ? 4 : 7;
      nebulae = Array.from({ length: nebulaCount }, (_, i) => ({
        x: pseudoRandom(i + 100) * width,
        y: pseudoRandom(i + 200) * height,
        radius: (isMobile ? 180 : 320) + pseudoRandom(i + 300) * (isMobile ? 140 : 280),
        color: NEBULA_COLORS[Math.floor(pseudoRandom(i + 400) * NEBULA_COLORS.length)],
        alpha: 0.04 + pseudoRandom(i + 500) * 0.06,
        driftX: (pseudoRandom(i + 600) - 0.5) * 0.15,
        driftY: (pseudoRandom(i + 700) - 0.5) * 0.1,
        phase: pseudoRandom(i + 800) * Math.PI * 2,
      }));

      const orbitCount = isMobile ? 30 : 55;
      orbits = Array.from({ length: orbitCount }, (_, i) => ({
        angle: pseudoRandom(i + 1) * Math.PI * 2,
        speed: (0.003 + pseudoRandom(i + 10) * 0.008) * (pseudoRandom(i + 20) > 0.5 ? 1 : -1),
        radiusOffset: 1.08 + pseudoRandom(i + 30) * 0.35,
        size: 0.6 + pseudoRandom(i + 40) * 1.8,
        color: ORBIT_COLORS[Math.floor(pseudoRandom(i + 50) * ORBIT_COLORS.length)],
        verticalOffset: (pseudoRandom(i + 60) - 0.5) * 0.6,
      }));

      shootingStars = [];
    }

    function spawnShootingStar() {
      const fromTop = pseudoRandom(frame) > 0.5;
      const startX = pseudoRandom(frame + 1) * width;
      const startY = fromTop ? -20 : pseudoRandom(frame + 2) * height * 0.5;
      const angle = Math.PI * 0.15 + pseudoRandom(frame + 3) * Math.PI * 0.2;
      const speed = 6 + pseudoRandom(frame + 4) * 6;
      shootingStars.push({ x: startX, y: startY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0, maxLife: 50 + pseudoRandom(frame + 5) * 40, length: 80 + pseudoRandom(frame + 6) * 120 });
    }

    function drawNebulae() {
      if (!ctx) return;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      nebulae.forEach((neb) => {
        neb.x += neb.driftX; neb.y += neb.driftY; neb.phase += 0.003;
        if (neb.x < -neb.radius) neb.x = width + neb.radius;
        if (neb.x > width + neb.radius) neb.x = -neb.radius;
        if (neb.y < -neb.radius) neb.y = height + neb.radius;
        if (neb.y > height + neb.radius) neb.y = -neb.radius;
        const pulseScale = 1 + Math.sin(neb.phase) * 0.08;
        const r = neb.radius * pulseScale;
        const grad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, r);
        const [cr, cg, cb] = neb.color;
        const a = neb.alpha * (0.85 + Math.sin(neb.phase) * 0.15);
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
        grad.addColorStop(0.4, `rgba(${cr},${cg},${cb},${a * 0.4})`);
        grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(neb.x - r, neb.y - r, r * 2, r * 2);
      });
      ctx.restore();
    }

    function drawStars() {
      if (!ctx) return;
      const focal = Math.max(width, height) * 0.72;
      const cx = width * 0.5 + pointer.x * 20;
      const cy = height * 0.47 + pointer.y * 14;
      stars.forEach((star) => {
        star.z -= 0.0012 + star.size * 0.0003;
        if (star.z < 0.015) {
          star.x = (pseudoRandom(frame + star.size * 1000) - 0.5) * width * 1.8;
          star.y = (pseudoRandom(frame + star.baseAlpha * 1000) - 0.5) * height * 1.8;
          star.z = 1;
        }
        const scale = focal / (focal * star.z + 1);
        const x = cx + star.x * scale;
        const y = cy + star.y * scale;
        if (x < -10 || x > width + 10 || y < -10 || y > height + 10) return;
        const size = Math.max(0.25, star.size * scale * 0.018);
        const twinkle = 0.7 + Math.sin(frame * star.twinkleSpeed + star.twinklePhase) * 0.3;
        const alpha = Math.min(0.95, star.baseAlpha * (1.05 - star.z) * twinkle);
        const [r, g, b] = star.color;
        if (alpha > 0.5 && size > 1) {
          const gg = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
          gg.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.4})`);
          gg.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = gg;
          ctx.fillRect(x - size * 4, y - size * 4, size * 8, size * 8);
        }
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fillRect(x, y, size, size);
      });
    }

    function drawShootingStars() {
      if (!ctx) return;
      shootingStars = shootingStars.filter((s) => s.life < s.maxLife);
      shootingStars.forEach((s) => {
        s.x += s.vx; s.y += s.vy; s.life += 1;
        const lifeRatio = s.life / s.maxLife;
        const alpha = Math.sin(lifeRatio * Math.PI);
        const tailX = s.x - s.vx * (s.length / 10);
        const tailY = s.y - s.vy * (s.length / 10);
        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        grad.addColorStop(0, 'rgba(244,244,239,0)');
        grad.addColorStop(0.6, `rgba(200,220,255,${alpha * 0.5})`);
        grad.addColorStop(1, `rgba(244,244,239,${alpha})`);
        ctx.strokeStyle = grad; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(s.x, s.y); ctx.stroke();
        ctx.beginPath(); ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244,244,239,${alpha})`; ctx.fill();
      });
      if (frame >= nextShootingStarFrame) {
        spawnShootingStar();
        nextShootingStarFrame = frame + 180 + Math.floor(pseudoRandom(frame) * 300);
      }
    }

    function drawSphere() {
      if (!ctx) return;
      const isMobile = width < 600;
      const sphereRadius = Math.min(width * (isMobile ? 0.48 : 0.32), height * 0.35, isMobile ? 220 : 355);
      const centerX = width * 0.5 + pointer.x * 32;
      const centerY = height * (isMobile ? 0.43 : 0.46) + pointer.y * 20;
      const spin = frame * 0.0028 + pointer.x * 0.18;
      const tilt = -0.12 + pointer.y * 0.16;

      const glowRadius = sphereRadius * 1.5;
      const glowGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
      glowGrad.addColorStop(0, 'rgba(34,211,238,0.06)');
      glowGrad.addColorStop(0.3, 'rgba(96,165,250,0.03)');
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(centerX - glowRadius, centerY - glowRadius, glowRadius * 2, glowRadius * 2);

      orbits.forEach((orb) => {
        orb.angle += orb.speed;
        const r = sphereRadius * orb.radiusOffset;
        const x = Math.cos(orb.angle) * r;
        const z = Math.sin(orb.angle) * r;
        const y = orb.verticalOffset * sphereRadius * 0.5;
        const y1 = y * Math.cos(tilt) - z * Math.sin(tilt);
        const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
        const px = centerX + x;
        const py = centerY + y1;
        const depth = (z2 + r) / (2 * r);
        const alpha = 0.15 + depth * 0.65;
        const [cr, cg, cb] = orb.color;
        ctx.beginPath();
        ctx.arc(px, py, orb.size * (0.5 + depth * 0.7), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
        ctx.fill();
      });

      particles.forEach((particle) => {
        const x1 = particle.x * Math.cos(spin) - particle.z * Math.sin(spin);
        const z1 = particle.x * Math.sin(spin) + particle.z * Math.cos(spin);
        const y1 = particle.y * Math.cos(tilt) - z1 * Math.sin(tilt);
        const z2 = particle.y * Math.sin(tilt) + z1 * Math.cos(tilt);
        const px = centerX + x1 * sphereRadius;
        const py = centerY + y1 * sphereRadius;
        const depth = (z2 + 1) / 2;
        const alpha = 0.08 + depth * particle.glow * 0.8;
        const dotSize = particle.size * (0.42 + depth * 0.85);
        const [r, g, b] = particle.color;
        if (particle.spike && depth > 0.45) {
          const length = particle.spikeLength * depth;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + x1 * length, py + y1 * length);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.32})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(px, py, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      });
    }

    function drawSpace() {
      if (!ctx) return;
      frame += 1;
      pointer.x += (pointer.tx - pointer.x) * 0.035;
      pointer.y += (pointer.ty - pointer.y) * 0.035;
      ctx.clearRect(0, 0, width, height);
      drawNebulae(); drawStars(); drawShootingStars(); drawSphere();
      rafId = requestAnimationFrame(drawSpace);
    }

    function handlePointerMove(e: PointerEvent) {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    function handleTouchMove(e: TouchEvent) {
      if (!e.touches[0]) return;
      pointer.tx = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
    }

    setupSpace();
    rafId = requestAnimationFrame(drawSpace);
    window.addEventListener('resize', setupSpace);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', setupSpace);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 w-full h-full pointer-events-none" aria-hidden="true" />;
}

/* ── Picker modal ── */

interface PickerProps {
  open: boolean;
  title: string;
  moderators: Moderator[];
  onPick: (moderator: Moderator) => void;
  onClose: () => void;
}

function Picker({ open, title, moderators, onPick, onClose }: PickerProps) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setQuery(''); setSelectedId(null); }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = moderators.filter((m) => m.nick_name.toLowerCase().includes(query.toLowerCase()));
  const selected = moderators.find((m) => m.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease]" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0a14]/95 shadow-2xl shadow-black/50 animate-[slideUp_0.3s_ease]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по нику..." autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder-white/30 outline-none transition-colors focus:border-cyan-400/50 focus:bg-white/10" />
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {filtered.length === 0 && <p className="py-8 text-center text-sm text-white/40">Ничего не найдено</p>}
            {filtered.map((mod) => {
              const pos = getPositionInfo(mod.position);
              const isSelected = mod.id === selectedId;
              return (
                <button key={mod.id} onClick={() => setSelectedId(mod.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${isSelected ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: pos.bg, color: pos.color }}>
                      {mod.nick_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-white">{mod.nick_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${pos.text} ${pos.border} ${pos.bg}`}>{pos.label}</span>
                    {isSelected && <Check size={18} className="text-cyan-400" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white">Отмена</button>
            <button onClick={() => selected && onPick(selected)} disabled={!selected}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">Выбрать</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ResultNotice toast ── */

function ResultNotice({ notice, onDismiss }: { notice: NoticeData | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  if (!notice) return null;

  const Icon = notice.type === 'success' ? CheckCircle2 : notice.type === 'error' ? XCircle : Info;
  const color = notice.type === 'success' ? 'text-emerald-400 border-emerald-500/30' : notice.type === 'error' ? 'text-red-400 border-red-500/30' : 'text-cyan-400 border-cyan-500/30';
  const iconColor = notice.type === 'success' ? 'text-emerald-400' : notice.type === 'error' ? 'text-red-400' : 'text-cyan-400';

  return (
    <div className="fixed top-6 right-6 z-[60] animate-[slideInRight_0.3s_ease]">
      <div className={`flex items-start gap-3 rounded-xl border bg-[#0a0a14]/95 px-5 py-4 shadow-2xl backdrop-blur-md ${color}`}>
        <Icon size={22} className={iconColor + ' shrink-0 mt-0.5'} />
        <div className="min-w-[200px] max-w-sm">
          <p className="font-semibold text-white">{notice.title}</p>
          <p className="mt-0.5 text-sm text-white/60">{notice.message}</p>
        </div>
        <button onClick={onDismiss} className="ml-2 text-white/30 transition-colors hover:text-white/70">
          <XCircle size={18} />
        </button>
      </div>
    </div>
  );
}

/* ── MainView ── */

function ActionCard({ icon, title, description, accent, onClick }: { icon: React.ReactNode; title: string; description: string; accent: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:-translate-y-1">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-3xl transition-opacity duration-300 group-hover:opacity-40" style={{ backgroundColor: accent }} />
      <div className="relative flex h-14 w-14 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: accent + '1a', color: accent }}>{icon}</div>
      <div className="relative">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-white/50">{description}</p>
      </div>
      <div className="relative mt-auto h-0.5 w-0 rounded-full transition-all duration-300 group-hover:w-full" style={{ backgroundColor: accent }} />
    </button>
  );
}

function MainView({ onNavigate, moderatorCount }: { onNavigate: (view: ViewName) => void; moderatorCount: number }) {
  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-16">
      <div className="mb-2 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60">
        <Shield size={14} className="text-cyan-400" />Панель управления
      </div>
      <h1 className="mt-4 text-center text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
        Управление<br />
        <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">модераторами</span>
      </h1>
      <p className="mt-5 max-w-xl text-center text-base text-white/50 sm:text-lg">Назначение, повышение, понижение и снятие модераторов. Все в одном месте.</p>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/70">
        <Users size={16} className="text-cyan-400" /><span>Активных модераторов: </span><span className="font-bold text-white">{moderatorCount}</span>
      </div>
      <div className="mt-12 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard icon={<UserPlus size={26} />} title="Назначить" description="Добавить нового модератора в команду" accent="#22d3ee" onClick={() => onNavigate('assign')} />
        <ActionCard icon={<ArrowUpCircle size={26} />} title="Повысить" description="Повысить модератора в должности" accent="#f59e0b" onClick={() => onNavigate('promote')} />
        <ActionCard icon={<ArrowDownCircle size={26} />} title="Понизить" description="Понизить модератора в должности" accent="#f97316" onClick={() => onNavigate('demote')} />
        <ActionCard icon={<UserMinus size={26} />} title="Снять" description="Снять модератора с должности" accent="#ef4444" onClick={() => onNavigate('dismiss')} />
        <ActionCard icon={<Users size={26} />} title="Список модераторов" description="Просмотр всех активных модераторов" accent="#60a5fa" onClick={() => onNavigate('list')} />
      </div>
    </div>
  );
}

/* ── AssignView ── */

function Field({ label, value, onChange, placeholder, required, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white/70">{label} {required && <span className="text-cyan-400">*</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/25 outline-none transition-colors focus:border-cyan-400/50 focus:bg-white/10" />
    </div>
  );
}

function AssignView({ onBack, onResult }: { onBack: () => void; onResult: (notice: NoticeData) => void }) {
  const [nickName, setNickName] = useState('');
  const [vk, setVk] = useState('');
  const [forum, setForum] = useState('');
  const [tg, setTg] = useState('');
  const [discord, setDiscord] = useState('');
  const [discordId, setDiscordId] = useState('');
  const [timezone, setTimezone] = useState('');
  const [age, setAge] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickName.trim()) return;
    setSubmitting(true);
    const data = { nickName: nickName.trim(), vk: vk.trim(), forum: forum.trim(), tg: tg.trim(), discord: discord.trim(), discordId: discordId.trim(), timezone: timezone.trim(), age: age.trim() };
    try {
      await gasApi.assign(data);
    } catch (error) {
      const apiError = error as Error & { code?: string };
      onResult(apiError.code === 'DUPLICATE'
        ? { type: 'error', title: 'Ник уже занят', message: `Модератор с ником "${data.nickName}" уже существует.` }
        : { type: 'error', title: 'Ошибка', message: apiError.message });
      return;
    } finally {
      setSubmitting(false);
    }
    onResult({ type: 'success', title: 'Модератор назначен', message: `${data.nickName} успешно добавлен в команду.` });
    onBack();
  }

  return (
    <div className="relative z-10 mx-auto min-h-screen max-w-2xl px-4 py-8">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"><ArrowLeft size={18} />Назад</button>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400"><UserPlus size={24} /></div>
        <div><h1 className="text-2xl font-bold text-white">Назначить модератора</h1><p className="text-sm text-white/50">Заполните данные нового модератора</p></div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <Field label="Ник" value={nickName} onChange={setNickName} placeholder="Введите ник" required />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="ВК" value={vk} onChange={setVk} placeholder="Ссылка или ID" />
          <Field label="Форум" value={forum} onChange={setForum} placeholder="Ссылка или ID" />
          <Field label="Telegram" value={tg} onChange={setTg} placeholder="@username" />
          <Field label="Discord" value={discord} onChange={setDiscord} placeholder="username" />
          <Field label="Discord ID" value={discordId} onChange={setDiscordId} placeholder="ID" />
          <Field label="Часовой пояс" value={timezone} onChange={setTimezone} placeholder="МСК" />
          <Field label="Возраст" value={age} onChange={setAge} placeholder="Возраст" />
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={submitting || !nickName.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
            <Send size={16} />{submitting ? 'Назначение...' : 'Назначить'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── ActionView (promote/demote) ── */

function ActionView({ mode, moderators, onBack, onResult, onModeratorsChanged }: {
  mode: 'promote' | 'demote'; moderators: Moderator[]; onBack: () => void; onResult: (notice: NoticeData) => void; onModeratorsChanged: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Moderator | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isPromote = mode === 'promote';
  const Icon = isPromote ? ArrowUpCircle : ArrowDownCircle;
  const accent = isPromote ? '#f59e0b' : '#f97316';
  const eligible = moderators.filter((m) => isPromote ? m.position < 5 : m.position > 1);
  const targetPosition = selected ? (isPromote ? getNextPosition(selected.position) : getPrevPosition(selected.position)) : null;

  async function handleConfirm() {
    if (!selected || !targetPosition) return;
    setSubmitting(true);
    try {
      await gasApi.changePosition(selected.nick_name, isPromote ? 1 : -1);
    } catch (error) {
      onResult({ type: 'error', title: 'Ошибка', message: (error as Error).message });
      return;
    } finally {
      setSubmitting(false);
    }
    const posInfo = getPositionInfo(targetPosition);
    onResult({ type: 'success', title: isPromote ? 'Модератор повышен' : 'Модератор понижен', message: `${selected.nick_name} → ${posInfo.label}` });
    onModeratorsChanged();
    onBack();
  }

  return (
    <div className="relative z-10 mx-auto min-h-screen max-w-2xl px-4 py-8">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"><ArrowLeft size={18} />Назад</button>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: accent + '1a', color: accent }}><Icon size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-white">{isPromote ? 'Повысить модератора' : 'Понизить модератора'}</h1>
          <p className="text-sm text-white/50">{isPromote ? 'Выберите модератора для повышения' : 'Выберите модератора для понижения'}</p>
        </div>
      </div>
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        {eligible.length === 0 ? (
          <p className="py-12 text-center text-white/40">{isPromote ? 'Нет модераторов, доступных для повышения' : 'Нет модераторов, доступных для понижения'}</p>
        ) : (
          <>
            <button onClick={() => setPickerOpen(true)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-left transition-colors hover:border-white/20 hover:bg-white/10">
              <div><p className="text-sm text-white/50">{isPromote ? 'Кого повысить?' : 'Кого понизить?'}</p><p className="mt-0.5 font-medium text-white">{selected ? selected.nick_name : 'Выберите модератора'}</p></div>
              <ChevronRight size={20} className="text-white/30" />
            </button>
            {selected && targetPosition && (
              <div className="animate-[fadeIn_0.3s_ease] rounded-xl border border-white/10 bg-white/5 p-5">
                <p className="mb-3 text-sm text-white/50">Изменение должности:</p>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-sm font-medium ${getPositionInfo(selected.position).text} ${getPositionInfo(selected.position).border} ${getPositionInfo(selected.position).bg}`}>{getPositionInfo(selected.position).label}</span>
                  <ChevronRight size={18} className="text-white/40" />
                  <span className={`rounded-full border px-3 py-1 text-sm font-medium ${getPositionInfo(targetPosition).text} ${getPositionInfo(targetPosition).border} ${getPositionInfo(targetPosition).bg}`}>{getPositionInfo(targetPosition).label}</span>
                </div>
              </div>
            )}
            {selected && (
              <div className="flex justify-end pt-2">
                <button onClick={handleConfirm} disabled={submitting}
                  className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ backgroundColor: accent, boxShadow: `0 4px 20px ${accent}40` }}>
                  {submitting ? 'Выполнение...' : isPromote ? 'Повысить' : 'Понизить'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <Picker open={pickerOpen} title="Выберите модератора" moderators={eligible}
        onPick={(mod) => { setSelected(mod); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />
    </div>
  );
}

/* ── DismissView ── */

function DismissView({ moderators, onBack, onResult, onModeratorsChanged }: {
  moderators: Moderator[]; onBack: () => void; onResult: (notice: NoticeData) => void; onModeratorsChanged: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Moderator | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!selected || !reason.trim()) return;
    setSubmitting(true);
    try {
      await gasApi.dismiss(selected.nick_name, reason.trim());
    } catch (error) {
      onResult({ type: 'error', title: 'Ошибка', message: (error as Error).message });
      return;
    } finally {
      setSubmitting(false);
    }
    onResult({ type: 'success', title: 'Модератор снят', message: `${selected.nick_name} снят с должности.` });
    onModeratorsChanged();
    onBack();
  }

  return (
    <div className="relative z-10 mx-auto min-h-screen max-w-2xl px-4 py-8">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"><ArrowLeft size={18} />Назад</button>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400"><UserMinus size={24} /></div>
        <div><h1 className="text-2xl font-bold text-white">Снять модератора</h1><p className="text-sm text-white/50">Удалить модератора и перенести в архив</p></div>
      </div>
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        {moderators.length === 0 ? (
          <p className="py-12 text-center text-white/40">Нет активных модераторов</p>
        ) : (
          <>
            <button onClick={() => setPickerOpen(true)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-left transition-colors hover:border-white/20 hover:bg-white/10">
              <div><p className="text-sm text-white/50">Кого снять?</p><p className="mt-0.5 font-medium text-white">{selected ? selected.nick_name : 'Выберите модератора'}</p></div>
              <ChevronRight size={20} className="text-white/30" />
            </button>
            {selected && (
              <div className="animate-[fadeIn_0.3s_ease] rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-sm font-medium ${getPositionInfo(selected.position).text} ${getPositionInfo(selected.position).border} ${getPositionInfo(selected.position).bg}`}>{getPositionInfo(selected.position).label}</span>
                </div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">Причина снятия <span className="text-red-400">*</span></label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Укажите причину..." rows={3}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/25 outline-none transition-colors focus:border-red-400/50 focus:bg-white/10" />
              </div>
            )}
            {selected && reason.trim() && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300/80">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>Действие необратимо. Модератор будет перенесён в архив.</span>
              </div>
            )}
            {selected && (
              <div className="flex justify-end pt-2">
                <button onClick={handleConfirm} disabled={submitting || !reason.trim()}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-red-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
                  <UserMinus size={16} />{submitting ? 'Снятие...' : 'Снять с должности'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <Picker open={pickerOpen} title="Выберите модератора" moderators={moderators}
        onPick={(mod) => { setSelected(mod); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />
    </div>
  );
}

/* ── ModeratorsListView ── */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ContactItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
      <span className="text-white/40">{icon}</span>
      <span className="text-xs text-white/40">{label}:</span>
      <span className="truncate text-sm text-white/80">{value}</span>
    </div>
  );
}

function ModeratorsListView({ moderators, onBack }: { moderators: Moderator[]; onBack: () => void }) {
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const filtered = moderators.filter((m) => m.nick_name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative z-10 mx-auto min-h-screen max-w-4xl px-4 py-8">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"><ArrowLeft size={18} />Назад</button>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400"><Users size={24} /></div>
        <div><h1 className="text-2xl font-bold text-white">Список модераторов</h1><p className="text-sm text-white/50">Всего: {moderators.length}</p></div>
      </div>
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по нику..."
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder-white/30 outline-none transition-colors focus:border-blue-400/50 focus:bg-white/10" />
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] py-16 text-center">
          <Users size={48} className="mx-auto mb-3 text-white/20" />
          <p className="text-white/40">{moderators.length === 0 ? 'Список модераторов пуст' : 'Ничего не найдено'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((mod) => {
            const pos = getPositionInfo(mod.position);
            const isExpanded = expandedId === mod.id;
            return (
              <div key={mod.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/20">
                <button onClick={() => setExpandedId(isExpanded ? null : mod.id)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: pos.bg, color: pos.color }}>{mod.nick_name.charAt(0).toUpperCase()}</div>
                    <div><p className="font-semibold text-white">{mod.nick_name}</p><p className="text-xs text-white/40">Назначен: {formatDate(mod.created_at)}</p></div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${pos.text} ${pos.border} ${pos.bg}`}>{pos.label}</span>
                </button>
                {isExpanded && (
                  <div className="animate-[fadeIn_0.2s_ease] border-t border-white/10 px-5 py-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {mod.vk && <ContactItem icon={<Send size={14} />} label="ВК" value={mod.vk} />}
                      {mod.forum && <ContactItem icon={<MessageCircle size={14} />} label="Форум" value={mod.forum} />}
                      {mod.tg && <ContactItem icon={<Send size={14} />} label="Telegram" value={mod.tg} />}
                      {mod.discord && <ContactItem icon={<MessageCircle size={14} />} label="Discord" value={mod.discord} />}
                      {mod.discord_id && <ContactItem icon={<Hash size={14} />} label="Discord ID" value={mod.discord_id} />}
                      {mod.timezone && <ContactItem icon={<Clock size={14} />} label="Часовой пояс" value={mod.timezone} />}
                      {mod.age && <ContactItem icon={<Calendar size={14} />} label="Возраст" value={mod.age} />}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── App ── */

export default function App() {
  const [view, setView] = useState<ViewName>('main');
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [notice, setNotice] = useState<NoticeData | null>(null);

  const fetchModerators = useCallback(async () => {
    try {
      const data = await gasApi.list();
      setModerators(data);
    } catch (error) {
      setNotice({ type: 'error', title: 'Ошибка загрузки', message: (error as Error).message });
    }
  }, []);

  useEffect(() => { fetchModerators(); }, [fetchModerators]);

  function navigate(v: ViewName) { setView(v); }
  function handleResult(n: NoticeData) { setNotice(n); }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050509] text-white">
      <SpaceBackground />
      <div className="relative z-10">
        {view === 'main' && <MainView onNavigate={navigate} moderatorCount={moderators.length} />}
        {view === 'assign' && <AssignView onBack={() => navigate('main')} onResult={handleResult} />}
        {view === 'promote' && <ActionView mode="promote" moderators={moderators} onBack={() => navigate('main')} onResult={handleResult} onModeratorsChanged={fetchModerators} />}
        {view === 'demote' && <ActionView mode="demote" moderators={moderators} onBack={() => navigate('main')} onResult={handleResult} onModeratorsChanged={fetchModerators} />}
        {view === 'dismiss' && <DismissView moderators={moderators} onBack={() => navigate('main')} onResult={handleResult} onModeratorsChanged={fetchModerators} />}
        {view === 'list' && <ModeratorsListView moderators={moderators} onBack={() => navigate('main')} />}
      </div>
      <ResultNotice notice={notice} onDismiss={() => setNotice(null)} />
    </div>
  );
}
