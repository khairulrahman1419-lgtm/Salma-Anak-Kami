import React, { useState, useRef, useEffect } from 'react';
import {
  Stethoscope,
  X,
  Send,
  Sparkles,
  HelpCircle,
  MessageCircleHeart,
  ChevronDown,
  Loader2,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import type { ChildProfile } from '../types/index.ts';
import { calculateAge, type LatestMeasurements } from '../utils/growth.ts';

interface FloatingDoctorFAQProps {
  profile: ChildProfile;
  latestStats: LatestMeasurements;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  followUpPrompt: string;
}

const PEDIATRIC_FAQS: FAQItem[] = [
  {
    id: 'faq_bb_seret',
    category: 'Tumbuh Kembang & BB',
    question: 'Kapan berat badan anak dikatakan seret (weight faltering) di kurva WHO?',
    answer:
      'Menurut pedoman IDAI & WHO, kenaikan BB perlu dievaluasi bila garis pertumbuhan mendatar, menurun memotong garis persentil, atau tidak mencapai kenaikan minimal bulanan sesuai usia. Evaluasi kecukupan kalori, protein hewani, jadwal makan teratur (feeding rules), dan pastikan tidak ada infeksi tersembunyi seperti ISK atau anemia defisiensi besi.',
    followUpPrompt:
      'Bagaimana evaluasi berat dan tinggi badan anak saya saat ini menurut kurva WHO, dan apa tips menaikkan BB secara sehat?',
  },
  {
    id: 'faq_mpasi_gtm',
    category: 'MPASI & Nutrisi',
    question: 'Bagaimana cara menghadapi anak GTM (Gerakan Tutup Mulut) saat makan MPASI?',
    answer:
      'Terapkan Feeding Rules IDAI: jadwalkan makan utama 3x dan camilan 2x sehari, batasi durasi makan maksimal 30 menit, hindari distraksi gadget/TV, jangan memaksa anak makan, dan utamakan menu padat gizi tinggi protein hewani (telur, ikan, ayam, daging, hati ayam) serta lemak tambahan.',
    followUpPrompt:
      'Anak saya sedang GTM susah makan. Buatkan contoh jadwal makan harian dan ide menu tinggi protein hewani sesuai usianya.',
  },
  {
    id: 'faq_demam',
    category: 'Kesehatan & Imunisasi',
    question: 'Apa pertolongan pertama saat anak demam di rumah dan kapan harus segera ke dokter?',
    answer:
      'Demam terhitung bila suhu tubuh >= 38,0°C (ukur dengan termometer di ketiak). Berikan cairan/ASI lebih sering, kenakan pakaian tipis nyaman, dan kompres hangat di lipat ketiak/selangkangan. Segera ke dokter/IGD bila bayi < 3 bulan demam, demam > 72 jam, anak tampak sangat lemas/sulit dibangunkan, kejang, sesak, atau muntah terus-menerus.',
    followUpPrompt:
      'Apa saja panduan observasi anak demam di rumah dan tanda bahaya yang harus Ayah & Ibu waspadai?',
  },
  {
    id: 'faq_bicara',
    category: 'Bahasa & Stimulasi',
    question: 'Bagaimana menstimulasi anak agar cepat bicara dan apa tanda speech delay?',
    answer:
      'Ajak anak berbicara dua arah dengan kontak mata sejajar, bacakan buku bergambar setiap hari, kurangi screen time (IDAI menyarankan nol gadget untuk anak < 2 tahun kecuali video call keluarga), dan beri jeda agar anak merespons. Konsultasikan ke dokter anak bila usia 12 bulan belum babbling/menunjuk, atau 18 bulan belum ada kata bermakna.',
    followUpPrompt:
      'Berikan permainan stimulasi bicara dan motorik sehari-hari yang cocok untuk usia anak saya sekarang.',
  },
  {
    id: 'faq_tidur',
    category: 'Pola Tidur',
    question: 'Berapa jam kebutuhan tidur ideal bayi & batita untuk hormon pertumbuhan optimal?',
    answer:
      'Hormon pertumbuhan (Growth Hormone) bekerja optimal saat tidur malam yang nyenyak. Usia 4–12 bulan membutuhkan sekitar 12–16 jam/hari (termasuk tidur siang), sedangkan usia 1–2 tahun membutuhkan 11–14 jam/hari. Ciptakan rutinitas sebelum tidur yang tenang dan redupkan lampu kamar.',
    followUpPrompt:
      'Bagaimana tips mengatur jam tidur malam yang nyenyak sesuai usia anak saya agar tumbuh kembangnya optimal?',
  },
];

export const FloatingDoctorFAQ: React.FC<FloatingDoctorFAQProps> = ({
  profile,
  latestStats,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'faq'>('chat');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq_bb_seret');

  const age = calculateAge(profile.birthDate);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome_dr_ai',
      role: 'model',
      text: `Halo ${profile.fatherName || 'Ayah'}${profile.motherName ? ` & ${profile.motherName}` : ''}! Saya dr. AI, asisten konsultasi edukasi tumbuh kembang anak.\n\nSaya sudah membaca data singkat ${profile.nickname} (${age.label}, BB terakhir ${latestStats.weightKg} kg, TB ${latestStats.heightCm} cm). Silakan tanyakan seputar kurva WHO, nutrisi MPASI, milestone, atau keluhan harian si kecil.`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activeTab]);

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    const previousHistory = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setActiveTab('chat');
    setIsLoading(true);

    try {
      const response = await fetch('/api/consult-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: previousHistory,
          childContext: {
            name: profile.name,
            nickname: profile.nickname,
            ageLabel: age.label,
            gender: profile.gender,
            bloodType: profile.bloodType,
            weightKg: latestStats.weightKg,
            heightCm: latestStats.heightCm,
            headCircumferenceCm: latestStats.headCircumferenceCm,
            birthWeightKg: profile.birthWeightKg,
            birthHeightCm: profile.birthHeightCm,
            specialNotes: profile.specialNotes,
          },
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Gagal menghubungi layanan dr. AI.');
      }

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'model',
        text: data.reply || 'Terima kasih, silakan sampaikan detail tambahan bila ada.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Terjadi kendala koneksi saat menghubungi dr. AI. Silakan coba lagi.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'model',
          text: `Maaf Ayah & Bunda, ${message}`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendQuestion(inputText);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'model',
        text: `Percakapan telah diperbarui. Silakan ajukan pertanyaan baru seputar tumbuh kembang ${profile.nickname} (${age.label}).`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const quickPrompts = [
    `Apakah BB ${latestStats.weightKg} kg & TB ${latestStats.heightCm} cm sudah ideal untuk usia ${age.compactLabel}?`,
    'Ide menu MPASI tinggi protein hewani penambah BB',
    `Stimulasi motorik & bicara usia ${age.compactLabel}`,
    'Tanda bahaya saat anak demam atau batuk pilek',
  ];

  return (
    <>
      {/* Tombol Mengambang Transparan (Frosted Glass) — Tanya dr. AI / FAQ & Konsultasi */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Buka Tanya dr. AI - FAQ dan Konsultasi Dokter Anak"
        className="fixed bottom-18 md:bottom-6 right-4 sm:right-6 z-40 group flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white/80 hover:bg-white/95 backdrop-blur-md border border-emerald-300/90 shadow-lg shadow-teal-900/12 hover:shadow-xl transition-all active:scale-97 cursor-pointer"
      >
        <span className="w-5 h-5 rounded-full bg-emerald-100/90 flex items-center justify-center shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        </span>

        <span className="w-9 h-9 rounded-full bg-teal-600 group-hover:bg-teal-700 text-white flex items-center justify-center shadow-xs transition-colors shrink-0">
          <Stethoscope className="w-4.5 h-4.5" />
        </span>

        <span className="text-left pr-1">
          <span className="block text-xs font-extrabold text-slate-900 leading-tight">
            Tanya dr. AI
          </span>
          <span className="block text-[10px] font-bold text-teal-700 leading-tight">
            FAQ &amp; Konsultasi
          </span>
        </span>
      </button>

      {/* Panel Modal Mengambang Transparan (Glassmorphism Sheet) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md h-[86vh] sm:h-[620px] max-h-[90vh] bg-white/92 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl border border-emerald-200/90 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-[#0F5249]/95 to-[#115E59]/95 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-5 h-5 text-emerald-200" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-extrabold tracking-tight truncate">
                      Tanya dr. AI · Konsultasi &amp; FAQ
                    </h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-400/25 text-emerald-100 border border-emerald-300/30">
                      Online
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-100/90 truncate">
                    Konteks: {profile.nickname} ({age.compactLabel} · {latestStats.weightKg} kg)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {activeTab === 'chat' && messages.length > 1 && (
                  <button
                    type="button"
                    onClick={handleResetChat}
                    title="Bersihkan percakapan"
                    className="w-8 h-8 rounded-full hover:bg-white/15 text-emerald-100 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Tutup Tanya dr. AI"
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mode Switcher: Chat dr. AI vs FAQ Cepat */}
            <div className="grid grid-cols-2 gap-1.5 p-2 bg-emerald-50/70 border-b border-emerald-100">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white/80'
                }`}
              >
                <MessageCircleHeart className="w-3.5 h-3.5" />
                <span>Chat dr. AI</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('faq')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'faq'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white/80'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>FAQ Dokter Anak</span>
              </button>
            </div>

            {/* Body Content */}
            {activeTab === 'chat' ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {/* Medical Info Notice */}
                  <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-start gap-2 text-[10px] text-amber-900 leading-relaxed">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Edukasi berbasis pedoman IDAI &amp; WHO. Untuk kondisi gawat darurat atau resep
                      obat, tetap periksakan langsung ke Dokter Spesialis Anak.
                    </span>
                  </div>

                  {/* Messages */}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
                          msg.role === 'user'
                            ? 'bg-teal-700 text-white rounded-br-sm'
                            : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-sm'
                        }`}
                      >
                        <div className="whitespace-pre-line">{msg.text}</div>
                        <span
                          className={`block text-[9px] mt-1 text-right ${
                            msg.role === 'user' ? 'text-emerald-100/80' : 'text-slate-400'
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs text-slate-600 flex items-center gap-2 shadow-2xs">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                        <span>dr. AI sedang menyiapkan penjelasan...</span>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Quick Prompt Suggestions */}
                <div className="px-3 pt-2 pb-1 bg-white/80 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {quickPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={isLoading}
                        onClick={() => void sendQuestion(prompt)}
                        className="shrink-0 text-[10px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 px-2.5 py-1 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={handleFormSubmit}
                  className="p-3 bg-white border-t border-slate-200/80 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Tanya seputar tumbuh kembang ${profile.nickname}...`}
                    disabled={isLoading}
                    className="flex-1 px-3.5 py-2.5 text-xs bg-[#FAF8F5] border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 text-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputText.trim()}
                    aria-label="Kirim pertanyaan"
                    className="w-10 h-10 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              /* Tab 2: FAQ Dokter Anak Accordion */
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                <p className="text-[11px] text-slate-500 px-1">
                  Pertanyaan populer seputar tumbuh kembang anak. Ketuk topik untuk membaca panduan
                  singkat atau lanjut konsultasi dengan dr. AI:
                </p>

                {PEDIATRIC_FAQS.map((item) => {
                  const isExpanded = expandedFaqId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFaqId((prev) => (prev === item.id ? null : item.id))
                        }
                        className="w-full p-3.5 text-left flex items-start justify-between gap-2.5 hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <div className="space-y-1">
                          <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                            {item.category}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {item.question}
                          </h4>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform ${
                            isExpanded ? 'rotate-180 text-teal-600' : ''
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 space-y-2.5 bg-[#FAF8F5]/60">
                          <p className="text-xs text-slate-600 leading-relaxed">{item.answer}</p>
                          <button
                            type="button"
                            onClick={() => void sendQuestion(item.followUpPrompt)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Tanyakan sesuai kondisi {profile.nickname} ke dr. AI &rarr;</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
