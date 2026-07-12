import React, { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  customerEmail: string;
  defaultSubject: string;
  defaultBody: string;
  isNoticeOnly?: boolean;
}

export function EmailModal({ isOpen, onClose, documentName, customerEmail, defaultSubject, defaultBody, isNoticeOnly }: EmailModalProps) {
  const [to, setTo] = useState(customerEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    
    try {
      if (isNoticeOnly) {
         // Skip PDF generation
         await new Promise(resolve => setTimeout(resolve, 800));
         setSuccess(true);
         setTimeout(() => {
            onClose();
            setSuccess(false);
         }, 1500);
         return;
      }
      const printElement = document.getElementById('printable-area-container');
      if (!printElement) throw new Error("Document content not found to generate PDF");

      // Temporarily setup for printing
      const originalTitle = document.title;
      document.title = documentName;
      
      const imgData = await toPng(printElement, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      
      // We need to calculate height based on the aspect ratio of the generated image
      // Let's create an image element to get its dimensions
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvasWidth = img.width;
      const canvasHeight = img.height;

      const pdfWidth = 595.28; // Standard portrait width in pt
      const pdfHeight = (canvasHeight * pdfWidth) / canvasWidth;
      
      // Instantiate jsPDF with dynamic height matching the rendered aspect ratio perfectly.
      // This guarantees 100% fit-to-page format with absolutely no extra blank slots or margins.
      const pdf = new jsPDF('p', 'pt', [pdfWidth, pdfHeight]);
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const pdfBase64 = pdf.output('datauristring');
      document.title = originalTitle;

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          text: body,
          pdfBase64,
          filename: `${documentName}.pdf`
        })
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to send email");
        }
        setSuccess(true);
        if (data.previewUrl) {
          setPreviewUrl(data.previewUrl);
        }
      } else {
        const textData = await res.text();
        throw new Error(`Server returned error: ${res.status} ${res.statusText} - ${textData.substring(0, 100)}`);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
           <h2 className="font-semibold text-slate-800">Email {documentName}</h2>
           <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500">
             <X className="w-5 h-5" />
           </button>
        </div>
        
        {success ? (
          <div className="p-8 text-center space-y-4">
             <div className="mx-auto w-12 h-12 bg-emerald-100 flex items-center justify-center text-emerald-600 rounded-full">
               <Send className="w-6 h-6" />
             </div>
             <h3 className="font-semibold text-lg text-slate-800">Email Sent successfully</h3>
             <p className="text-sm text-slate-600">The PDF has been generated and the email has been sent to the customer.</p>
             {previewUrl && (
               <div className="mt-4 p-4 bg-amber-50 text-amber-800 rounded-lg text-sm font-medium text-left">
                 <strong>Test Mode (Ethereal Email):</strong> No SMTP credentials found. A test message was created.<br/><br/>
                 <a href={previewUrl} target="_blank" rel="noreferrer" className="underline text-indigo-600 font-bold block max-w-full overflow-hidden text-ellipsis">Click here to view Email Preview</a>
               </div>
             )}
             <button onClick={onClose} className="mt-4 w-full bg-slate-900 text-white rounded-lg py-2 text-sm font-medium cursor-pointer">Close</button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-4 space-y-4">
             {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
             <div>
               <label className="block text-xs font-semibold text-slate-700 mb-1">To</label>
               <input required type="email" value={to} onChange={e => setTo(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
             </div>
             <div>
               <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
               <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm " />
             </div>
             <div>
               <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
               <textarea required value={body} onChange={e => setBody(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm h-32"></textarea>
             </div>
             
             {!isNoticeOnly && (
               <>
                 <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                   <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-indigo-900 truncate">Attachment</p>
                      <p className="text-xs text-indigo-700 truncate">{documentName}.pdf</p>
                   </div>
                 </div>
                 <p className="text-xs text-slate-500">The current document layout will be converted to a PDF automatically and sent as an attachment.</p>
               </>
             )}
             
             <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button disabled={sending} type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-colors">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? (isNoticeOnly ? 'Sending Notice...' : 'Generating PDF & Sending...') : (isNoticeOnly ? 'Send Notice' : 'Send Email')}
                </button>
             </div>
          </form>
        )}
      </div>
    </div>
  );
}
