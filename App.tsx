import { useState, useEffect } from 'react';
import { Check, X, MapPin, Plus, Heart } from 'lucide-react';

const SLOT_OPTIONS = ['Vandaag 20:00', 'Morgen 19:00', 'Morgen 20:30', 'Woensdag 19:30'];
const INTERESTS = ['☕ Koffie', '📚 Boeken', '🏃 Hardlopen', '🎬 Films', '🐾 Huisdieren', '✈️ Reizen', '🎨 Kunst', '🎵 Muziek'];
const CONNECTION_TAGS = ['💬 Diepe gesprekken', '🕯️ Rustige avonden', '🌍 Avonturier', '🏡 Graag thuis', '💞 Op zoek naar iets serieus', '🤗 Knuffelaar'];
const PROMPT_SELF = { q: 'Ik val voor iemand die', a: 'net zo hard kan lachen om slechte woordgrappen' };
const PROMPT_SANNE = { q: 'Mijn ideale zondag begint met', a: 'verse croissants en geen wekker' };
const API_URL = 'https://monsega-backend.onrender.com';
const SCREEN_LABELS = ['Login', 'Profiel', 'Vandaag', 'Tijden', 'Ticket', 'Locatie', 'Check-in'];
const GRADIENT = 'linear-gradient(135deg, var(--berry), var(--rose), var(--sunset))';

function Eyebrow({ children }) {
  return (
    <div className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
      {children}
    </div>
  );
}

function Stamp({ text, rotate = -10, size = 72, style }) {
  return (
    <div
      className="absolute rounded-full flex items-center justify-center"
      style={{ width: size, height: size, border: '2px solid var(--rose)', transform: `rotate(${rotate}deg)`, opacity: 0.85, ...style }}
    >
      <div className="rounded-full flex items-center justify-center" style={{ width: size - 14, height: size - 14, border: '1px solid var(--rose)' }}>
        <span className="font-mono uppercase text-center leading-tight" style={{ fontSize: 8.5, letterSpacing: '0.06em', color: 'var(--rose)', padding: '0 4px' }}>
          {text}
        </span>
      </div>
    </div>
  );
}

function PromptCard({ q, a }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(166,57,92,0.07), rgba(255,145,82,0.09))', border: '1px solid var(--mist)' }}>
      <div className="font-mono uppercase tracking-widest" style={{ fontSize: 9, color: 'var(--rose)' }}>{q}</div>
      <div className="font-quote mt-1.5" style={{ fontSize: 17, color: 'var(--ink)', lineHeight: 1.3 }}>{a}</div>
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, variant = 'brand' }) {
  let bg = GRADIENT;
  if (disabled) bg = 'var(--mist)';
  else if (variant === 'sage') bg = 'var(--sage)';
  else if (variant === 'danger') bg = 'var(--danger)';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full font-display font-semibold py-3.5 rounded-2xl"
      style={{
        fontSize: 15,
        background: bg,
        color: disabled ? 'var(--ink-soft)' : '#FFFFFF',
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        boxShadow: disabled ? 'none' : '0 12px 24px -10px rgba(166,57,92,0.4)',
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full font-display font-semibold py-3.5 rounded-2xl border"
      style={{ fontSize: 15, borderColor: 'var(--mist)', color: 'var(--ink)', background: 'transparent' }}
    >
      {children}
    </button>
  );
}

function CircleButton({ children, onClick, variant }) {
  const isLike = variant === 'like';
  return (
    <button
      onClick={onClick}
      className="rounded-full flex items-center justify-center"
      style={{
        width: 62,
        height: 62,
        background: isLike ? GRADIENT : '#FFFFFF',
        border: isLike ? 'none' : '1.5px solid var(--mist)',
        color: isLike ? '#FFFFFF' : 'var(--ink-soft)',
        boxShadow: isLike ? '0 14px 26px -10px rgba(166,57,92,0.5)' : '0 8px 16px -10px rgba(34,24,38,0.18)',
      }}
    >
      {children}
    </button>
  );
}

function StatusBar() {
  return (
    <div className="font-mono flex justify-between px-6 pt-4" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
      <span>20:00</span>
      <span>••••</span>
    </div>
  );
}

function BottomNav() {
  const tabs = ['Vandaag', 'Dates', 'Profiel'];
  return (
    <div className="flex border-t" style={{ borderColor: 'var(--mist)' }}>
      {tabs.map((t, i) => (
        <div key={t} className="flex-1 flex flex-col items-center gap-1 py-3">
          <div className="rounded-full" style={{ width: 6, height: 6, background: i === 0 ? 'var(--rose)' : 'transparent' }} />
          <span className="font-body" style={{ fontSize: 11, color: i === 0 ? 'var(--ink)' : 'var(--ink-soft)', fontWeight: i === 0 ? 600 : 400 }}>
            {t}
          </span>
        </div>
      ))}
    </div>
  );
}

function PhotoTile({ filled, angle }) {
  if (filled) {
    return <div className="rounded-2xl" style={{ aspectRatio: '3/4', background: `linear-gradient(${angle}deg, var(--berry), var(--rose), var(--sunset))` }} />;
  }
  return (
    <div className="rounded-2xl flex items-center justify-center" style={{ aspectRatio: '3/4', border: '2px dashed var(--mist)' }}>
      <Plus size={20} color="var(--ink-soft)" strokeWidth={2.2} />
    </div>
  );
}

function TagGroup({ label, options, chosen, toggle }) {
  return (
    <div className="mt-5">
      <div className="font-mono uppercase tracking-widest mb-2" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((tag) => {
          const active = chosen.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => toggle(tag)}
              className="font-body rounded-full"
              style={{
                fontSize: 13,
                padding: '7px 13px',
                background: active ? GRADIENT : '#FFFFFF',
                color: active ? '#FFFFFF' : 'var(--ink)',
                border: active ? 'none' : '1px solid var(--mist)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="mt-3">
      <div className="font-mono uppercase tracking-widest mb-1.5" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full font-body rounded-2xl p-3.5"
        style={{ background: '#FFFFFF', border: '1px solid var(--mist)', fontSize: 14, color: 'var(--ink)' }}
      />
    </div>
  );
}

function ScreenAuth({ onSuccess }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [wachtwoord, setWachtwoord] = useState('');
  const [naam, setNaam] = useState('');
  const [leeftijd, setLeeftijd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/registreer';
      const body = mode === 'login' ? { email, wachtwoord } : { email, wachtwoord, naam, leeftijd: Number(leeftijd) };
      const res = await fetch(API_URL + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Er ging iets mis, probeer het opnieuw.');
      } else {
        onSuccess(data.token);
      }
    } catch (e) {
      setError('Kon geen verbinding maken. Gratis Render-servers slapen na inactiviteit en hebben soms 30-60 sec nodig om wakker te worden — probeer het nog een keer.');
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6 pb-6">
      <div className="text-center mb-6">
        <div className="font-display gradient-text" style={{ fontSize: 26, fontWeight: 800 }}>Monsega</div>
      </div>

      <div className="flex rounded-2xl p-1 mb-2" style={{ background: 'var(--mist)' }}>
        {['login', 'register'].map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(''); }}
            className="flex-1 font-body font-semibold rounded-xl py-2.5"
            style={{ fontSize: 13, background: mode === m ? '#FFFFFF' : 'transparent', color: 'var(--ink)', border: 'none' }}
          >
            {m === 'login' ? 'Inloggen' : 'Registreren'}
          </button>
        ))}
      </div>

      {mode === 'register' && (
        <>
          <TextField label="Naam" value={naam} onChange={setNaam} placeholder="Sanne" />
          <TextField label="Leeftijd" value={leeftijd} onChange={setLeeftijd} type="number" placeholder="29" />
        </>
      )}
      <TextField label="E-mail" value={email} onChange={setEmail} type="email" placeholder="jij@voorbeeld.nl" />
      <TextField label="Wachtwoord" value={wachtwoord} onChange={setWachtwoord} type="password" placeholder="••••••••" />

      {error && <p className="font-body mt-3" style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</p>}

      <div className="mt-5">
        <PrimaryButton onClick={submit} disabled={loading}>
          {loading ? 'Even geduld...' : mode === 'login' ? 'Inloggen' : 'Account aanmaken'}
        </PrimaryButton>
      </div>

      <p className="font-mono text-center mt-4" style={{ fontSize: 9.5, color: 'var(--ink-soft)' }}>
        VERBINDT MET JE ECHTE LIVE BACKEND
      </p>
    </div>
  );
}

function ScreenProfiel({ onNext }) {
  const [chosen, setChosen] = useState(['☕ Koffie', '📚 Boeken', '💬 Diepe gesprekken']);
  const toggle = (tag) => setChosen((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  return (
    <div className="flex-1 flex flex-col px-6 pt-3 pb-6" style={{ overflowY: 'auto' }}>
      <Eyebrow>Nieuw hier</Eyebrow>
      <div className="font-display font-bold mt-2" style={{ fontSize: 24, color: 'var(--ink)' }}>
        Maak je profiel
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <PhotoTile filled angle={120} />
        <PhotoTile filled angle={200} />
        <PhotoTile filled angle={60} />
        <PhotoTile />
        <PhotoTile />
        <PhotoTile />
      </div>

      <div className="mt-5">
        <div className="font-mono uppercase tracking-widest mb-2" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>Bio</div>
        <textarea
          defaultValue="Werkt bij een boekhandel, rent op zondagen langs het Amstelpark."
          className="w-full font-body rounded-2xl p-4"
          style={{ background: '#FFFFFF', border: '1px solid var(--mist)', fontSize: 14, minHeight: 70, color: 'var(--ink)', resize: 'none' }}
        />
      </div>

      <div className="mt-5">
        <div className="font-mono uppercase tracking-widest mb-2" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>Beantwoord een vraag</div>
        <PromptCard q={PROMPT_SELF.q} a={PROMPT_SELF.a} />
      </div>

      <TagGroup label="Interesses" options={INTERESTS} chosen={chosen} toggle={toggle} />
      <TagGroup label="Wat je zoekt" options={CONNECTION_TAGS} chosen={chosen} toggle={toggle} />

      <div className="mt-6">
        <PrimaryButton onClick={onNext}>Profiel opslaan en beginnen</PrimaryButton>
      </div>
    </div>
  );
}

function ScreenVandaag({ onAccept }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 pt-3">
        <Eyebrow>Vandaag · 19:00</Eyebrow>
      </div>
      <div className="flex-1 flex flex-col justify-center px-5">
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{ aspectRatio: '3/4.1', background: `linear-gradient(150deg, var(--berry), var(--rose), var(--sunset))`, boxShadow: '0 22px 40px -18px rgba(34,24,38,0.4)' }}
        >
          <div className="absolute inset-x-0 bottom-0" style={{ height: '62%', background: 'linear-gradient(to top, rgba(70,20,35,0.85), transparent)' }} />
          <div className="absolute" style={{ top: 14, right: 14, background: 'rgba(70,20,35,0.4)', borderRadius: 999, padding: '4px 11px' }}>
            <span className="font-mono" style={{ fontSize: 10, color: '#FFFFFF' }}>2,3 KM</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="font-display font-bold" style={{ fontSize: 27, color: '#FFFFFF' }}>Sanne, 29</div>
            <div className="font-quote mt-1.5" style={{ fontSize: 14, color: 'rgba(255,255,255,0.96)', lineHeight: 1.35 }}>
              "{PROMPT_SANNE.a}"
            </div>
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
              {['☕ Koffie', '📚 Boeken', '💞 Op zoek naar iets serieus'].map((t) => (
                <span key={t} className="font-body" style={{ fontSize: 11, color: '#FFFFFF', background: 'rgba(255,255,255,0.2)', borderRadius: 999, padding: '3px 9px' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 pb-4 flex items-center justify-center gap-7">
        <CircleButton onClick={() => {}} variant="pass"><X size={24} strokeWidth={2.3} /></CircleButton>
        <CircleButton onClick={onAccept} variant="like"><Heart size={24} fill="#FFFFFF" strokeWidth={0} /></CircleButton>
      </div>
      <BottomNav />
    </div>
  );
}

function ScreenTijden({ selected, toggle, onConfirm }) {
  return (
    <div className="flex-1 flex flex-col px-6 pt-3 pb-6">
      <Eyebrow>Match met Sanne</Eyebrow>
      <div className="font-display font-bold mt-2" style={{ fontSize: 24, color: 'var(--ink)' }}>
        Wanneer kun jij?
      </div>
      <p className="font-body leading-relaxed mt-2" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
        Kies je momenten. Zodra jullie tijd overlapt, plannen we de date in.
      </p>
      <div className="flex-1 flex flex-col gap-2.5 mt-6">
        {SLOT_OPTIONS.map((slot) => {
          const active = selected.includes(slot);
          return (
            <button
              key={slot}
              onClick={() => toggle(slot)}
              className="font-body flex items-center justify-between px-4 py-3.5 rounded-2xl border"
              style={{
                fontSize: 14,
                borderColor: active ? 'var(--rose)' : 'var(--mist)',
                background: active ? 'rgba(255,92,114,0.07)' : 'transparent',
                color: 'var(--ink)',
                fontWeight: active ? 600 : 400,
              }}
            >
              <span>{slot}</span>
              {active && <Check size={16} color="var(--rose)" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
      <div className="mt-6">
        <PrimaryButton onClick={onConfirm} disabled={selected.length === 0}>
          Bevestig tijden
        </PrimaryButton>
      </div>
    </div>
  );
}

function TicketRow({ label, value }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="font-mono uppercase tracking-widest" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
        {label}
      </span>
      <span className="font-mono" style={{ fontSize: 13, color: 'var(--ink)' }}>
        {value}
      </span>
    </div>
  );
}

function ScreenTicket({ onNext }) {
  return (
    <div className="flex-1 flex flex-col px-6 pt-3 pb-6">
      <Eyebrow>Jullie date</Eyebrow>
      <div className="flex-1 flex flex-col justify-center">
        <div
          className="relative rounded-2xl p-6"
          style={{ background: '#FFFDF7', border: '1px solid var(--mist)', overflow: 'hidden', transform: 'rotate(-1.4deg)', boxShadow: '0 20px 38px -20px rgba(34,24,38,0.3)' }}
        >
          <Stamp text="Bevestigd" rotate={-11} style={{ top: 2, right: 2 }} />

          <div style={{ maxWidth: 158 }}>
            <div className="font-display font-bold" style={{ fontSize: 26, color: 'var(--ink)', lineHeight: 1.15 }}>
              Date bevestigd
            </div>
            <div className="font-mono mt-1" style={{ fontSize: 15, color: 'var(--rose)' }}>
              Woensdag · 20:00
            </div>
          </div>

          <div className="relative my-5" style={{ marginLeft: -24, marginRight: -24 }}>
            <div style={{ borderTop: '2px dashed var(--mist)' }} />
            <div className="absolute rounded-full" style={{ width: 18, height: 18, background: 'var(--card)', top: -9, left: -9 }} />
            <div className="absolute rounded-full" style={{ width: 18, height: 18, background: 'var(--card)', top: -9, right: -9 }} />
          </div>

          <div className="flex flex-col gap-2.5">
            <TicketRow label="Met" value="Sanne" />
            <TicketRow label="Status" value="Betaald · €10,00" />
            <TicketRow label="Locatie" value="Volgt morgen" />
          </div>
        </div>
        <p className="font-body leading-relaxed text-center mt-4" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          Kom je niet opdagen? Dan vervalt jouw €10. Gaat de date door? Dan is dit gewoon de prijs van een geslaagde date.
        </p>
      </div>
      <PrimaryButton onClick={onNext}>Bekijk locatie</PrimaryButton>
    </div>
  );
}

function ScreenLocatie({ onNext }) {
  return (
    <div className="flex-1 flex flex-col px-6 pt-3 pb-6">
      <Eyebrow>Vandaag is het zover</Eyebrow>
      <div className="font-display font-bold mt-2" style={{ fontSize: 24, color: 'var(--ink)' }}>
        Café Nassau
      </div>
      <div className="font-mono mt-1" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
        Herenstraat 12, Amsterdam
      </div>

      <div className="relative rounded-2xl mt-5" style={{ height: 150, background: 'var(--mist)', overflow: 'hidden' }}>
        <svg width="100%" height="100%" viewBox="0 0 300 150" preserveAspectRatio="none">
          <path d="M0,40 C60,10 120,70 180,50 S280,20 300,45" stroke="#FFFDF7" strokeWidth="6" fill="none" opacity="0.8" />
          <path d="M0,110 C80,130 160,90 240,110 S300,100 300,110" stroke="#FFFDF7" strokeWidth="5" fill="none" opacity="0.6" />
        </svg>
        <div className="absolute" style={{ top: '48%', left: '55%' }}>
          <MapPin size={26} color="var(--rose)" strokeWidth={2.2} />
        </div>
      </div>

      <div className="flex-1 flex items-center">
        <p className="font-body leading-relaxed" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          Check in zodra je er bent, dan ziet Sanne dat je onderweg bent.
        </p>
      </div>

      <PrimaryButton onClick={onNext}>Na de date</PrimaryButton>
    </div>
  );
}

function ScreenCheckin({ answer, setAnswer }) {
  if (answer) {
    const isYes = answer === 'yes';
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-6">
        <div className="rounded-full flex items-center justify-center mb-4" style={{ width: 56, height: 56, background: isYes ? 'var(--sage)' : 'var(--danger)' }}>
          {isYes ? <Check color="#FFFFFF" size={26} strokeWidth={2.5} /> : <X color="#FFFFFF" size={26} strokeWidth={2.5} />}
        </div>
        <div className="font-display font-bold" style={{ fontSize: 24, color: 'var(--ink)' }}>
          {isYes ? 'Fijne date gehad' : 'Dat is genoteerd'}
        </div>
        <p className="font-body leading-relaxed mt-2" style={{ fontSize: 14, color: 'var(--ink-soft)', maxWidth: 240 }}>
          {isYes
            ? 'Dit was een geslaagde date — de €10 was gewoon de prijs ervoor.'
            : 'Sanne krijgt de kans te reageren. Bevestigt ze dit, of reageert ze niet binnen 24 uur, dan vervalt haar €10 en krijg jij die van jou terug.'}
        </p>
        <button
          onClick={() => setAnswer(null)}
          className="font-mono uppercase tracking-widest mt-6"
          style={{ fontSize: 11, color: 'var(--ink-soft)', textDecoration: 'underline', textUnderlineOffset: '3px', background: 'none', border: 'none' }}
        >
          Opnieuw bekijken
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-6 pb-6">
      <Eyebrow>Na de date</Eyebrow>
      <div className="font-display font-bold mt-2 mb-6" style={{ fontSize: 24, color: 'var(--ink)' }}>
        Is Sanne komen opdagen?
      </div>
      <div className="flex flex-col gap-2.5">
        <PrimaryButton variant="sage" onClick={() => setAnswer('yes')}>
          Ja, ze kwam
        </PrimaryButton>
        <PrimaryButton variant="danger" onClick={() => setAnswer('no')}>
          Nee, ze kwam niet
        </PrimaryButton>
      </div>
      <p className="font-mono tracking-wide text-center mt-4" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
        DIT BEPAALT WAT ER MET DE €10 GEBEURT
      </p>
    </div>
  );
}

export default function DatingAppMockup() {
  const [screen, setScreen] = useState(0);
  const [token, setToken] = useState(null);
  const [selected, setSelected] = useState([]);
  const [checkin, setCheckin] = useState(null);
  const [matchId] = useState(() => 'm_' + Math.random().toString(36).slice(2, 9));

  useEffect(() => {
    if (screen !== 4) return;
    (async () => {
      try {
        let existing = [];
        try {
          const res = await window.storage.get('matches', true);
          existing = res ? JSON.parse(res.value) : [];
        } catch (e) {}
        const record = { id: matchId, a: 'Jij', b: 'Sanne', when: 'Woensdag · 20:00', where: 'Café Nassau', status: 'wacht', createdAt: Date.now() };
        const updated = [...existing.filter((m) => m.id !== matchId), record];
        await window.storage.set('matches', JSON.stringify(updated), true);
      } catch (e) {}
    })();
  }, [screen]);

  useEffect(() => {
    if (!checkin) return;
    (async () => {
      try {
        const res = await window.storage.get('matches', true);
        const existing = res ? JSON.parse(res.value) : [];
        const updated = existing.map((m) => (m.id === matchId ? { ...m, status: checkin === 'yes' ? 'betaald' : 'terugbetaald' } : m));
        await window.storage.set('matches', JSON.stringify(updated), true);
      } catch (e) {}
    })();
  }, [checkin]);

  const next = () => setScreen((s) => Math.min(s + 1, 6));
  const toggleSlot = (slot) => setSelected((prev) => (prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]));

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--paper)', backgroundImage: 'radial-gradient(circle, rgba(122,112,134,0.16) 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,500&family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        :root {
          --ink: #221826;
          --ink-soft: #7A7086;
          --paper: #F3ECDC;
          --card: #FFFBF3;
          --berry: #A6395C;
          --rose: #FF5C72;
          --sunset: #FF9152;
          --sage: #3FA173;
          --danger: #E24B4B;
          --mist: #ECE1CE;
        }
        .font-display { font-family: 'Poppins', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        .font-quote { font-family: 'Fraunces', serif; font-style: italic; }
        .gradient-text {
          background: linear-gradient(135deg, var(--berry), var(--rose), var(--sunset));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        button:focus-visible { outline: 2px solid var(--rose); outline-offset: 2px; }
        @media (prefers-reduced-motion: no-preference) {
          .screen-fade { animation: fadeIn 0.25s ease; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="absolute rounded-full" style={{ width: 320, height: 320, background: 'radial-gradient(circle, rgba(255,92,114,0.28), transparent 70%)', top: -100, left: -110, zIndex: 0 }} />
      <div className="absolute rounded-full" style={{ width: 340, height: 340, background: 'radial-gradient(circle, rgba(255,145,82,0.22), transparent 70%)', bottom: -140, right: -120, zIndex: 0 }} />
      <div className="absolute rounded-full" style={{ width: 220, height: 220, background: 'radial-gradient(circle, rgba(166,57,92,0.2), transparent 70%)', top: '38%', right: -90, zIndex: 0 }} />

      <div className="relative flex flex-col items-center py-10 px-4" style={{ zIndex: 1 }}>
        <div className="text-center mb-7">
          <div className="font-display gradient-text" style={{ fontSize: 34, fontWeight: 800 }}>Monsega</div>
          <div className="font-mono uppercase tracking-widest mt-1" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
            Serieuze dates · geen no-shows
          </div>
        </div>

        <div style={{ width: 'min(340px, 92vw)' }}>
          <div style={{ background: 'var(--ink)', borderRadius: '2.75rem', padding: 10, boxShadow: '0 34px 64px -26px rgba(34,24,38,0.5)' }}>
            <div
              key={screen}
              className="screen-fade"
              style={{ background: 'var(--card)', borderRadius: '2.1rem', minHeight: 600, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <StatusBar />
              {screen === 0 && <ScreenAuth onSuccess={(t) => { setToken(t); next(); }} />}
              {screen === 1 && <ScreenProfiel onNext={next} />}
              {screen === 2 && <ScreenVandaag onAccept={next} />}
              {screen === 3 && <ScreenTijden selected={selected} toggle={toggleSlot} onConfirm={next} />}
              {screen === 4 && <ScreenTicket onNext={next} />}
              {screen === 5 && <ScreenLocatie onNext={next} />}
              {screen === 6 && <ScreenCheckin answer={checkin} setAnswer={setCheckin} />}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mt-7 px-2">
          {SCREEN_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => setScreen(i)}
              className="font-mono uppercase tracking-widest"
              style={{
                fontSize: 10,
                color: i === screen ? 'var(--ink)' : 'var(--ink-soft)',
                borderBottom: i === screen ? '2px solid var(--rose)' : '2px solid transparent',
                paddingBottom: 4,
                background: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderTop: 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
