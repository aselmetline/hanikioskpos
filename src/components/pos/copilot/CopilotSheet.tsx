import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StagedIngestionCard, type StagedPreview } from './StagedIngestionCard';

type Msg = { role: 'user' | 'assistant'; content: string; previews?: StagedPreview[] };

const SUGGESTIONS = ['ملخص أداء اليوم', 'صافي الربح هذا الشهر مقارنة بالشهر الماضي', 'رصيد الكاسة', 'منتجات قاربت على النفاد', 'ديون الموردين'];

export function CopilotSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = async (text: string) => {
    const content = text.trim().slice(0, 12000);
    if (!content || loading) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setInput('');
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('store-copilot', {
      body: { messages: next.slice(-20).map(({ role, content }) => ({ role, content })) },
    });
    setLoading(false);
    let errMsg: string | null = null;
    if (error) {
      try { errMsg = (await (error as { context?: Response }).context?.json())?.error ?? null; } catch { /* ignore */ }
      errMsg = errMsg ?? 'تعذّر الاتصال بالمساعد';
    }
    setMessages([...next, errMsg
      ? { role: 'assistant', content: `⚠️ ${errMsg}` }
      : { role: 'assistant', content: data.reply, previews: data.previews }]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" dir="rtl" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> مساعد المدير الذكي</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">اسألني عن المبيعات والأرباح والمخزون، أو الصق قائمة بضاعة لإضافتها.</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => <Button key={s} size="sm" variant="outline" onClick={() => send(s)}>{s}</Button>)}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-start' : 'space-y-2'}>
              <div className={`rounded-2xl px-3 py-2 text-sm max-w-[90%] ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary prose prose-sm max-w-none'}`}>
                {m.role === 'user' ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
              </div>
              {m.previews?.map((p) => <StagedIngestionCard key={p.preview_id} preview={p} />)}
            </div>
          ))}
          {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> جاري التفكير...</div>}
          <div ref={endRef} />
        </div>
        <form className="p-3 border-t border-border flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب سؤالك أو الصق قائمة..." rows={2} className="resize-none"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }} />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="إرسال"><Send className="w-4 h-4" /></Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
