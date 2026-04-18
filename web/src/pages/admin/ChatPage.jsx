import { useState, useEffect, useRef } from 'react';
import chatService from '../../services/chatService';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [context, setContext] = useState(null);
  const [sessionId] = useState('chat_' + Date.now());
  const endRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const ctx = await chatService.getContext();
        setContext(ctx);
        setMessages([{
          role: 'assistant',
          content: 'Hola! Soy el asistente virtual de ' + (ctx.business?.business_name || 'su negocio') + '. En que puedo ayudarle? Puedo informarle sobre servicios y precios, ubicacion y sedes, profesionales disponibles u horarios.',
        }]);
      } catch (err) {
        console.error('Error:', err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setSending(true);
    try {
      await chatService.saveMessage(sessionId, 'user', userMsg);
      const response = await chatService.sendMessage(userMsg, context || {}, messages);
      setMessages([...newMessages, { role: 'assistant', content: response }]);
      await chatService.saveMessage(sessionId, 'assistant', response);
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: 'Lo siento, ocurrio un error. Intente de nuevo.' }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQ = [
    'Que servicios ofrecen?',
    'Cuales son sus precios?',
    'Donde estan ubicados?',
    'Como agendo una cita?',
  ];

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-800 font-sora">Chat Inteligente</h1>
          <p className="text-sm text-gray-400 mt-1">Asistente virtual con IA para consultas de clientes</p>
        </div>
        <div className="card overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-teal-600 to-teal-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">AI</div>
                <div>
                  <div className="text-white font-bold text-sm">Asistente AgendaPro</div>
                  <div className="text-teal-100 text-xs flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    En linea
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg, i) => (
                <div key={i} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={'max-w-[80%] rounded-2xl px-4 py-3 ' +
                    (msg.role === 'user'
                      ? 'bg-teal-600 text-white rounded-br-md'
                      : 'bg-white border border-gray-200 text-slate-800 rounded-bl-md shadow-sm')}>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            {messages.length <= 1 && (
              <div className="px-4 py-2 border-t border-gray-100 bg-white">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {quickQ.map((q, i) => (
                    <button key={i} onClick={() => setInput(q)}
                      className="whitespace-nowrap text-xs px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full hover:bg-teal-100 transition-colors font-medium">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="p-4 border-t border-gray-100 bg-white">
              <div className="flex items-end gap-2">
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyPress}
                  placeholder="Escriba su consulta..." rows={1}
                  className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  style={{ maxHeight: '120px' }} />
                <button onClick={handleSend} disabled={!input.trim() || sending}
                  className="w-11 h-11 bg-teal-600 text-white rounded-xl flex items-center justify-center hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
