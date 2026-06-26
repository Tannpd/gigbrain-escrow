# GigBrain Escrow — Decentralized Creative Freelance Arbitrator

**GigBrain Escrow** is a smart contract escrow designed for qualitative, creative freelance work (such as UI/UX design, writing, or software coding). The client locks funds in escrow and submits a creative brief URL. The freelancer completes the work and submits a delivery URL. The AI acts as an impartial **Creative Director**, reading both the original brief and the delivered work. It evaluates if the freelancer fulfilled the core requirements of the brief. If yes, it executes a forced payout to the freelancer; if false, funds are refunded to the client.

## Why GigBrain Escrow DIES without GenLayer

Creative work is inherently subjective, and clients frequently withhold payment from freelancers using vague, nitpicky excuses. Traditional smart contracts are blind; they cannot parse natural language briefs, view web delivery files (like a Figma canvas or a Google Document), or make cognitive judgments. Without **GenLayer's Intelligent Contracts**, GigBrain Escrow is impossible because:
1. **No Web-Rendering Capability:** A standard EVM contract cannot fetch or scrape external URLs to retrieve text from brief documents or delivery repository pages.
2. **No Non-Deterministic AI Processing:** There is no native way to invoke LLMs inside traditional deterministic EVM VMs to evaluate qualitative text alignment.
3. **No Consensus on Spectrum:** Traditional consensus requires bitwise equality of state changes. GenLayer allows custom validator consensus scripts (e.g. allowing minor variations in alignment scores and critique wording while maintaining strict agreement on the ultimate approval verdict).

---

## 🛠️ Smart Contract Architecture

The core logic is located in [gigbrain.py](contracts/gigbrain.py) and adheres strictly to GenVM execution rules:
- **Consensus on a Spectrum Validator:** Uses a custom `validator_fn` checking that leader and validator nodes agree on the boolean outcome (`is_approved`) and that their numerical evaluations (`alignment_score`) do not deviate by more than $\pm 10$ points:
  $$\text{Agreement} \iff (\text{leader\_is\_approved} == \text{validator\_is\_approved}) \land (\lvert\text{leader\_alignment\_score} - \text{validator\_alignment\_score}\rvert \le 10)$$
- **Non-Deterministic Scraping Wrapper:** Wraps web fetching (`gl.nondet.web.render`) and LLM processing (`gl.nondet.exec_prompt`) inside `gl.vm.run_nondet_unsafe`.
- **Address Sanitization:** Features a robust input deserialization sanitization wrapper `to_address()` to prevent GenVM transaction state failures when addresses are passed as integers or decimal string types from user interfaces.

---

## 🚀 Deployment Instructions

### Step 1: Deploy to GenLayer StudioNet
1. Open the [GenLayer Studio](https://studio.genlayer.com/).
2. Create a new contract file named `gigbrain.py` and paste the contents of [contracts/gigbrain.py](contracts/gigbrain.py).
3. Connect your wallet or use the built-in Studio wallets.
4. Click **Deploy** to compile and publish the contract.
5. Copy the generated contract address (e.g., `0xfc8CD907eDE2c587E942c46a01687E90ed492fd8`).

### Step 2: Configure the Frontend
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and paste your deployed contract address:
   ```env
   VITE_CONTRACT_ADDRESS="your_deployed_contract_address_here"
   ```

### Step 3: Run the Web Dashboard
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the Vite development server locally:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.
