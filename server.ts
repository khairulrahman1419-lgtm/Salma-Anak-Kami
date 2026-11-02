import 'dotenv/config';
import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  INITIAL_CHILD_PROFILE,
  INITIAL_GROWTH_RECORDS,
  INITIAL_MILESTONES,
  INITIAL_MOMENTS,
  INITIAL_PARENTING_QUOTES,
} from './src/utils/initialFallback.ts';
import type {
  ChildProfile,
  GrowthRecord,
  MilestoneChecklistItem,
  MomentItem,
  ParentingQuoteItem,
} from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

interface ChildContextPayload {
  name?: string;
  nickname?: string;
  ageLabel?: string;
  gender?: string;
  bloodType?: string;
  weightKg?: number;
  heightCm?: number;
  headCircumferenceCm?: number;
  birthWeightKg?: number;
  birthHeightCm?: number;
  specialNotes?: string;
}

interface GroundedSource {
  uri: string;
  title: string;
}

interface FamilyJournalState {
  profile: ChildProfile;
  moments: MomentItem[];
  records: GrowthRecord[];
  milestones: MilestoneChecklistItem[];
  parentingQuotes: ParentingQuoteItem[];
  updatedAt: string;
}

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const STATE_FILE = path.join(DATA_DIR, 'family-journal.json');

function ensureStorageDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

let hasPersistedStateFile = false;

function loadServerFamilyState(): FamilyJournalState {
  ensureStorageDirs();
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<FamilyJournalState>;
      hasPersistedStateFile = true;
      return {
        profile: { ...INITIAL_CHILD_PROFILE, ...(parsed.profile || {}) },
        moments: Array.isArray(parsed.moments) ? parsed.moments : INITIAL_MOMENTS,
        records: Array.isArray(parsed.records) ? parsed.records : INITIAL_GROWTH_RECORDS,
        milestones: Array.isArray(parsed.milestones) ? parsed.milestones : INITIAL_MILESTONES,
        parentingQuotes: Array.isArray(parsed.parentingQuotes)
          ? parsed.parentingQuotes
          : INITIAL_PARENTING_QUOTES,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('Could not read existing family-journal.json, initializing fresh state:', err);
  }

  hasPersistedStateFile = false;
  return {
    profile: INITIAL_CHILD_PROFILE,
    moments: INITIAL_MOMENTS,
    records: INITIAL_GROWTH_RECORDS,
    milestones: INITIAL_MILESTONES,
    parentingQuotes: INITIAL_PARENTING_QUOTES,
    updatedAt: new Date().toISOString(),
  };
}

function saveServerFamilyState(state: FamilyJournalState) {
  ensureStorageDirs();
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    hasPersistedStateFile = true;
  } catch (err) {
    console.error('Failed to persist family-journal.json:', err);
  }
}

function extensionFromMime(mimeType: string, fallbackName?: string): string {
  const cleanMime = mimeType.toLowerCase();
  if (cleanMime.includes('png')) return 'png';
  if (cleanMime.includes('webp')) return 'webp';
  if (cleanMime.includes('gif')) return 'gif';
  if (cleanMime.includes('mp4')) return 'mp4';
  if (cleanMime.includes('quicktime') || cleanMime.includes('mov')) return 'mov';
  if (cleanMime.includes('webm')) return 'webm';
  if (fallbackName && fallbackName.includes('.')) {
    const ext = fallbackName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ext) return ext;
  }
  return 'jpg';
}

async function startServer() {
  ensureStorageDirs();
  let familyState: FamilyJournalState = loadServerFamilyState();

  const app = express();
  const httpServer = http.createServer(app);
  const PORT = 3000;

  // WebSocket Server in noServer mode on port 3000 so it coexists cleanly with Vite HMR upgrades
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const pathname = new URL(req.url || '/', 'http://localhost').pathname;
      if (pathname === '/ws/sync') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      }
    } catch {
      // Ignore malformed upgrade URLs and let other listeners handle if applicable
    }
  });

  const broadcastToAllClients = (message: Record<string, unknown>) => {
    const serialized = JSON.stringify(message);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    }
  };

  const broadcastPresence = () => {
    let openCount = 0;
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) openCount++;
    }
    broadcastToAllClients({
      type: 'presence:update',
      connectedDevices: openCount,
    });
  };

  wss.on('connection', (ws) => {
    // Send authoritative state immediately on connect
    let openCount = 0;
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) openCount++;
    }
    if (hasPersistedStateFile) {
      ws.send(
        JSON.stringify({
          type: 'sync:init',
          payload: familyState,
          connectedDevices: openCount,
        })
      );
    }
    broadcastPresence();

    ws.on('close', () => {
      broadcastPresence();
    });

    ws.on('error', () => {
      // Ignore transient socket disconnects
    });
  });

  // Support up to 35MB JSON payloads for high-res photos & short mobile videos
  app.use(express.json({ limit: '35mb' }));

  // Serve uploaded photos/videos online across all devices
  app.use('/uploads', express.static(UPLOADS_DIR));
  // Ensure preset assets also resolve in production builds
  app.use('/src/assets', express.static(path.join(__dirname, 'src/assets')));

  // 1. Get authoritative online family state
  app.get('/api/family-state', (_req, res) => {
    if (!hasPersistedStateFile) {
      res.json({});
      return;
    }
    res.json(familyState);
  });

  // 2. Upload photo or video online so every device receives a fast, shareable URL
  app.post('/api/upload-media', (req, res) => {
    try {
      const { dataUrl, fileName } = req.body as {
        dataUrl?: string;
        fileName?: string;
      };

      if (!dataUrl || typeof dataUrl !== 'string') {
        res.status(400).json({ error: 'Data media tidak valid.' });
        return;
      }

      // If already an external HTTPS or relative server URL, return as-is
      if (!dataUrl.startsWith('data:')) {
        res.json({ url: dataUrl });
        return;
      }

      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: 'Format base64 media tidak dikenali.' });
        return;
      }

      const mimeType = match[1];
      const base64Payload = match[2];
      const buffer = Buffer.from(base64Payload, 'base64');
      const ext = extensionFromMime(mimeType, fileName);
      const uniqueName = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const targetPath = path.join(UPLOADS_DIR, uniqueName);

      fs.writeFileSync(targetPath, buffer);
      res.json({ url: `/uploads/${uniqueName}` });
    } catch (err) {
      console.error('Error in /api/upload-media:', err);
      res.status(500).json({ error: 'Gagal menyimpan file media di server.' });
    }
  });

  // 3. Real-time idempotent family journal mutations (broadcasts live to HP Ayah & HP Bunda)
  app.post('/api/family-sync', (req, res) => {
    try {
      const { action, payload, senderId } = req.body as {
        action?: string;
        payload?: any;
        senderId?: string;
      };

      if (!action || !payload) {
        res.status(400).json({ error: 'Parameter sinkronisasi tidak lengkap.' });
        return;
      }

      const nowIso = new Date().toISOString();

      switch (action) {
        case 'profile:update': {
          familyState = {
            ...familyState,
            profile: { ...familyState.profile, ...(payload as ChildProfile) },
            updatedAt: nowIso,
          };
          saveServerFamilyState(familyState);
          broadcastToAllClients({
            type: 'sync:event',
            action: 'profile:update',
            payload: familyState.profile,
            senderId: senderId || '',
            updatedAt: nowIso,
          });
          break;
        }

        case 'moment:create': {
          const incomingMoment = payload as MomentItem;
          const exists = familyState.moments.some((m) => m.id === incomingMoment.id);
          const nextMoments = exists
            ? familyState.moments.map((m) => (m.id === incomingMoment.id ? incomingMoment : m))
            : [incomingMoment, ...familyState.moments];
          familyState = {
            ...familyState,
            moments: nextMoments,
            updatedAt: nowIso,
          };
          saveServerFamilyState(familyState);
          broadcastToAllClients({
            type: 'sync:event',
            action: 'moment:create',
            payload: incomingMoment,
            senderId: senderId || '',
            updatedAt: nowIso,
          });
          break;
        }

        case 'moment:update': {
          const updatedMoment = payload as MomentItem;
          const exists = familyState.moments.some((m) => m.id === updatedMoment.id);
          const nextMoments = exists
            ? familyState.moments.map((m) => (m.id === updatedMoment.id ? updatedMoment : m))
            : [updatedMoment, ...familyState.moments];
          familyState = {
            ...familyState,
            moments: nextMoments,
            updatedAt: nowIso,
          };
          saveServerFamilyState(familyState);
          broadcastToAllClients({
            type: 'sync:event',
            action: 'moment:update',
            payload: updatedMoment,
            senderId: senderId || '',
            updatedAt: nowIso,
          });
          break;
        }

        case 'growth:create': {
          const incomingRecord = payload as GrowthRecord;
          const existingIdx = familyState.records.findIndex(
            (r) =>
              r.id === incomingRecord.id ||
              (Boolean(incomingRecord.sourceMomentId) &&
                r.sourceMomentId === incomingRecord.sourceMomentId)
          );
          const nextRecords =
            existingIdx >= 0
              ? familyState.records.map((r, i) => (i === existingIdx ? incomingRecord : r))
              : [...familyState.records, incomingRecord];
          familyState = {
            ...familyState,
            records: nextRecords,
            updatedAt: nowIso,
          };
          saveServerFamilyState(familyState);
          broadcastToAllClients({
            type: 'sync:event',
            action: 'growth:create',
            payload: incomingRecord,
            senderId: senderId || '',
            updatedAt: nowIso,
          });
          break;
        }

        case 'milestone:toggle': {
          const incomingMilestone = payload as MilestoneChecklistItem;
          const exists = familyState.milestones.some((m) => m.id === incomingMilestone.id);
          const nextMilestones = exists
            ? familyState.milestones.map((m) =>
                m.id === incomingMilestone.id ? incomingMilestone : m
              )
            : [...familyState.milestones, incomingMilestone];
          familyState = {
            ...familyState,
            milestones: nextMilestones,
            updatedAt: nowIso,
          };
          saveServerFamilyState(familyState);
          broadcastToAllClients({
            type: 'sync:event',
            action: 'milestone:toggle',
            payload: incomingMilestone,
            senderId: senderId || '',
            updatedAt: nowIso,
          });
          break;
        }

        case 'quote:update': {
          const incomingQuote = payload as ParentingQuoteItem;
          const exists = familyState.parentingQuotes.some((q) => q.id === incomingQuote.id);
          const nextQuotes = exists
            ? familyState.parentingQuotes.map((q) =>
                q.id === incomingQuote.id ? incomingQuote : q
              )
            : [...familyState.parentingQuotes, incomingQuote];
          nextQuotes.sort((a, b) => a.orderIndex - b.orderIndex);
          familyState = {
            ...familyState,
            parentingQuotes: nextQuotes,
            updatedAt: nowIso,
          };
          saveServerFamilyState(familyState);
          broadcastToAllClients({
            type: 'sync:event',
            action: 'quote:update',
            payload: incomingQuote,
            senderId: senderId || '',
            updatedAt: nowIso,
          });
          break;
        }

        case 'cloud:reconcile': {
          const cloud = payload as Partial<FamilyJournalState>;
          const mergedMomentsMap = new Map<string, MomentItem>();
          for (const m of familyState.moments) mergedMomentsMap.set(m.id, m);
          if (Array.isArray(cloud.moments)) {
            for (const cm of cloud.moments) mergedMomentsMap.set(cm.id, cm);
          }
          const mergedMoments = Array.from(mergedMomentsMap.values()).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
          );

          const mergedRecordsMap = new Map<string, GrowthRecord>();
          for (const r of familyState.records) mergedRecordsMap.set(r.id, r);
          if (Array.isArray(cloud.records)) {
            for (const cr of cloud.records) mergedRecordsMap.set(cr.id, cr);
          }
          const mergedRecords = Array.from(mergedRecordsMap.values()).sort((a, b) =>
            a.date.localeCompare(b.date)
          );

          familyState = {
            profile: cloud.profile
              ? { ...familyState.profile, ...cloud.profile }
              : familyState.profile,
            moments: mergedMoments,
            records: mergedRecords,
            milestones:
              Array.isArray(cloud.milestones) && cloud.milestones.length > 0
                ? cloud.milestones
                : familyState.milestones,
            parentingQuotes:
              Array.isArray(cloud.parentingQuotes) && cloud.parentingQuotes.length > 0
                ? cloud.parentingQuotes
                : familyState.parentingQuotes,
            updatedAt: nowIso,
          };
          saveServerFamilyState(familyState);
          broadcastToAllClients({
            type: 'sync:init',
            payload: familyState,
          });
          break;
        }

        default: {
          res.status(400).json({ error: `Aksi tidak dikenali: ${action}` });
          return;
        }
      }

      res.json({ ok: true, updatedAt: nowIso });
    } catch (err) {
      console.error('Error in /api/family-sync:', err);
      res.status(500).json({ error: 'Gagal menyinkronkan perubahan keluarga.' });
    }
  });

  // 4. Upgraded Tanya dr. AI with Google Search Grounding (Halodoc, IDAI, Alodokter, Kemenkes, WHO)
  app.post('/api/consult-doctor', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error: 'Layanan konsultasi AI belum terkonfigurasi di server.',
        });
        return;
      }

      const { message, history, childContext } = req.body as {
        message?: string;
        history?: ChatTurn[];
        childContext?: ChildContextPayload;
      };

      if (!message || !message.trim()) {
        res.status(400).json({ error: 'Pertanyaan tidak boleh kosong.' });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const contextSummary = childContext
        ? [
            `Nama Anak: ${childContext.name || childContext.nickname || 'Si Kecil'}`,
            childContext.ageLabel ? `Usia Saat Ini: ${childContext.ageLabel}` : '',
            childContext.gender
              ? `Jenis Kelamin: ${childContext.gender === 'female' ? 'Perempuan' : 'Laki-laki'}`
              : '',
            childContext.bloodType ? `Golongan Darah: ${childContext.bloodType}` : '',
            childContext.weightKg ? `Berat Badan Terakhir: ${childContext.weightKg} kg` : '',
            childContext.heightCm ? `Tinggi/Panjang Badan Terakhir: ${childContext.heightCm} cm` : '',
            childContext.headCircumferenceCm
              ? `Lingkar Kepala Terakhir: ${childContext.headCircumferenceCm} cm`
              : '',
            childContext.birthWeightKg
              ? `Data Lahir: BB ${childContext.birthWeightKg} kg, PB ${childContext.birthHeightCm || '-'} cm`
              : '',
            childContext.specialNotes ? `Catatan Riwayat: ${childContext.specialNotes}` : '',
          ]
            .filter(Boolean)
            .join(' | ')
        : 'Data spesifik anak belum disertakan.';

      const systemInstruction = `Anda adalah "dr. AI", konsultan edukasi kesehatan anak, keluarga, dan tumbuh kembang di aplikasi TumbuhKembang (Jurnal Ayah & Ibu).
Anda terhubung dengan pencarian Google untuk menelusuri referensi medis tepercaya seperti Halodoc, IDAI (Ikatan Dokter Anak Indonesia), Alodokter, Kementerian Kesehatan RI, dan WHO.

Konteks Profil Anak Saat Ini (gunakan bila relevan dengan pertanyaan):
${contextSummary}

Panduan Menjawab:
1. Jawab SEMUA pertanyaan Ayah & Bunda secara luas, akurat, dan tuntas — baik seputar keluhan kesehatan anak (demam, batuk pilek, diare, ruam kulit, alergi, gigi tumbuh), MPASI & gizi, kurva WHO, imunisasi, menyusui/ASI, kesehatan Ibu & Ayah, pertolongan pertama, informasi umum kandungan obat edukatif, maupun pertanyaan parenting luas lainnya.
2. Telusuri informasi medis tepercaya melalui pencarian web (utamakan rujukan seperti Halodoc, IDAI, Alodokter, Kemenkes RI, dan WHO) agar informasi selalu mutakhir dan faktual.
3. Gunakan Bahasa Indonesia yang hangat, menenangkan, rapi, dan terstruktur dengan poin-poin praktis yang nyaman dibaca di layar HP.
4. Untuk obat keras/resep dokter atau antibiotik, jelaskan fungsinya secara edukatif tanpa meresepkan dosis obat keras tanpa pemeriksaan dokter langsung.
5. Sertakan bagian singkat "Kapan Harus ke Dokter / Tanda Bahaya" bila pertanyaan berkaitan dengan gejala atau keluhan medis.`;

      const contents = [
        ...(Array.isArray(history)
          ? history.slice(-8).map((turn) => ({
              role: turn.role === 'model' ? 'model' : 'user',
              parts: [{ text: String(turn.text || '') }],
            }))
          : []),
        {
          role: 'user',
          parts: [{ text: message.trim() }],
        },
      ];

      let replyText = '';
      const extractedSources: GroundedSource[] = [];

      const extractSourcesFromResponse = (resp: any): GroundedSource[] => {
        const list: GroundedSource[] = [];
        const chunks = resp?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const seenUris = new Set<string>();
        for (const chunk of chunks) {
          const web = (chunk as { web?: { uri?: string; title?: string } })?.web;
          if (web?.uri && typeof web.uri === 'string' && !seenUris.has(web.uri)) {
            seenUris.add(web.uri);
            let fallbackTitle = 'Referensi Medis';
            try {
              fallbackTitle = new URL(web.uri).hostname.replace(/^www\./, '');
            } catch {
              // ignore URL parse error
            }
            list.push({
              uri: web.uri,
              title: web.title?.trim() || fallbackTitle,
            });
            if (list.length >= 5) break;
          }
        }
        return list;
      };

      // Fetch fast public encyclopedia/medical snippets in parallel so broad queries always have web context
      const fetchSupplementalWebReferences = async (
        queryText: string
      ): Promise<{ snippetContext: string; referenceLinks: GroundedSource[] }> => {
        const referenceLinks: GroundedSource[] = [
          {
            uri: `https://www.google.com/search?q=${encodeURIComponent(
              `${queryText} site:halodoc.com`
            )}`,
            title: 'Halodoc — Referensi Kesehatan',
          },
          {
            uri: `https://www.google.com/search?q=${encodeURIComponent(
              `${queryText} site:idai.or.id`
            )}`,
            title: 'IDAI — Ikatan Dokter Anak Indonesia',
          },
          {
            uri: `https://www.google.com/search?q=${encodeURIComponent(
              `${queryText} site:alodokter.com`
            )}`,
            title: 'Alodokter — Info Medis',
          },
        ];

        let snippetContext = '';
        try {
          const wikiUrl = `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
            queryText.slice(0, 120)
          )}&utf8=&format=json&srlimit=3`;
          const wikiRes = await fetch(wikiUrl, {
            headers: { 'User-Agent': 'TumbuhKembangApp/1.0' },
            signal: AbortSignal.timeout(2200),
          });
          if (wikiRes.ok) {
            const wikiJson = (await wikiRes.json()) as {
              query?: { search?: { title: string; snippet: string }[] };
            };
            const items = wikiJson.query?.search || [];
            if (items.length > 0) {
              snippetContext = items
                .map(
                  (it) =>
                    `- ${it.title}: ${it.snippet.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"')}`
                )
                .join('\n');
              referenceLinks.unshift({
                uri: `https://id.wikipedia.org/wiki/${encodeURIComponent(
                  items[0].title.replace(/\s+/g, '_')
                )}`,
                title: `${items[0].title} — Ensiklopedia`,
              });
            }
          }
        } catch {
          // Ignore timeout or network issue on supplemental lookup
        }

        return { snippetContext, referenceLinks: referenceLinks.slice(0, 4) };
      };

      const trimmedQuery = message.trim();

      try {
        // Attempt 1: Native Google Search Grounding on fast gemini-3.1-flash-lite
        const groundedResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
            abortSignal: AbortSignal.timeout(4000),
          },
        });

        replyText = groundedResponse.text || '';
        extractedSources.push(...extractSourcesFromResponse(groundedResponse));
      } catch {
        // Attempt 2: Fast web-enriched consultation on gemini-3.1-flash-lite (avoids free-tier search tool 429)
        const { snippetContext, referenceLinks } = await fetchSupplementalWebReferences(
          trimmedQuery
        );

        const enrichedInstruction = snippetContext
          ? `${systemInstruction}\n\nKonteks Tambahan Hasil Penelusuran Topik:\n${snippetContext}`
          : systemInstruction;

        try {
          const fastResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents,
            config: {
              systemInstruction: enrichedInstruction,
              abortSignal: AbortSignal.timeout(12000),
            },
          });
          replyText = fastResponse.text || '';
          extractedSources.push(...referenceLinks);
        } catch (liteErr) {
          console.warn('gemini-3.1-flash-lite fallback to gemini-3.8-flash:', liteErr);
          const backupResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents,
            config: {
              systemInstruction: enrichedInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              abortSignal: AbortSignal.timeout(12000),
            },
          });
          replyText = backupResponse.text || '';
          extractedSources.push(...referenceLinks);
        }
      }

      if (extractedSources.length === 0) {
        extractedSources.push(
          {
            uri: `https://www.google.com/search?q=${encodeURIComponent(
              `${trimmedQuery} site:halodoc.com`
            )}`,
            title: 'Halodoc — Referensi Kesehatan',
          },
          {
            uri: `https://www.google.com/search?q=${encodeURIComponent(
              `${trimmedQuery} site:idai.or.id`
            )}`,
            title: 'IDAI — Ikatan Dokter Anak Indonesia',
          }
        );
      }

      if (!replyText.trim()) {
        replyText =
          'Maaf Ayah & Bunda, dr. AI belum dapat memproses jawaban saat ini. Silakan coba kirimkan pertanyaan sekali lagi.';
      }

      res.json({
        reply: replyText,
        sources: extractedSources,
      });
    } catch (error: unknown) {
      console.error('Error in /api/consult-doctor:', error);
      res.status(500).json({
        error:
          'Maaf, layanan dr. AI sedang mengalami gangguan jaringan sementara. Silakan coba beberapa saat lagi.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server & Real-Time Sync running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
