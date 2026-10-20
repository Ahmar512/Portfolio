import React, { useState } from 'react';
import axios from 'axios';
import { Mail, Send, CheckCircle2, AlertCircle, Sparkles, MessageSquare } from 'lucide-react';

const ContactUs = () => {
  const formInitialDetails = {
    name: "",
    email: "",
    subject: "",
    message: "",
  };
  const [formDetails, setFormDetails] = useState(formInitialDetails);
  const [buttonText, setButtonText] = useState("Send Message");
  const [status, setStatus] = useState({});

  const onFormUpdate = (category, value) => {
    setFormDetails({
      ...formDetails,
      [category]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setButtonText("Sending...");
    try {
      let response = await axios.post("/api/contact", formDetails, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      setButtonText("Send Message");
      setFormDetails(formInitialDetails);
      if (response.data && (response.data.code === 200 || response.status === 200)) {
        setStatus({ success: true, message: "Thank you! Your message has been sent successfully." });
      } else {
        setStatus({ success: false, message: "Something went wrong, please try again or email directly." });
      }
    } catch (e) {
      console.log(e.message);
      setButtonText("Send Message");
      setStatus({ success: false, message: "Message queued! For urgent inquiries, reach out directly via LinkedIn." });
    }
  };

  return (
    <section id="contact_us" className="max-w-4xl mx-auto py-8">
      {/* Section Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill border-sky-400/20 text-sky-300 text-xs font-code mb-3">
          <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
          <span>Let's Build Together</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold font-outfit tracking-tight">
          Get In <span className="text-gradient font-outfit">Touch</span>
        </h2>
        <p className="text-slate-400 font-jakarta text-sm sm:text-base mt-3 max-w-lg mx-auto">
          Whether you have an SDE opportunity, a project proposal, or just want to connect, feel free to drop me a message!
        </p>
      </div>

      {/* Main Glass Form Container */}
      <div data-aos="fade-up" className="glass-card rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
        
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-code text-slate-300 uppercase tracking-wider">Your Name</label>
              <input
                type="text"
                className="input"
                placeholder="John Doe"
                value={formDetails.name}
                onChange={(e) => onFormUpdate("name", e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-code text-slate-300 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="john@example.com"
                value={formDetails.email}
                onChange={(e) => onFormUpdate("email", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-code text-slate-300 uppercase tracking-wider">Subject</label>
            <input
              type="text"
              className="input"
              placeholder="Opportunity / Collaboration Inquiry"
              value={formDetails.subject}
              onChange={(e) => onFormUpdate("subject", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-code text-slate-300 uppercase tracking-wider">Message</label>
            <textarea
              rows={5}
              className="input resize-none"
              placeholder="Hello Ahmar, I reviewed your portfolio and would like to discuss..."
              value={formDetails.message}
              onChange={(e) => onFormUpdate("message", e.target.value)}
              required
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-jakarta font-bold text-base shadow-glow-cyan hover:scale-[1.01] active:scale-95 transition-all duration-300 flex justify-center items-center gap-2 mt-2"
          >
            <Send className="w-5 h-5" />
            <span>{buttonText}</span>
          </button>

          {status.message && (
            <div
              className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-jakarta mt-2 ${
                status.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-300"
              }`}
            >
              {status.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              )}
              <span>{status.message}</span>
            </div>
          )}
        </form>

      </div>
    </section>
  );
};

export default ContactUs;