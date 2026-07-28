import { useState, useEffect } from 'react';
import api from '../api/client';

interface Result {
  student_name: string;
  program_title: string;
  category: string;
  position: number;
  team_name: string;
}

export function usePosterGenerator() {
  const [template, setTemplate] = useState<any>(null);
  const [loadingPosterId, setLoadingPosterId] = useState<number | null>(null);

  useEffect(() => {
    // Fetch template config on mount
    api.get('/fest/public/poster-template').then(res => {
      if (res.data && res.data.image_url) {
        setTemplate(res.data);
      }
    }).catch(() => {
      // Ignore if no template exists
    });
  }, []);

  const getPositionText = (pos: number) => {
    if (pos === 1) return 'FIRST PLACE';
    if (pos === 2) return 'SECOND PLACE';
    if (pos === 3) return 'THIRD PLACE';
    return `${pos}TH PLACE`;
  };

  const generatePoster = async (result: Result & { id: number }) => {
    if (!template) {
      alert("No poster template configured.");
      return;
    }
    setLoadingPosterId(result.id);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = `http://localhost:5000${template.image_url}`;
      });

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const config = template.config;
      const dataMapping: Record<string, string> = {
        student_name: result.student_name,
        program_title: result.program_title,
        category: result.category,
        position: getPositionText(result.position),
        team_name: result.team_name
      };

      Object.entries(config).forEach(([key, settings]: [string, any]) => {
        if (!settings.visible || !dataMapping[key]) return;
        
        ctx.font = `bold ${settings.fontSize}px 'Inter', sans-serif`;
        ctx.fillStyle = settings.color;
        ctx.textAlign = 'left';
        
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillText(dataMapping[key], settings.x, settings.y);
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.student_name.replace(/\\s+/g, '_')}_Result_Poster.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setLoadingPosterId(null);
      }, 'image/png');

    } catch (err) {
      console.error('Failed to generate poster', err);
      alert('Failed to generate poster. Please try again.');
      setLoadingPosterId(null);
    }
  };

  return { generatePoster, loadingPosterId, hasTemplate: !!template };
}
