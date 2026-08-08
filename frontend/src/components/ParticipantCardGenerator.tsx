import { useState, useEffect } from 'react';
import api from '../api/client';

interface Participant {
  id: number;
  student_name: string;
  chest_number: string;
  team_name: string;
  category?: string;
}

export function useParticipantCardGenerator() {
  const [template, setTemplate] = useState<any>(null);
  const [loadingCardId, setLoadingCardId] = useState<number | null>(null);

  useEffect(() => {
    api.get('/fest/public/participant-card-template').then(res => {
      if (res.data && res.data.image_url) {
        setTemplate(res.data);
      }
    }).catch(() => {});
  }, []);

  const generateCard = async (participant: Participant) => {
    if (!template) {
      alert("No participant card template configured.");
      return;
    }
    setLoadingCardId(participant.id);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const img = new Image();
      img.crossOrigin = 'anonymous';

      const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = `${apiBase}${template.image_url}`;
      });

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const config = template.config;
      const dataMapping: Record<string, string> = {
        student_name: participant.student_name,
        chest_number: String(participant.chest_number),
        team_name: participant.team_name,
        category: participant.category || 'N/A',
      };

      Object.entries(config).forEach(([key, settings]: [string, any]) => {
        if (!settings.visible || !dataMapping[key]) return;

        ctx.font = `${settings.fontWeight || 'bold'} ${settings.fontSize}px '${settings.fontFamily || 'Inter'}', sans-serif`;
        ctx.fillStyle = settings.color;
        ctx.textAlign = (settings.textAlign as CanvasTextAlign) || 'left';
        ctx.textBaseline = 'top';

        // Text shadow for readability
        if (settings.shadow !== false) {
          ctx.shadowColor = 'rgba(0,0,0,0.25)';
          ctx.shadowBlur = 3;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        ctx.fillText(dataMapping[key], settings.x, settings.y);
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${participant.chest_number}_${participant.student_name.replace(/\s+/g, '_')}_Card.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setLoadingCardId(null);
      }, 'image/png');

    } catch (err) {
      console.error('Failed to generate participant card', err);
      alert('Failed to generate card. Please try again.');
      setLoadingCardId(null);
    }
  };

  const generateBulkCards = async (participants: Participant[], onProgress?: (current: number, total: number) => void) => {
    if (!template) {
      alert("No participant card template configured.");
      return;
    }

    try {
      const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

      // Preload the template image once
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = `${apiBase}${template.image_url}`;
      });

      // Use JSZip to bundle all cards
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();

      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        if (onProgress) onProgress(i + 1, participants.length);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const config = template.config;
        const dataMapping: Record<string, string> = {
          student_name: p.student_name,
          chest_number: String(p.chest_number),
          team_name: p.team_name,
          category: p.category || 'N/A',
        };

        Object.entries(config).forEach(([key, settings]: [string, any]) => {
          if (!settings.visible || !dataMapping[key]) return;
          ctx.font = `${settings.fontWeight || 'bold'} ${settings.fontSize}px '${settings.fontFamily || 'Inter'}', sans-serif`;
          ctx.fillStyle = settings.color;
          ctx.textAlign = (settings.textAlign as CanvasTextAlign) || 'left';
          ctx.textBaseline = 'top';
          if (settings.shadow !== false) {
            ctx.shadowColor = 'rgba(0,0,0,0.25)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
          } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
          }
          ctx.fillText(dataMapping[key], settings.x, settings.y);
        });

        const blob: Blob = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png');
        });

        zip.file(`${p.chest_number}_${p.student_name.replace(/\s+/g, '_')}.png`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'participant_cards.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Failed to generate bulk cards', err);
      alert('Failed to generate cards. Please try again.');
    }
  };

  return { generateCard, generateBulkCards, loadingCardId, hasCardTemplate: !!template };
}
