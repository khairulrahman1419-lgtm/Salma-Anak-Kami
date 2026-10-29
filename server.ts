import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

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

      const systemInstruction = `Anda adalah "dr. AI", asisten edukasi kesehatan dan tumbuh kembang anak di aplikasi TumbuhKembang (Jurnal Ayah & Ibu).
Gaya bahasa Anda hangat, menenangkan, empatik terhadap Ayah & Bunda, ringkas, dan terstruktur dalam Bahasa Indonesia yang mudah dipahami.

Konteks Profil Anak Saat Ini:
${contextSummary}

Panduan Jawaban:
1. Berikan penjelasan berbasis pedoman kesehatan anak yang diakui (IDAI - Ikatan Dokter Anak Indonesia & Standar Pertumbuhan WHO).
2. Gunakan poin-poin singkat yang praktis dan langsung bisa diterapkan orang tua di rumah (maksimal 3-5 poin utama agar nyaman dibaca di layar HP).
3. Jangan meresepkan obat keras/antibiotik atau dosis obat resep secara spesifik tanpa pemeriksaan fisik dokter.
4. Selalu sertakan pengingat singkat mengenai "Tanda Bahaya (Red Flags)" kapan Ayah/Bunda harus segera membawa anak ke Dokter Spesialis Anak (Sp.A) atau IGD terdekat.`;

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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.5,
        },
      });

      const replyText =
        response.text ||
        'Maaf Ayah & Bunda, dr. AI belum dapat memproses jawaban saat ini. Silakan coba tanyakan kembali.';

      res.json({ reply: replyText });
    } catch (error: unknown) {
      console.error('Error in /api/consult-doctor:', error);
      res.status(500).json({
        error: 'Maaf, dr. AI sedang sibuk atau mengalami gangguan jaringan. Silakan coba sesaat lagi.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
