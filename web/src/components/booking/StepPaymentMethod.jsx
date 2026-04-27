import { useState } from 'react';
import { CreditCard, Wallet } from 'lucide-react';

export default function StepPaymentMethod({ amount, onSelect, selectedMethod }) {
  const [method, setMethod] = useState(selectedMethod || null);

  const handleSelect = (paymentMethod) => {
    setMethod(paymentMethod);
    onSelect(paymentMethod);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
          Método de pago
        </h2>
        <p className="text-slate-600 mt-1">
          Total a pagar: <span className="font-semibold text-teal-700">S/ {amount.toFixed(2)}</span>
        </p>
      </div>

      <div className="grid gap-4">
        <button
          type="button"
          onClick={() => handleSelect('yape_plin')}
          className={`relative flex items-start p-6 border-2 rounded-xl transition-all ${
            method === 'yape_plin' ? 'border-teal-600 bg-teal-50' : 'border-slate-200 hover:border-teal-300 bg-white'
          }`}
        >
          <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
            method === 'yape_plin' ? 'bg-teal-600' : 'bg-slate-100'
          }`}>
            <Wallet className={method === 'yape_plin' ? 'text-white' : 'text-slate-600'} size={24} />
          </div>
          <div className="ml-4 flex-1 text-left">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                Yape / Plin
              </p>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                Recomendado
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Paga con transferencia desde tu app. Carga tu comprobante después de transferir.
            </p>
            <p className="text-xs text-teal-700 mt-2 font-medium">
              ✓ Sin comisiones · ✓ Confirmación rápida
            </p>
          </div>
          <div className={`ml-4 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            method === 'yape_plin' ? 'border-teal-600 bg-teal-600' : 'border-slate-300'
          }`}>
            {method === 'yape_plin' && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelect('pay_on_arrival')}
          className={`relative flex items-start p-6 border-2 rounded-xl transition-all ${
            method === 'pay_on_arrival' ? 'border-teal-600 bg-teal-50' : 'border-slate-200 hover:border-teal-300 bg-white'
          }`}
        >
          <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
            method === 'pay_on_arrival' ? 'bg-teal-600' : 'bg-slate-100'
          }`}>
            <CreditCard className={method === 'pay_on_arrival' ? 'text-white' : 'text-slate-600'} size={24} />
          </div>
          <div className="ml-4 flex-1 text-left">
            <p className="font-semibold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              Pagar al llegar
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Reserva ahora y paga al finalizar tu servicio en efectivo o tarjeta.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              💵 Efectivo o tarjeta en el local
            </p>
          </div>
          <div className={`ml-4 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            method === 'pay_on_arrival' ? 'border-teal-600 bg-teal-600' : 'border-slate-300'
          }`}>
            {method === 'pay_on_arrival' && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
          </div>
        </button>
      </div>
    </div>
  );
}
