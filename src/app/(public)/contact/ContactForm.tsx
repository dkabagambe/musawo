'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.message || (!form.email && !form.phone)) {
      setErrorMsg('Please fill in your name, a contact method, and your message.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email || `noreply+${Date.now()}@mtc.ac.ug`,
          subject: form.subject || 'Enquiry',
          message: form.message,
        }),
      });
      if (!res.ok) { setStatus('error'); setErrorMsg('Failed to send. Please try WhatsApp instead.'); return; }
      setStatus('sent');
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try WhatsApp instead.');
    }
  }

  if (status === 'sent') {
    return (
      <div className="card text-center py-12">
        <p className="text-4xl mb-4" aria-hidden="true">✅</p>
        <h3 className="font-bold text-primary text-lg mb-2">Message received!</h3>
        <p className="text-gray-500 text-sm mb-2">We&apos;ll get back to you within one business day.</p>
        <p className="text-gray-400 text-xs">For urgent matters, WhatsApp is fastest.</p>
        <button
          onClick={() => { setForm({ name: '', email: '', phone: '', subject: '', message: '' }); setStatus('idle'); }}
          className="mt-6 text-accent text-sm underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card space-y-4">
      {errorMsg && (
        <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-3">
          {errorMsg}
        </div>
      )}

      <div>
        <label htmlFor="contact-name" className="label">Full name <span className="text-danger">*</span></label>
        <input
          id="contact-name" name="name" type="text" required autoComplete="name"
          value={form.name} onChange={handleChange} className="input" placeholder="Jane Nakato"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-email" className="label">Email</label>
          <input
            id="contact-email" name="email" type="email" autoComplete="email"
            value={form.email} onChange={handleChange} className="input" placeholder="jane@example.com"
          />
        </div>
        <div>
          <label htmlFor="contact-phone" className="label">Phone</label>
          <input
            id="contact-phone" name="phone" type="tel" autoComplete="tel"
            value={form.phone} onChange={handleChange} className="input" placeholder="+256 700 000000"
          />
        </div>
      </div>

      <p className="text-xs text-gray-400 -mt-2">Provide at least one contact method.</p>

      <div>
        <label htmlFor="contact-subject" className="label">Subject</label>
        <select id="contact-subject" name="subject" value={form.subject} onChange={handleChange} className="input">
          <option value="">Select a topic…</option>
          <option value="course">Course enquiry</option>
          <option value="payment">Payment / fees</option>
          <option value="admissions">Admissions enquiry</option>
          <option value="technical">Technical support</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="contact-message" className="label">Message <span className="text-danger">*</span></label>
        <textarea
          id="contact-message" name="message" required rows={5}
          value={form.message} onChange={handleChange} className="input resize-none"
          placeholder="How can we help you?"
        />
      </div>

      <button type="submit" disabled={status === 'loading'} className="btn-primary w-full">
        {status === 'loading' ? 'Sending…' : 'Send message'}
      </button>

      {/* Response time info box */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 text-xs text-gray-500">
        <span className="font-semibold text-primary">Response time:</span>{' '}
        We typically respond within 1 business day. For urgent enquiries, use WhatsApp.
      </div>
    </form>
  );
}
