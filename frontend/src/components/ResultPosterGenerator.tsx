import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export interface WinnerEntry {
  student_name: string;
  team_name: string;
  position?: number;
  is_group?: boolean;
}

export interface EventPosterData {
  id?: number | string;
  program_title: string;
  category: string;
  sequence_number?: number;
  is_group?: boolean;
  first_place?: WinnerEntry;
  second_place?: WinnerEntry;
  third_place?: WinnerEntry;
  results?: Array<WinnerEntry & { position: number; id?: number; is_group?: boolean }>;
  // Fallback for legacy single-winner objects
  student_name?: string;
  team_name?: string;
  position?: number;
}

export interface RenderedPoster {
  dataUrl: string;
  blob: Blob;
  file?: File;
  fileName: string;
}

export const FONT_OPTIONS = [
  { label: 'Inter (Modern Sans)', value: 'Inter, sans-serif' },
  { label: 'Montserrat (Bold Display)', value: 'Montserrat, sans-serif' },
  { label: 'Outfit (Geometric Sans)', value: 'Outfit, sans-serif' },
  { label: 'Oswald (Condensed)', value: 'Oswald, sans-serif' },
  { label: 'Anton (Impact Display)', value: 'Anton, sans-serif' },
  { label: 'Roboto (Clean Sans)', value: 'Roboto, sans-serif' },
  { label: 'Playfair Display (Classic Serif)', value: "'Playfair Display', serif" },
  { label: 'Monospace (Code Style)', value: 'monospace' },
  { label: 'Cursive (Signature Style)', value: 'cursive' }
];

export interface PosterTemplateInfo {
  id?: number;
  version: string;
  image_url: string;
  config: Record<string, any>;
  configured?: boolean;
}

export function usePosterGenerator() {
  const [templates, setTemplates] = useState<Record<string, PosterTemplateInfo>>({});
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);
  const [template, setTemplate] = useState<any>(null);
  const [loadingPosterId, setLoadingPosterId] = useState<number | string | null>(null);

  const fetchTemplate = useCallback(async () => {
    try {
      const res = await api.get('/fest/public/poster-templates');
      if (res.data && res.data.templates) {
        setTemplates(res.data.templates);
        const avail = res.data.available_versions || Object.keys(res.data.templates).filter((k: string) => res.data.templates[k].configured);
        setAvailableVersions(avail);
        const def = res.data.templates['v1'] || (avail.length > 0 ? res.data.templates[avail[0]] : null);
        if (def && def.configured && def.image_url) {
          setTemplate(def);
        }
      } else {
        const single = await api.get('/fest/public/poster-template');
        if (single.data && single.data.configured && single.data.image_url) {
          setTemplate(single.data);
          setTemplates({ v1: single.data });
          setAvailableVersions(['v1']);
        }
      }
    } catch {
      // Ignore if no template exists
    }
  }, []);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const renderPoster = async (data: EventPosterData, version: string = 'v1'): Promise<RenderedPoster | null> => {
    const activeTmpl = templates[version] || (version === 'v1' ? template : null) || template;
    if (!activeTmpl || !activeTmpl.image_url) {
      alert(`No poster template configured for ${version.toUpperCase()} in Admin page.`);
      return null;
    }

    try {
      // Wait for custom Google Fonts to be ready
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // ignore font readiness error
        }
      }

      const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
      const imageUrl = activeTmpl.image_url.startsWith('http') ? activeTmpl.image_url : `${apiBase}${activeTmpl.image_url}`;

      // Fetch as blob to prevent canvas taint issues
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`Failed to load poster background image (${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        throw new Error('Canvas 2D context not supported');
      }

      // Draw background image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);

      // Extract 1st, 2nd, and 3rd winners from data
      const sortedWinners = (data.results || [])
        .filter((r: any) => r.position <= 3)
        .sort((a: any, b: any) => a.position - b.position);

      const first = data.first_place || sortedWinners.find((r: any) => r.position === 1) || 
        (data.position === 1 ? { student_name: data.student_name || '', team_name: data.team_name || '' } : 
        (!sortedWinners.length && data.student_name ? { student_name: data.student_name, team_name: data.team_name || '' } : sortedWinners[0]));
      
      const second = data.second_place || sortedWinners.find((r: any) => r.position === 2) || 
        (data.position === 2 ? { student_name: data.student_name || '', team_name: data.team_name || '' } : sortedWinners[1]);
      
      const third = data.third_place || sortedWinners.find((r: any) => r.position === 3) || 
        (data.position === 3 ? { student_name: data.student_name || '', team_name: data.team_name || '' } : sortedWinners[2]);

      const seqNumber = data.sequence_number !== undefined && data.sequence_number !== null ? String(data.sequence_number) : '';
      const cleanString = (val?: string) => (val || '').trim();
      const cleanTitle = (val?: string) => (val || '').replace(/^[▶►>•\s\-_–—:]+/, '').trim();
      const cleanCategory = (val?: string) => (val || '').replace(/^[▶►>•\s\-_–—:]+/, '').trim();

      // Check whether this event is a group event
      const isGroup = Boolean(
        data.is_group || 
        (first as any)?.is_group || 
        (second as any)?.is_group || 
        (third as any)?.is_group || 
        data.results?.some((r: any) => r.is_group)
      );

      const getWinnerDisplayName = (w?: any) => {
        if (!w) return '';
        if (isGroup) {
          return cleanString(w.team_name || w.student_name);
        }
        return cleanString(w.student_name);
      };

      const getWinnerTeamDisplay = (w?: any) => {
        if (!w) return '';
        if (isGroup) {
          // For group events, the team name is already shown as the primary winner name
          return '';
        }
        return cleanString(w.team_name);
      };

      const dataMapping: Record<string, string> = {
        // Event details - guaranteed constant left margin without prefixes or spaces
        category: cleanCategory(data.category),
        program_title: cleanTitle(data.program_title),
        result_number: cleanString(seqNumber),
        event_number: cleanString(seqNumber),

        // 1st Place
        first_place_pos: first ? '1' : '',
        first_place_name: getWinnerDisplayName(first),
        first_place_team: getWinnerTeamDisplay(first),
        // legacy aliases:
        student_name: getWinnerDisplayName(first),
        team_name: getWinnerTeamDisplay(first),
        position: first ? '1' : '',

        // 2nd Place
        second_place_pos: second ? '2' : '',
        second_place_name: getWinnerDisplayName(second),
        second_place_team: getWinnerTeamDisplay(second),

        // 3rd Place
        third_place_pos: third ? '3' : '',
        third_place_name: getWinnerDisplayName(third),
        third_place_team: getWinnerTeamDisplay(third),
      };

      const config = activeTmpl.config || {};

      // Draw configured fields exactly as admin positioned them with constant left margin
      Object.entries(config).forEach(([key, settings]: [string, any]) => {
        if (!settings || settings.visible === false || !dataMapping[key]) return;

        const text = String(dataMapping[key]).trim();
        if (!text) return;

        const fontSize = settings.fontSize || 40;
        const isBold = settings.fontWeight === 'bold' || settings.bold === true || (settings.fontWeight !== 'normal' && settings.bold !== false);
        const weight = isBold ? 'bold' : 'normal';
        const fontFamily = settings.fontFamily || 'Inter, sans-serif';

        ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = settings.color || '#000000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Subtle drop shadow matching Admin preview
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        // X coordinate is strictly constant starting from the left
        ctx.fillText(text, settings.x, settings.y);
      });

      const vTag = version ? `_${version}` : '';
      const fileName = `${(data.program_title || 'Event').replace(/[^a-zA-Z0-9_-]/g, '_')}_${(data.category || '').replace(/[^a-zA-Z0-9_-]/g, '_')}${vTag}_Result_Poster.png`;

      return await new Promise<RenderedPoster | null>((resolve) => {
        canvas.toBlob((outBlob) => {
          if (!outBlob) {
            resolve(null);
            return;
          }
          const file = new File([outBlob], fileName, { type: 'image/png' });
          const dataUrl = canvas.toDataURL('image/png');
          resolve({ dataUrl, blob: outBlob, file, fileName });
        }, 'image/png');
      });

    } catch (err: any) {
      console.error('Failed to render poster:', err);
      alert(`Failed to generate poster: ${err.message || 'Unknown error'}`);
      return null;
    }
  };

  const generatePoster = async (data: EventPosterData, version: string = 'v1') => {
    const posterKey = `${data.id || data.program_title}-${version}`;
    setLoadingPosterId(posterKey);
    try {
      const rendered = await renderPoster(data, version);
      if (!rendered) return;

      const a = document.createElement('a');
      a.href = rendered.dataUrl;
      a.download = rendered.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setLoadingPosterId(null);
    }
  };

  return {
    generatePoster,
    renderPoster,
    loadingPosterId,
    hasTemplate: !!(template && template.image_url) || availableVersions.length > 0,
    template,
    templates,
    availableVersions,
    allVersions: ['v1', 'v2', 'v3'],
    reloadTemplate: fetchTemplate
  };
}
