"use client";

export default function WorkflowsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Workflows</h2>
          <p className="subtitle">Automations that run on your leads.</p>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3 className="panel-title">
            Active
            <span className="badge status-won">Live</span>
          </h3>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>New Lead Follow-up Reminder</div>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
            Any lead still marked <strong>New</strong> after 48 hours is automatically surfaced in the
            &quot;Needs Attention&quot; panel on the Dashboard, so nothing sits untouched.
          </p>
        </div>

        <div className="card">
          <h3 className="panel-title">
            Active
            <span className="badge status-won">Live</span>
          </h3>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>Website Lead Capture</div>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
            Every form submission on dspermitting.com is pushed here in real time and logged in the Inbox,
            with no manual entry needed.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 className="panel-title">
          Not set up yet
          <span className="badge" style={{ background: "var(--border-soft)", color: "var(--muted)" }}>Planned</span>
        </h3>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 0 }}>
          Things like auto-reminder texts, SMS/email drip sequences, or auto-assigning leads to team members
          need a messaging provider (SMS/email) connected first. Let your developer know which one you want
          to use and these can be added here.
        </p>
      </div>
    </div>
  );
}
