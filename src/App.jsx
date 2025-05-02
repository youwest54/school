import { useState, useEffect } from 'react';
import './App.css';

const LANG_CODES = ['ar', 'en', 'fr'];
const LANG_LABELS = ['Arabic', 'English', 'French'];

function speak(text, lang, voiceURI) {
  if ('speechSynthesis' in window) {
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.lang = lang;
    if (voiceURI) utter.voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === voiceURI);
    window.speechSynthesis.speak(utter);
  }
}

function Flashcard({ card, forceSide, locked, onToggleRemember, remembered, voiceSettings }) {
  const [side, setSide] = useState(0); // 0: Arabic, 1: English, 2: French
  const languages = [card.arabic, card.english, card.french];

  // If forceSide changes, update the displayed side
  useEffect(() => {
    if (typeof forceSide === 'number') setSide(forceSide);
  }, [forceSide]);

  return (
    <div className="flashcard" style={{ marginBottom: 16, border: remembered ? '2px solid #43a047' : undefined, position: 'relative' }}>
      {remembered && (
        <span style={{
          position: 'absolute',
          top: 8,
          right: 12,
          background: '#43a047',
          color: '#fff',
          borderRadius: 8,
          padding: '2px 8px',
          fontSize: 12
        }}>Remembered ✓</span>
      )}
      <div style={{ fontSize: '2rem', marginBottom: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        {languages.map((word, idx) => (
          <span key={idx} style={{ display: side === idx ? 'inline-flex' : 'none', alignItems: 'center', gap: 6 }}>
            {word}
            <button
              aria-label={`Play ${LANG_LABELS[idx]} audio`}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                marginLeft: 4,
                fontSize: 32,
                color: '#1976d2',
                verticalAlign: 'middle',
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: 999,
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 8,
                paddingBottom: 8,
                touchAction: 'manipulation',
                WebkitTapHighlightColor: '#b3e5fc',
                outline: 'none',
                minWidth: 48,
                minHeight: 48,
                justifyContent: 'center',
              }}
              onClick={e => { e.stopPropagation(); speak(word, LANG_CODES[idx], voiceSettings[LANG_CODES[idx]]); }}
              tabIndex={0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="1.5em" viewBox="0 0 384 512" width="36" style={{ display: 'inline', verticalAlign: 'middle', pointerEvents: 'none' }}><path fill="currentColor" d="M215 71c-7.1-3.8-15.7-2.7-21.6 2.4L97.5 160H32c-17.7 0-32 14.3-32 32v128c0 17.7 14.3 32 32 32h65.5l95.9 86.6c5.9 5.1 14.5 6.2 21.6 2.4S224 432.4 224 424V88c0-8.4-5.1-16.1-13-19zM32 320V192h64v128H32zm320-64c0-53-43-96-96-96v48c26.5 0 48 21.5 48 48s-21.5 48-48 48v48c53 0 96-43 96-96zm32 0c0 74.6-60.4 135-135 135v48c101.7 0 184-82.3 184-183h-49z"/></svg>
            </button>
          </span>
        ))}
      </div>
      <div style={{ marginBottom: 8, color: '#666' }}>{LANG_LABELS[side]}</div>
      <button onClick={() => !locked && setSide((side + 1) % 3)} disabled={locked}>
        Flip
      </button>
      {typeof onToggleRemember === 'function' && (
        <button
          style={{ marginTop: 8, background: remembered ? '#43a047' : '#eee', color: remembered ? '#fff' : '#333' }}
          onClick={onToggleRemember}
        >
          {remembered ? 'Unmark Remembered' : 'Mark as Remembered'}
        </button>
      )}
    </div>
  );
}

function AddFlashcards({ cards, setCards }) {
  const [arabic, setArabic] = useState('');
  const [english, setEnglish] = useState('');
  const [french, setFrench] = useState('');
  const [bulk, setBulk] = useState('');
  const [copied, setCopied] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [editCard, setEditCard] = useState({ arabic: '', english: '', french: '' });

  // Voice settings
  const [voices, setVoices] = useState([]);
  const [voiceSettings, setVoiceSettings] = useState(() => {
    const saved = localStorage.getItem('flashcard_voice_settings');
    return saved ? JSON.parse(saved) : { ar: '', en: '', fr: '' };
  });

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const updateVoices = () => setVoices(window.speechSynthesis.getVoices());
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const handleVoiceChange = (lang, val) => {
    setVoiceSettings(prev => {
      const updated = { ...prev, [lang]: val };
      localStorage.setItem('flashcard_voice_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const addCard = (e) => {
    e.preventDefault();
    if (arabic && english && french) {
      setCards([...cards, { arabic, english, french, remembered: false }]);
      setArabic(''); setEnglish(''); setFrench('');
    }
  };

  const handleBulkAdd = () => {
    const newCards = bulk
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [arabic, english, french] = line.split('\t');
        return arabic && english && french ? { arabic, english, french, remembered: false } : null;
      })
      .filter(Boolean);
    setCards([...cards, ...newCards]);
    setBulk('');
  };

  const exportTSV = () => {
    const tsv = cards.map(card => `${card.arabic}\t${card.english}\t${card.french}`).join('\n');
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const startEdit = idx => {
    setEditIdx(idx);
    setEditCard({
      arabic: cards[idx].arabic,
      english: cards[idx].english,
      french: cards[idx].french
    });
  };

  const saveEdit = () => {
    setCards(cards => cards.map((c, i) => i === editIdx ? { ...c, ...editCard } : c));
    setEditIdx(null);
    setEditCard({ arabic: '', english: '', french: '' });
  };

  const cancelEdit = () => {
    setEditIdx(null);
    setEditCard({ arabic: '', english: '', french: '' });
  };

  const deleteCard = idx => {
    setCards(cards => cards.filter((_, i) => i !== idx));
    if (editIdx === idx) {
      setEditIdx(null);
      setEditCard({ arabic: '', english: '', french: '' });
    }
  };

  return (
    <div className="add-flashcards-desktop">
      <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 18, color: '#1976d2', letterSpacing: 1 }}>Add Flashcards</h2>
      <div style={{ marginBottom: 18, background: '#f9fbe7', borderRadius: 8, padding: 12 }}>
        <label htmlFor="bulk-flashcard-input" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
          Paste multiple flashcards (Arabic [Tab] English [Tab] French, one per line):
        </label>
        <textarea
          id="bulk-flashcard-input"
          value={bulk}
          onChange={e => setBulk(e.target.value)}
          rows={5}
          style={{ width: '100%', fontSize: 16, padding: 8, borderRadius: 6, marginBottom: 8, border: '1px solid #ddd', resize: 'vertical' }}
          placeholder={"مثال:\nدقيق\tAccurate\tPrécis\nضالم أو مظلوم\tOppressor or oppressed\tOppresseur ou opprimé"}
        />
        <button
          type="button"
          style={{ background: '#43a047', color: '#fff', borderRadius: 6, fontWeight: 600, fontSize: 15, padding: '8px 16px', cursor: 'pointer', marginTop: 4 }}
          onClick={handleBulkAdd}
          disabled={!bulk.trim()}
        >
          Add Multiple Flashcards
        </button>
      </div>
      {/* Settings Panel */}
      <div style={{ background: '#f1f8e9', padding: 18, borderRadius: 8, marginBottom: 24, boxShadow: '0 1px 4px #0001' }}>
        <h3 style={{ color: '#388e3c', fontWeight: 600, fontSize: 19, margin: 0, marginBottom: 10 }}>Settings</h3>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 14 }}>
          <div>
            <label style={{ fontWeight: 500, color: '#1976d2', marginRight: 8 }}>Arabic Voice:</label>
            <select value={voiceSettings.ar} onChange={e => handleVoiceChange('ar', e.target.value)} style={{ fontSize: 15, padding: '6px 10px', borderRadius: 6 }}>
              <option value="">Default</option>
              {voices.filter(v => v.lang.startsWith('ar')).map(v => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 500, color: '#1976d2', marginRight: 8 }}>English Voice:</label>
            <select value={voiceSettings.en} onChange={e => handleVoiceChange('en', e.target.value)} style={{ fontSize: 15, padding: '6px 10px', borderRadius: 6 }}>
              <option value="">Default</option>
              {voices.filter(v => v.lang.startsWith('en')).map(v => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 500, color: '#1976d2', marginRight: 8 }}>French Voice:</label>
            <select value={voiceSettings.fr} onChange={e => handleVoiceChange('fr', e.target.value)} style={{ fontSize: 15, padding: '6px 10px', borderRadius: 6 }}>
              <option value="">Default</option>
              {voices.filter(v => v.lang.startsWith('fr')).map(v => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </div>
        </div>
        {/* Export/Import buttons */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button type="button" style={{ background: '#1976d2', color: '#fff', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 15, padding: '8px 16px', cursor: 'pointer' }} onClick={() => {
            const data = {
              cards,
              voiceSettings
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'flashcards-backup.json';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }, 100);
          }}>
            Export Backup
          </button>
          <label style={{ background: '#43a047', color: '#fff', borderRadius: 6, fontWeight: 600, fontSize: 15, padding: '8px 16px', cursor: 'pointer', marginBottom: 0 }}>
            Import Backup
            <input type="file" accept="application/json" style={{ display: 'none' }} onChange={e => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = evt => {
                try {
                  const data = JSON.parse(evt.target.result);
                  if (Array.isArray(data.cards)) setCards(data.cards);
                  if (data.voiceSettings) setVoiceSettings(data.voiceSettings);
                  localStorage.setItem('flashcard_cards', JSON.stringify(data.cards));
                  localStorage.setItem('flashcard_voice_settings', JSON.stringify(data.voiceSettings));
                  alert('Backup imported!');
                } catch {
                  alert('Invalid backup file.');
                }
              };
              reader.readAsText(file);
              e.target.value = '';
            }} />
          </label>
        </div>
      </div>
      <form onSubmit={addCard} style={{ marginBottom: 24, display: 'flex', gap: 18, alignItems: 'center', background: '#f7fafd', padding: 18, borderRadius: 8, boxShadow: '0 1px 4px #0001' }}>
        <input className="add-input" placeholder="Arabic" value={arabic} onChange={e => setArabic(e.target.value)} required />
        <input className="add-input" placeholder="English" value={english} onChange={e => setEnglish(e.target.value)} required />
        <input className="add-input" placeholder="French" value={french} onChange={e => setFrench(e.target.value)} required />
        <button type="submit" style={{ background: '#43a047', color: '#fff', fontWeight: 600, fontSize: 17, padding: '12px 20px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>Add</button>
      </form>
      <div style={{ marginBottom: 24, background: '#f7fafd', padding: 18, borderRadius: 8, boxShadow: '0 1px 4px #0001' }}>
        <textarea
          className="add-input"
          placeholder="Paste multiple cards here, one per line, tab-separated: منزل\tHouse\tMaison"
          value={bulk}
          onChange={e => setBulk(e.target.value)}
          rows={3}
          style={{ width: '100%', fontFamily: 'inherit', fontSize: 16 }}
        />
        <button onClick={handleBulkAdd} style={{ marginTop: 8, background: '#1976d2', color: '#fff', fontWeight: 600, fontSize: 16, borderRadius: 6, padding: '10px 18px', border: 'none', cursor: 'pointer' }} disabled={!bulk.trim()}>
          Add All Cards
        </button>
      </div>
      {cards.length > 0 && (
        <button onClick={exportTSV} style={{ marginBottom: 16, background: '#fffde7', color: '#1976d2', border: '1px solid #ffe082', borderRadius: 6, fontWeight: 600, fontSize: 16, padding: '10px 18px', cursor: 'pointer' }}>
          {copied ? 'Copied!' : 'Copy All as TSV'}
        </button>
      )}
      {/* Editable card list */}
      <div style={{ marginTop: 16 }}>
        {cards.length > 0 && (
          <div className="card-list-row" style={{ fontWeight: 600, color: '#1976d2', fontSize: 15, borderBottom: '1px solid #e0e0e0', marginBottom: 8 }}>
            <div style={{ flex: 1, textAlign: 'left' }}>Arabic</div>
            <div style={{ flex: 1, textAlign: 'left' }}>English</div>
            <div style={{ flex: 1, textAlign: 'left' }}>French</div>
            <div style={{ width: 60, textAlign: 'center' }}></div>
            <div style={{ width: 60, textAlign: 'center' }}></div>
          </div>
        )}
        {cards.map((card, idx) => (
          <div key={idx} className="card-list-row" style={{ background: idx % 2 === 0 ? '#f7fafd' : '#fff', borderRadius: 8, boxShadow: '0 1px 4px #0001', padding: 10, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.2s', border: editIdx === idx ? '2px solid #1976d2' : '2px solid transparent' }}>
            {editIdx === idx ? (
              <>
                <div style={{ flex: 1 }}>
                  <textarea style={{ width: '100%', fontSize: '1.2rem', padding: '12px 10px', boxSizing: 'border-box', resize: 'vertical', minHeight: 44, maxHeight: 150, borderRadius: 6, border: '1px solid #bdbdbd' }} value={editCard.arabic} onChange={e => setEditCard(ec => ({ ...ec, arabic: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <textarea style={{ width: '100%', fontSize: '1.2rem', padding: '12px 10px', boxSizing: 'border-box', resize: 'vertical', minHeight: 44, maxHeight: 150, borderRadius: 6, border: '1px solid #bdbdbd' }} value={editCard.english} onChange={e => setEditCard(ec => ({ ...ec, english: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <textarea style={{ width: '100%', fontSize: '1.2rem', padding: '12px 10px', boxSizing: 'border-box', resize: 'vertical', minHeight: 44, maxHeight: 150, borderRadius: 6, border: '1px solid #bdbdbd' }} value={editCard.french} onChange={e => setEditCard(ec => ({ ...ec, french: e.target.value }))} />
                </div>
                <button aria-label="Save" style={{ background: '#43a047', color: '#fff', borderRadius: 6, fontSize: 16, padding: '8px 0', width: 58, marginLeft: 0, fontWeight: 600, border: 'none', cursor: 'pointer' }} onClick={saveEdit}>Save</button>
                <button aria-label="Cancel" style={{ background: '#eee', color: '#333', borderRadius: 6, fontSize: 16, padding: '8px 0', width: 58, marginLeft: 6, fontWeight: 600, border: 'none', cursor: 'pointer' }} onClick={cancelEdit}>Cancel</button>
                <button aria-label="Delete" style={{ background: '#e53935', color: '#fff', borderRadius: 6, fontSize: 24, padding: '0 0', width: 44, marginLeft: 10, height: 44, lineHeight: '44px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }} onClick={() => deleteCard(idx)}>
                  ×
                </button>
              </>
            ) : (
              <>
                <div style={{ flex: 1, fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.arabic}</div>
                <div style={{ flex: 1, fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.english}</div>
                <div style={{ flex: 1, fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.french}</div>
                <button aria-label="Edit" style={{ background: '#1976d2', color: '#fff', borderRadius: 6, fontSize: 15, padding: '8px 0', width: 58, marginLeft: 0, fontWeight: 600, border: 'none', cursor: 'pointer' }} onClick={() => startEdit(idx)}>
                  ✏️ Edit
                </button>
                <button aria-label="Delete" style={{ background: '#e53935', color: '#fff', borderRadius: 6, fontSize: 24, padding: '0 0', width: 44, marginLeft: 6, height: 44, lineHeight: '44px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }} onClick={() => deleteCard(idx)}>
                  ×
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayFlashcards({ cards, setCards }) {
  const [forceSide, setForceSide] = useState(null); // null or 0 (Arabic)
  const [locked, setLocked] = useState(false);

  const flipAllToArabic = () => {
    setForceSide(0);
    setLocked(true);
  };
  const unlock = () => {
    setForceSide(null);
    setLocked(false);
  };

  const toggleRemember = idx => {
    setCards(cards => cards.map((card, i) => i === idx ? { ...card, remembered: !card.remembered } : card));
  };

  if (cards.length === 0) {
    return <div style={{ textAlign: 'center', marginTop: 40 }}>No flashcards yet. Add some first!</div>;
  }
  return (
    <div style={{ maxWidth: 450, margin: '40px auto', padding: 24 }}>
      {locked ? (
        <button
          onClick={unlock}
          style={{ marginBottom: 16, width: '100%' }}
        >
          Return to normal flipping
        </button>
      ) : (
        <button
          onClick={flipAllToArabic}
          style={{ marginBottom: 16, width: '100%' }}
        >
          Flip All to Arabic
        </button>
      )}
      {cards.map((card, idx) => (
        <Flashcard
          card={card}
          key={idx}
          forceSide={forceSide}
          locked={locked}
          remembered={card.remembered}
          onToggleRemember={() => toggleRemember(idx)}
          voiceSettings={JSON.parse(localStorage.getItem('flashcard_voice_settings'))}
        />
      ))}
    </div>
  );
}

function App() {
  const [page, setPage] = useState('add'); // 'add' or 'play'
  const defaultCards = [
    { arabic: "دقيق", english: "Accurate", french: "Précis", remembered: false },
    { arabic: "ضالم أو مظلوم", english: "Oppressor or oppressed", french: "Oppresseur ou opprimé", remembered: false },
    { arabic: "حضانة الأطفال بعد الطلاق", english: "Child Custody", french: "La garde des enfants après divorce", remembered: false },
    { arabic: "مجاري", english: "Sewers", french: "Égouts", remembered: false },
    { arabic: "هضم", english: "Digestion", french: "Digestion", remembered: false },
    { arabic: "أنا كنت على وشك أن أصاب بسيارة", english: "I almost got hit by a car.", french: "J'étais sur le point de me faire renverser", remembered: false },
    { arabic: "كنت قريبًا من أن أصاب بسيارة", english: "I was this close to being hit by a car.", french: "J'étais si près d'être percuté par une voiture", remembered: false },
    { arabic: "مغترب", english: "Expatriate", french: "Expatrié", remembered: false },
    { arabic: "كرة القدم يمكن أن تزيد الناتج المحلي", english: "Football can increase GDP by 2% to 5%.", french: "Le football peut augmenter le PIB de 2% à 5%.", remembered: false },
    { arabic: "أين يمكن أن أجد ذلك؟", english: "Where can I find it?", french: "Où est-ce que je peux en trouver ?", remembered: false },
    { arabic: "تنوع", english: "Variety", french: "Variété", remembered: false },
    { arabic: "أبعده قدر الإمكان", english: "Keep him as far away as possible", french: "Éloigne-le autant que possible", remembered: false },
    { arabic: "مراقبة الأنشطة", english: "Monitoring activities", french: "Suivi des activités", remembered: false },
    { arabic: "جرح", english: "Wound", french: "Blessure", remembered: false }
  ];
  const [cards, setCards] = useState(() => {
    const saved = localStorage.getItem('flashcard_cards');
    return saved ? JSON.parse(saved) : defaultCards;
  });

  useEffect(() => {
    localStorage.setItem('flashcard_cards', JSON.stringify(cards));
  }, [cards]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, margin: '24px 0' }}>
        <button onClick={() => setPage('add')} style={{ fontWeight: page === 'add' ? 'bold' : 'normal' }}>
          Add Flashcards
        </button>
        <button onClick={() => setPage('play')} style={{ fontWeight: page === 'play' ? 'bold' : 'normal' }}>
          Play Flashcards
        </button>
      </div>
      {page === 'add' ? (
        <>
          <button
            style={{ marginBottom: 16, background: '#43a047', color: '#fff', borderRadius: 8, padding: '8px 20px', fontWeight: 'bold', fontSize: 16 }}
            onClick={() => {
              // Only add cards that are not already present (by arabic, english, french)
              setCards(prevCards => {
                const existing = new Set(prevCards.map(card => card.arabic + card.english + card.french));
                const newCards = defaultCards.filter(card => !existing.has(card.arabic + card.english + card.french));
                const updated = [...prevCards, ...newCards];
                localStorage.setItem('flashcard_cards', JSON.stringify(updated));
                return updated;
              });
            }}
          >
            Add Default Flashcards
          </button>
          <AddFlashcards cards={cards} setCards={setCards} />
        </>
      ) : (
        <PlayFlashcards cards={cards} setCards={setCards} />
      )}
    </div>
  );
}

export default App;
