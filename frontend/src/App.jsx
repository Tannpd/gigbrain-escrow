import React, { useState, useEffect } from 'react';
import { 
  useGigBrain, 
  formatGen 
} from './useGigBrain';
import { 
  Briefcase, 
  Send, 
  Coins, 
  Lock, 
  User, 
  ExternalLink, 
  FileText, 
  Sparkles, 
  RefreshCw, 
  Code
} from 'lucide-react';

function App() {
  const {
    address,
    escrows,
    contractBalance,
    loading,
    error,
    txHash,
    txStatus,
    connectWallet,
    fetchEscrowsState,
    createEscrow,
    releaseEscrow,
    submitDelivery,
    contractAddress
  } = useGigBrain();

  // Selected Escrow index
  const [selectedEscrowId, setSelectedEscrowId] = useState(null);

  // Form states
  const [newFreelancer, setNewFreelancer] = useState('');
  const [newBriefUrl, setNewBriefUrl] = useState('');
  const [newAmount, setNewAmount] = useState('10');

  const [deliveryUrl, setDeliveryUrl] = useState('');

  // Selected Escrow object helper
  const selectedEscrow = escrows.find(e => Number(e.id) === selectedEscrowId) || escrows[0];

  useEffect(() => {
    if (escrows.length > 0 && selectedEscrowId === null) {
      setSelectedEscrowId(Number(escrows[0].id));
    }
  }, [escrows, selectedEscrowId]);

  const handleCreateEscrow = async (e) => {
    e.preventDefault();
    if (!newFreelancer || !newBriefUrl || !newAmount) return;
    try {
      await createEscrow(newFreelancer, newBriefUrl, newAmount);
      // reset form
      setNewFreelancer('');
      setNewBriefUrl('');
      setNewAmount('10');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitDelivery = async (e) => {
    e.preventDefault();
    if (!selectedEscrow || !deliveryUrl) return;
    try {
      await submitDelivery(selectedEscrow.id, deliveryUrl);
      setDeliveryUrl('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleReleaseEscrow = async () => {
    if (!selectedEscrow) return;
    try {
      await releaseEscrow(selectedEscrow.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper for computing dashoffset of circular progress
  const score = selectedEscrow ? Number(selectedEscrow.alignment_score) : 0;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="studio-grid">
      
      {/* Top Header Navigation */}
      <header className="studio-header">
        <div className="header-brand">
          <div className="brand-logo">GB</div>
          <div className="header-title-wrapper">
            <h1 className="header-title">
              GigBrain Escrow <span className="header-tag">Arbitrator</span>
            </h1>
            <p className="header-subtitle">Decentralized Creative Freelance Protection</p>
          </div>
        </div>

        {/* Contract Address & Network Status */}
        <div className="header-meta">
          <div className="meta-badge">
            <span className="pulse-light" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--yellow)', display: 'inline-block' }} />
            <span>StudioNet Contract:</span>
            <strong>
              {contractAddress ? `${contractAddress.slice(0, 8)}...${contractAddress.slice(-6)}` : 'Not Configured'}
            </strong>
          </div>

          <div className="meta-badge">
            <Coins style={{ width: '14px', height: '14px', color: 'var(--yellow)' }} />
            <span>Escrow Pool:</span>
            <strong>{formatGen(contractBalance)} GEN</strong>
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="wallet-btn-container">
          {address ? (
            <div className="wallet-badge">
              <User style={{ width: '12px', height: '12px', color: 'var(--magenta)' }} />
              <span>
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </div>
          ) : (
            <button 
              onClick={connectWallet}
              className="studio-btn btn-primary wallet-btn"
            >
              <Sparkles style={{ width: '14px', height: '14px' }} />
              Connect Studio Wallet
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Canvas Layout */}
      <main className="canvas-container">
        
        {/* PANEL 1: THE BRIEF PANEL (Left) */}
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title brief-color">
              <Briefcase style={{ width: '16px', height: '16px' }} /> The Brief Room
            </span>
            <span className="form-hint font-mono">Create & Lock</span>
          </div>

          <div className="panel-content">
            
            {/* Create Escrow Form */}
            <div className="studio-card card-primary">
              <h3 className="card-title">
                <Lock style={{ width: '14px', height: '14px', color: 'var(--magenta)' }} /> Lock Creative Escrow
              </h3>
              
              <form onSubmit={handleCreateEscrow} className="studio-form">
                <div className="studio-input-group">
                  <label className="studio-label">Freelancer Address</label>
                  <input 
                    type="text" 
                    placeholder="0x..." 
                    className="studio-input"
                    value={newFreelancer}
                    onChange={e => setNewFreelancer(e.target.value)}
                    required
                  />
                </div>

                <div className="studio-input-group">
                  <label className="studio-label">Creative Brief URL</label>
                  <input 
                    type="url" 
                    placeholder="https://document-url/creative-brief" 
                    className="studio-input"
                    value={newBriefUrl}
                    onChange={e => setNewBriefUrl(e.target.value)}
                    required
                  />
                </div>

                <div className="studio-input-group">
                  <label className="studio-label">Escrow Lock Amount (GEN)</label>
                  <div className="studio-input-wrapper">
                    <input 
                      type="number" 
                      step="any"
                      placeholder="10" 
                      className="studio-input pr-12"
                      value={newAmount}
                      onChange={e => setNewAmount(e.target.value)}
                      required
                    />
                    <span className="input-tag">GEN</span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !address}
                  className={`studio-btn ${(loading || !address) ? 'btn-disabled' : 'btn-primary'}`}
                >
                  {loading ? 'Processing...' : 'Lock Funds & Register Brief'}
                </button>
              </form>
            </div>

            {/* Selected Escrow Brief Details */}
            {selectedEscrow ? (
              <div className="studio-card card-dark">
                <div className="card-header-row">
                  <h4 className="card-title" style={{ color: 'var(--yellow)', margin: 0 }}>
                    Escrow #{selectedEscrow.id} Specs
                  </h4>
                  <span className={`status-badge ${
                    selectedEscrow.status === 'APPROVED' ? 'badge-approved' :
                    selectedEscrow.status === 'REJECTED' ? 'badge-rejected' :
                    selectedEscrow.status === 'ACTIVE' ? 'badge-active' : 'badge-failed'
                  }`}>
                    {selectedEscrow.status}
                  </span>
                </div>

                <div className="spec-list">
                  <div className="spec-item">
                    <span>Client:</span>
                    <span>{selectedEscrow.client.slice(0, 12)}...{selectedEscrow.client.slice(-4)}</span>
                  </div>
                  <div className="spec-item">
                    <span>Freelancer:</span>
                    <span>{selectedEscrow.freelancer.slice(0, 12)}...{selectedEscrow.freelancer.slice(-4)}</span>
                  </div>
                  <div className="spec-item">
                    <span>Locked Pool:</span>
                    <span style={{ color: 'var(--yellow)', fontWeight: 'bold' }}>
                      {formatGen(selectedEscrow.amount)} GEN
                    </span>
                  </div>
                </div>

                <div className="spec-link-wrapper">
                  <span className="studio-label">Brief Source Link</span>
                  <a 
                    href={selectedEscrow.brief_url} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ textDecoration: 'none', display: 'flex', gap: '4px', alignItems: 'center', marginTop: '6px', fontSize: '0.75rem', color: 'var(--cyan)', wordBreak: 'break-all' }}
                  >
                    <ExternalLink style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                    {selectedEscrow.brief_url}
                  </a>
                </div>
              </div>
            ) : (
              <div className="ledger-empty">
                No active escrows. Initialize one above.
              </div>
            )}
          </div>
        </section>

        {/* PANEL 2: THE DIRECTOR'S DESK (Center) */}
        <section className="panel" style={{ backgroundColor: '#151518' }}>
          <div className="panel-header" style={{ backgroundColor: '#111113' }}>
            <span className="panel-title director-color">
              <Sparkles style={{ width: '16px', height: '16px' }} /> AI Director Desk
            </span>
            <span className="form-hint font-mono">Arbitrator HUD</span>
          </div>

          <div className="panel-content">
            
            {/* Circular Alignment Meter */}
            <div className="alignment-meter-container">
              <div className="circular-meter">
                <svg>
                  <defs>
                    <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--magenta)" />
                      <stop offset="50%" stopColor="var(--yellow)" />
                      <stop offset="100%" stopColor="var(--cyan)" />
                    </linearGradient>
                  </defs>
                  <circle className="bg-circle" cx="90" cy="90" r={radius} />
                  <circle 
                    className="progress-circle" 
                    cx="90" 
                    cy="90" 
                    r={radius} 
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="meter-value">
                  <span className="meter-score">{score}%</span>
                  <span className="meter-lbl">Alignment</span>
                </div>
              </div>
            </div>

            {/* Verdict Stamps */}
            {selectedEscrow && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {selectedEscrow.status === 'APPROVED' && (
                  <div className="stamp stamp-approved">
                    [ BRIEF FULFILLED - PAYMENT FORCED ]
                  </div>
                )}
                {selectedEscrow.status === 'REJECTED' && (
                  <div className="stamp stamp-rejected">
                    [ CRITIQUE FAILED - FUNDS REFUNDED ]
                  </div>
                )}
                {selectedEscrow.status === 'ACTIVE' && (
                  <div style={{ border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: '#121215' }}>
                    Awaiting freelancer submission. Payout locked.
                  </div>
                )}
              </div>
            )}

            {/* Critique Feedback log */}
            {selectedEscrow ? (
              <div className="critique-box">
                <h4 className="critique-title flex-items-center">
                  <Code style={{ width: '14px', height: '14px', marginRight: '6px', verticalAlign: 'middle' }} /> Creative Director Critique:
                </h4>
                <p style={{ marginTop: '8px' }}>
                  {selectedEscrow.director_feedback || 'No review generated yet.'}
                </p>
              </div>
            ) : (
              <div className="critique-box" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                Awaiting project contract data
              </div>
            )}

            {/* Transaction Telemetry Status log */}
            {(txStatus || error) && (
              <div className="telemetry-box">
                <div className="telemetry-header">
                  <span>TELEMETRY FEED</span>
                  {loading && <RefreshCw className="spin" style={{ width: '12px', height: '12px', color: 'var(--cyan)' }} />}
                </div>
                {txStatus && <p className="telemetry-log">{txStatus}</p>}
                {error && <p className="telemetry-log telemetry-error">{error}</p>}
                {txHash && (
                  <div className="telemetry-tx">
                    <span>TX HASH:</span>
                    <a 
                      href={`https://studio.genlayer.com/explorer/transaction/${txHash}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="telemetry-link"
                    >
                      {txHash.slice(0, 16)}...
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* PANEL 3: THE DELIVERY DOCK (Right) */}
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title delivery-color">
              <Send style={{ width: '16px', height: '16px' }} /> Delivery Dock & Ledger
            </span>
            <span className="form-hint font-mono font-bold">Submit & Arbitrate</span>
          </div>

          <div className="panel-content">
            
            {/* Freelancer Delivery Submission Form */}
            {selectedEscrow && selectedEscrow.status === 'ACTIVE' && (
              <div className="studio-card card-primary">
                <h3 className="card-title">
                  <FileText style={{ width: '14px', height: '14px', color: 'var(--cyan)' }} /> Submit Completed Work
                </h3>

                <form onSubmit={handleSubmitDelivery} className="studio-form">
                  <div className="studio-input-group">
                    <label className="studio-label">Delivery URL (Figma/GitHub/Drive)</label>
                    <input 
                      type="url" 
                      placeholder="https://github.com/my-freelance-work" 
                      className="studio-input"
                      value={deliveryUrl}
                      onChange={e => setDeliveryUrl(e.target.value)}
                      required
                    />
                    <p className="form-hint" style={{ marginTop: '4px' }}>
                      Note: AI will cross-reference this delivery link against the client's brief link.
                    </p>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading || !address}
                    className={`studio-btn ${(loading || !address) ? 'btn-disabled' : 'btn-primary'}`}
                  >
                    {loading ? 'Submitting & Evaluating...' : 'Submit Delivery'}
                  </button>
                </form>

                {/* Manual Release Override (For Clients) */}
                {address && address.toLowerCase() === selectedEscrow.client.toLowerCase() && (
                  <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '16px', paddingTop: '16px' }}>
                    <p className="form-hint" style={{ marginBottom: '8px' }}>
                      Client Option: Skip AI arbitration and pay immediately.
                    </p>
                    <button 
                      onClick={handleReleaseEscrow}
                      className="studio-btn btn-secondary"
                      disabled={loading}
                    >
                      Manually Release Funds
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Display Completed Delivery Specs */}
            {selectedEscrow && selectedEscrow.delivery_url && (
              <div className="studio-card card-dark" style={{ gap: '8px' }}>
                <h4 className="card-title" style={{ color: 'var(--cyan)', margin: 0 }}>
                  Submitted Delivery Source
                </h4>
                <a 
                  href={selectedEscrow.delivery_url} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ textDecoration: 'none', display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.75rem', color: 'var(--magenta)', wordBreak: 'break-all' }}
                >
                  <ExternalLink style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                  {selectedEscrow.delivery_url}
                </a>
              </div>
            )}

            {/* Escrows Ledger */}
            <div className="ledger-section">
              <div className="ledger-header">
                <h3 className="ledger-header-title">Escrow Ledger</h3>
                <button 
                  onClick={fetchEscrowsState} 
                  disabled={loading}
                  className="ledger-reload-btn"
                  title="Reload Ledger"
                >
                  <RefreshCw className={loading ? 'spin' : ''} style={{ width: '14px', height: '14px' }} />
                </button>
              </div>

              <div className="ledger-list">
                {escrows.map((escrow) => (
                  <div 
                    key={escrow.id}
                    onClick={() => setSelectedEscrowId(Number(escrow.id))}
                    className={`ledger-card ${selectedEscrowId === Number(escrow.id) ? 'active' : ''}`}
                  >
                    <div className="ledger-card-header">
                      <span className="ledger-card-id">Escrow #{escrow.id}</span>
                      <span className={`status-badge ${
                        escrow.status === 'APPROVED' ? 'badge-approved' :
                        escrow.status === 'REJECTED' ? 'badge-rejected' :
                        escrow.status === 'ACTIVE' ? 'badge-active' : 'badge-failed'
                      }`}>
                        {escrow.status}
                      </span>
                    </div>

                    <div className="ledger-card-details">
                      <span>Freelancer: {escrow.freelancer.slice(0, 6)}...{escrow.freelancer.slice(-4)}</span>
                      <span className="amount-value">{formatGen(escrow.amount)} GEN</span>
                    </div>
                  </div>
                ))}

                {escrows.length === 0 && (
                  <div className="ledger-empty">
                    No records found.
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Footer Info */}
      <footer className="studio-footer">
        <span>© 2026 GigBrain Escrow Inc.</span>
        <span>Built with GenLayer Intelligent Arbitrator Core</span>
      </footer>
    </div>
  );
}

export default App;
