import React, { useState, useEffect } from 'react';
import { 
  useGigBrain, 
  formatGen 
} from './useGigBrain';
import { 
  Briefcase, 
  Send, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Coins, 
  Lock, 
  User, 
  ExternalLink, 
  FileText, 
  Sparkles, 
  RefreshCw, 
  Code,
  Check,
  ChevronRight
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
    <div className="studio-grid min-h-screen flex flex-col">
      {/* Top Header Navigation */}
      <header className="h-16 border-b border-[#2e2e36] bg-[#18181c] px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-[#ff007f] to-[#00f0ff] flex items-center justify-center font-bold text-black text-sm">
            GB
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-widest text-[#f3f4f6] uppercase flex items-center gap-2">
              GigBrain Escrow <span className="text-[10px] bg-[#ff007f] text-white px-1.5 py-0.5 rounded font-mono">Arbitrator</span>
            </h1>
            <p className="text-[10px] text-gray-400">Decentralized Creative Freelance Protection</p>
          </div>
        </div>

        {/* Contract Address & Network Status */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="bg-[#121214] border border-[#2e2e36] px-3 py-1.5 rounded flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e0ff25] animate-ping" />
            <span className="text-gray-400">StudioNet Contract:</span>
            <span className="font-mono text-[#00f0ff]">
              {contractAddress ? `${contractAddress.slice(0, 8)}...${contractAddress.slice(-6)}` : 'Not Configured'}
            </span>
          </div>

          <div className="bg-[#121214] border border-[#2e2e36] px-3 py-1.5 rounded flex items-center gap-2">
            <Coins className="w-3.5 h-3.5 text-[#e0ff25]" />
            <span className="text-gray-400">Escrow Pool:</span>
            <span className="font-bold text-white">{formatGen(contractBalance)} GEN</span>
          </div>
        </div>

        {/* Wallet Connection */}
        <div>
          {address ? (
            <div className="flex items-center gap-2 bg-[#1f1f23] border border-[#2e2e36] px-4 py-1.5 rounded-full text-xs">
              <User className="w-3 h-3 text-[#ff007f]" />
              <span className="font-mono text-gray-300">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </div>
          ) : (
            <button 
              onClick={connectWallet}
              className="bg-[#00f0ff] hover:bg-[#00d2e0] text-[#0b0c10] px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Connect Studio Wallet
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Canvas Layout */}
      <main className="canvas-container flex-1">
        
        {/* PANEL 1: THE BRIEF PANEL (Left) */}
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title text-[#ff007f]">
              <Briefcase className="w-4 h-4" /> The Brief Room
            </span>
            <span className="text-[10px] text-gray-500 font-mono">Create & Lock</span>
          </div>

          <div className="panel-content space-y-6">
            
            {/* Create Escrow Form */}
            <div className="bg-[#1c1c22] border border-[#2e2e36] p-5 rounded-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 mb-4 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#ff007f]" /> Lock Creative Escrow
              </h3>
              
              <form onSubmit={handleCreateEscrow} className="space-y-4">
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
                  <div className="relative">
                    <input 
                      type="number" 
                      step="any"
                      placeholder="10" 
                      className="studio-input pr-12"
                      value={newAmount}
                      onChange={e => setNewAmount(e.target.value)}
                      required
                    />
                    <span className="absolute right-4 top-3 text-[10px] font-bold text-gray-500 font-mono">GEN</span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !address}
                  className={`studio-btn ${(!address || loading) ? 'btn-disabled' : 'btn-primary'}`}
                >
                  {loading ? 'Processing...' : 'Lock Funds & Register Brief'}
                </button>
              </form>
            </div>

            {/* Selected Escrow Brief Details */}
            {selectedEscrow ? (
              <div className="bg-[#121215] border border-[#2e2e36] p-5 rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#e0ff25]">
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

                <div className="text-xs space-y-2.5 font-mono text-gray-400">
                  <div className="flex justify-between">
                    <span>Client:</span>
                    <span className="text-white text-right">{selectedEscrow.client.slice(0, 10)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Freelancer:</span>
                    <span className="text-white text-right">{selectedEscrow.freelancer.slice(0, 10)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Locked Pool:</span>
                    <span className="text-[#e0ff25] font-bold text-right">
                      {formatGen(selectedEscrow.amount)} GEN
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#2e2e36] pt-3">
                  <span className="studio-label">Brief Source Link</span>
                  <a 
                    href={selectedEscrow.brief_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-[#00f0ff] hover:underline flex items-center gap-1 mt-1 break-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    {selectedEscrow.brief_url}
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-xs">
                No active escrows. Initialize one above.
              </div>
            )}
          </div>
        </section>

        {/* PANEL 2: THE DIRECTOR'S DESK (Center) */}
        <section className="panel bg-[#151518]">
          <div className="panel-header border-b border-[#2e2e36] bg-[#111113]">
            <span className="panel-title text-[#e0ff25]">
              <Sparkles className="w-4 h-4" /> AI Director Desk
            </span>
            <span className="text-[10px] text-gray-500 font-mono">Arbitrator HUD</span>
          </div>

          <div className="panel-content flex flex-col justify-between space-y-6">
            
            {/* Circular Alignment Meter */}
            <div className="alignment-meter-container">
              <div className="circular-meter">
                <svg>
                  <defs>
                    <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff007f" />
                      <stop offset="50%" stopColor="#e0ff25" />
                      <stop offset="100%" stopColor="#00f0ff" />
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
              <div className="flex flex-col items-center">
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
                  <div className="border border-[#2e2e36] px-4 py-2 rounded text-xs font-mono text-center text-gray-500 bg-[#121215]">
                    Awaiting freelancer submission. Payout locked.
                  </div>
                )}
              </div>
            )}

            {/* Critique Feedback log (Parchment / Mono Log card) */}
            <div className="flex-1 flex flex-col justify-end">
              {selectedEscrow ? (
                <div className="critique-box">
                  <h4 className="critique-title flex items-center gap-1">
                    <Code className="w-3.5 h-3.5" /> Creative Director Critique:
                  </h4>
                  <p className="text-gray-300">
                    {selectedEscrow.director_feedback || 'No review generated yet.'}
                  </p>
                </div>
              ) : (
                <div className="critique-box text-center py-6 text-gray-600">
                  Awaiting project contract data
                </div>
              )}
            </div>

            {/* Transaction Telemetry Status log */}
            {(txStatus || error) && (
              <div className="bg-[#121215] border border-[#2e2e36] p-4 rounded text-xs font-mono space-y-2">
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>TELEMETRY FEED</span>
                  {loading && <RefreshCw className="w-3 h-3 animate-spin text-[#00f0ff]" />}
                </div>
                {txStatus && <p className="text-gray-300 text-xs">{txStatus}</p>}
                {error && <p className="text-[#ff007f] text-xs">{error}</p>}
                {txHash && (
                  <div className="pt-2 border-t border-[#2e2e36] flex justify-between items-center text-[10px]">
                    <span className="text-gray-500">TX HASH:</span>
                    <a 
                      href={`https://studio.genlayer.com/explorer/transaction/${txHash}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[#00f0ff] hover:underline"
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
            <span className="panel-title text-[#00f0ff]">
              <Send className="w-4 h-4" /> Delivery Dock & Ledger
            </span>
            <span className="text-[10px] text-gray-500 font-mono">Submit & Arbitrate</span>
          </div>

          <div className="panel-content space-y-6">
            
            {/* Freelancer Delivery Submission Form */}
            {selectedEscrow && selectedEscrow.status === 'ACTIVE' && (
              <div className="bg-[#1c1c22] border border-[#2e2e36] p-5 rounded-lg">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 mb-4 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#00f0ff]" /> Submit Completed Work
                </h3>

                <form onSubmit={handleSubmitDelivery} className="space-y-4">
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
                    <p className="text-[10px] text-gray-500 mt-1">
                      Note: AI will cross-reference this delivery link against the client's brief link.
                    </p>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading || !address}
                    className={`studio-btn ${(!address || loading) ? 'btn-disabled' : 'btn-primary'}`}
                  >
                    {loading ? 'Submitting & Evaluating...' : 'Submit Delivery'}
                  </button>
                </form>

                {/* Manual Release Override (For Clients) */}
                {address && address.toLowerCase() === selectedEscrow.client.toLowerCase() && (
                  <div className="border-t border-[#2e2e36] mt-4 pt-4">
                    <p className="text-[10px] text-gray-400 mb-2">
                      Client Option: Skip AI arbitration and pay immediately.
                    </p>
                    <button 
                      onClick={handleReleaseEscrow}
                      className="studio-btn btn-secondary text-xs"
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
              <div className="bg-[#121215] border border-[#2e2e36] p-5 rounded-lg space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#00f0ff]">
                  Submitted Delivery Source
                </h4>
                <a 
                  href={selectedEscrow.delivery_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-[#ff007f] hover:underline flex items-center gap-1 break-all"
                >
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  {selectedEscrow.delivery_url}
                </a>
              </div>
            )}

            {/* Escrows Ledger */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Escrow Ledger
                </h3>
                <button 
                  onClick={fetchEscrowsState} 
                  disabled={loading}
                  className="text-gray-500 hover:text-white p-1 transition-colors"
                  title="Reload Ledger"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {escrows.map((escrow) => (
                  <div 
                    key={escrow.id}
                    onClick={() => setSelectedEscrowId(Number(escrow.id))}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedEscrowId === Number(escrow.id)
                        ? 'border-[#00f0ff] bg-[#1a2529]'
                        : 'border-[#2e2e36] bg-[#141418] hover:border-gray-500'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-white">Escrow #{escrow.id}</span>
                      <span className={`status-badge text-[8px] ${
                        escrow.status === 'APPROVED' ? 'badge-approved' :
                        escrow.status === 'REJECTED' ? 'badge-rejected' :
                        escrow.status === 'ACTIVE' ? 'badge-active' : 'badge-failed'
                      }`}>
                        {escrow.status}
                      </span>
                    </div>

                    <div className="text-[10px] text-gray-500 flex justify-between font-mono">
                      <span>Freelancer: {escrow.freelancer.slice(0, 6)}...{escrow.freelancer.slice(-4)}</span>
                      <span className="text-[#e0ff25] font-semibold">{formatGen(escrow.amount)} GEN</span>
                    </div>
                  </div>
                ))}

                {escrows.length === 0 && (
                  <div className="text-center py-6 text-gray-600 text-xs border border-dashed border-[#2e2e36] rounded-lg">
                    No records found.
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Footer Info */}
      <footer className="h-8 border-t border-[#2e2e36] bg-[#121214] text-[10px] text-gray-500 flex items-center justify-between px-6">
        <span>© 2026 GigBrain Escrow Inc.</span>
        <span>Built with GenLayer Intelligent Arbitrator Core</span>
      </footer>
    </div>
  );
}

export default App;
