import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Sparkles, Trash2, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { StagedIngestionCard, type StagedPreview } from './StagedIngestionCard';

type Msg = { role: 'user' | 'assistant'; content: string; previews?: StagedPreview[]; image?: string };

async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL('image/jpeg', 0.82);
}
const STORE_KEY = 'copilot_chat';

export function CopilotSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, dir } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-40).map(({ image, ...m }) => m))); } catch { /* quota */ } }, [messages]);

  const suggestions = ['s1', 's2', 's3', 's4', 's5'].map((k) => t(`copilot.${k}`));

  const send = async (text: string, image?: string) => {
    const content = text.trim().slice(0, 12000);
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content, image }];
    setMessages(next);
    setInput('');
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('store-copilot', {
      body: { messages: next.slice(-20).map(({ role, content }) => ({ role, content })), ...(image ? { image } : {}) },
    });
    setLoading(false);
    let errMsg: string | null = null;
    if (error) {
      try { errMsg = (await (error as { context?: Response }).context?.json())?.error ?? null; } catch { /* ignore */ }
      if (typeof errMsg !== 'string') errMsg = t('copilot.connError');
    }
    setMessages([...next, errMsg
      ? { role: 'assistant', content: `⚠️ ${errMsg}` }
      : { role: 'assistant', content: data.reply, previews: data.previews }]);
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const img = await compressImage(f);
    send(input.trim() || t('copilot.scanPrompt'), img);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={dir === 'rtl' ? 'left' : 'right'} dir={dir} className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <div className="p-4 pe-12 border-b border-border flex items-center justify-between gap-2">
          <SheetTitle className="flex items-center gap-2 text-base"><Sparkles className="w-5 h-5 text-primary" /> {t('copilot.title')}</SheetTitle>
          {messages.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setMessages([])} disabled={loading} title={t('copilot.clear')}>
              <Trash2 className="w-4 h-4" /><span className="text-xs">{t('copilot.clear')}</span>
            </Button>
          )}
        </div>
        <SheetDescription className="sr-only">{t('copilot.intro')}</SheetDescription>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('copilot.intro')}</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => <Button key={s} size="sm" variant="outline" className="h-auto py-1.5 whitespace-normal text-start" onClick={() => send(s)}>{s}</Button>)}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-start' : 'space-y-2'}>
              <div className={`rounded-2xl px-3 py-2 text-sm max-w-[90%] ${m.role === 'user' ? 'bg-primary text-primary-foreground whitespace-pre-wrap' : 'bg-secondary text-secondary-foreground prose prose-sm max-w-none'}`}>
                {m.role === 'user' ? <>{m.image && <img src={m.image} alt="" className="rounded-lg mb-1 max-h-40" />}{m.content}</> : <ReactMarkdown>{m.content}</ReactMarkdown>}
              </div>
              {m.previews?.map((p) => <StagedIngestionCard key={p.preview_id} preview={p} />)}
            </div>
          ))}
          {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> {t('copilot.thinking')}</div>}
          <div ref={endRef} />
        </div>
        <form className="p-3 border-t border-border flex gap-2 items-end" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
          <Button type="button" size="icon" variant="outline" disabled={loading} onClick={() => fileRef.current?.click()} aria-label={t('copilot.scan')} title={t('copilot.scan')}><Camera className="w-4 h-4" /></Button>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('copilot.placeholder')} rows={2} className="resize-none"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }} />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label={t('copilot.send')}><Send className="w-4 h-4 rtl:-scale-x-100" /></Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
