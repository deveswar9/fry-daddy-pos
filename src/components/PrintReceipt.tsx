import React from 'react';
import { OrderItem } from '@/firebase/services';

export interface PrintReceiptProps {
  tableName: string;
  orderId?: string;
  counterName: string;
  items: OrderItem[];
  grandTotal: number;
  paymentStatus: string;
  createdAt?: number | string;
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({
  tableName,
  orderId,
  counterName,
  items,
  grandTotal,
  paymentStatus,
  createdAt
}) => {
  const formattedDate = createdAt
    ? new Date(typeof createdAt === 'number' ? createdAt : Date.parse(createdAt as string)).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const restaurantItems = items.filter((i) => i.kitchen === 'Restaurant');
  const fastFoodItems = items.filter((i) => i.kitchen === 'Fast Food');
  const hasMultipleKitchens = restaurantItems.length > 0 && fastFoodItems.length > 0;

  const displayCounterName = counterName
    .replace(/\s*B[12]$/i, '')
    .trim()
    .toUpperCase();

  const displayStatus = (paymentStatus === 'Unpaid' || !paymentStatus ? 'PAID' : paymentStatus).toUpperCase();

  return (
    <div id="printable-receipt-root" className="hidden print:block print:w-[78mm] print:m-0 print:p-2 text-black bg-white font-mono text-[11px] leading-tight">
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-receipt-root, #printable-receipt-root * {
            visibility: visible !important;
          }
          #printable-receipt-root {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 78mm !important;
            padding: 4mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Receipt Header */}
      <div className="text-center mb-3">
        <h1 className="text-base font-black uppercase tracking-wider mb-0.5">FRY DADDY</h1>
        <p className="text-[10px] font-semibold uppercase">{displayCounterName}</p>
        <div className="border-b border-black border-dashed my-2" />
      </div>

      {/* Order Meta Info */}
      <div className="mb-3 text-[10px] space-y-1">
        <div className="flex justify-between">
          <span>Date/Time:</span>
          <span>{formattedDate}</span>
        </div>
        <div className="flex justify-between">
          <span>Table:</span>
          <span className="font-bold">{tableName}</span>
        </div>
        {orderId && (
          <div className="flex justify-between">
            <span>Bill Ref:</span>
            <span>#{orderId.slice(-6).toUpperCase()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Status:</span>
          <span className="font-bold uppercase">{displayStatus}</span>
        </div>
      </div>

      <div className="border-b border-black border-dashed my-2" />

      {/* Items Table */}
      <div className="mb-3">
        <div className="flex justify-between font-bold border-b border-black pb-1 mb-1 text-[10px]">
          <span className="w-1/2">ITEM</span>
          <span className="w-1/6 text-center">QTY</span>
          <span className="w-1/3 text-right">AMT</span>
        </div>

        {hasMultipleKitchens ? (
          <>
            {restaurantItems.length > 0 && (
              <div className="mb-2">
                <div className="font-bold text-[9px] uppercase tracking-wide border-b border-gray-300 pb-0.5 mb-1">
                  --- Restaurant Items ---
                </div>
                {restaurantItems.map((item) => (
                  <div key={item.id} className="flex justify-between py-0.5 text-[10px]">
                    <span className="w-1/2 truncate pr-1">{item.itemName}</span>
                    <span className="w-1/6 text-center">x{item.quantity}</span>
                    <span className="w-1/3 text-right">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            )}

            {fastFoodItems.length > 0 && (
              <div className="mb-2">
                <div className="font-bold text-[9px] uppercase tracking-wide border-b border-gray-300 pb-0.5 mb-1">
                  --- Fast Food Items ---
                </div>
                {fastFoodItems.map((item) => (
                  <div key={item.id} className="flex justify-between py-0.5 text-[10px]">
                    <span className="w-1/2 truncate pr-1">{item.itemName}</span>
                    <span className="w-1/6 text-center">x{item.quantity}</span>
                    <span className="w-1/3 text-right">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex justify-between py-0.5 text-[10px]">
              <span className="w-1/2 truncate pr-1">{item.itemName}</span>
              <span className="w-1/6 text-center">x{item.quantity}</span>
              <span className="w-1/3 text-right">₹{item.price * item.quantity}</span>
            </div>
          ))
        )}
      </div>

      <div className="border-b border-black border-dashed my-2" />

      {/* Totals */}
      <div className="space-y-1 text-[11px] mb-3">
        <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
          <span>GRAND TOTAL:</span>
          <span>₹{grandTotal}</span>
        </div>
      </div>

      <div className="border-b border-black border-dashed my-2" />

      {/* Footer */}
      <div className="text-center text-[9px] space-y-1 mt-3">
        <p className="font-bold">Thank you for visiting Fry Daddy!</p>
        <p>Please visit us again.</p>
      </div>
    </div>
  );
};
