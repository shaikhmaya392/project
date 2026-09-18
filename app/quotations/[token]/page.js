"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QuoteCard from "../../QuoteCard";

export default function QuotationAcceptPage() {
  const { token } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/quotations/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Quotation not found");
        setQuotation(data);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    const res = await fetch(`/api/quotations/${token}`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setQuotation(data);
    setAccepting(false);
  }

  return (
    <div className="qc-page">
      <div className="qc-page-inner">
        {error && <div className="error-banner">{error}</div>}
        {!quotation ? (
          !error && <p style={{ color: "var(--muted)" }}>Loading quotation…</p>
        ) : (
          <QuoteCard
            number={quotation.number}
            status={quotation.status}
            clientName={quotation.client_name}
            clientEmail={quotation.client_email}
            projectDescription={quotation.project_description}
            address={quotation.address}
            services={quotation.services}
            fees={quotation.fees}
            total={quotation.total}
            validUntil={quotation.valid_until}
            createdAt={quotation.created_at}
            acceptedAt={quotation.accepted_at}
            accepting={accepting}
            onAccept={handleAccept}
          />
        )}
      </div>
    </div>
  );
}
