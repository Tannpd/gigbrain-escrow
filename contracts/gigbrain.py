# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# =============================================================================
#  gigbrain.py — GigBrain Escrow Freelance Arbitrator
#  GenLayer Intelligent Contract (v0.2.16)
# =============================================================================

from genlayer import *
import json

def to_address(val) -> Address:
    """
    Ensures input addresses are represented as pure Address structures,
    protecting against string/int input deserialization issues in GenLayer Studio UI.
    """
    if isinstance(val, Address):
        return val
    if isinstance(val, int):
        return Address(f"0x{val:040x}")
    if isinstance(val, str):
        if val.startswith("0x"):
            return Address(val)
        try:
            return Address(f"0x{int(val):040x}")
        except Exception:
            return Address(val)
    return Address(str(val))

class Contract(gl.Contract):
    """
    GigBrain Escrow
    ================
    A decentralized arbitrator designed to prevent clients from exploiting freelancers
    for qualitative creative work. Client deposits funds with a project brief. Freelancer
    submits delivery. AI acts as an impartial Creative Director comparing deliverables
    against brief specifications.
    """

    # Monotonic escrow counter
    escrows_count:             u64

    # Storage Mappings (Pre-initialized by the VM; do not reassign in __init__)
    escrow_client:             TreeMap[u64, Address]
    escrow_freelancer:         TreeMap[u64, Address]
    escrow_amount:             TreeMap[u64, u256]
    escrow_status:             TreeMap[u64, str]       # "ACTIVE", "APPROVED", "REJECTED", "FAILED"
    escrow_brief_url:          TreeMap[u64, str]
    escrow_delivery_url:       TreeMap[u64, str]
    escrow_alignment_score:    TreeMap[u64, u256]      # 0 to 100
    escrow_director_feedback:  TreeMap[u64, str]       # Editorial critique

    def __init__(self) -> None:
        """
        Constructor. Setup counter. Storage elements are preconfigured.
        """
        self.escrows_count = 0

    @gl.public.write
    def create_escrow(self, freelancer: Address, brief_url: str) -> int:
        """
        Client deposits native GEN tokens and submits the project brief, assigning the freelancer.
        """
        amount = int(gl.message.value)
        if amount <= 0:
            raise UserError("You must lock a positive GEN amount in the escrow.")
        if len(brief_url.strip()) == 0:
            raise UserError("Brief URL cannot be empty.")

        eid = self.escrows_count
        self.escrow_client[eid] = gl.message.sender_address
        self.escrow_freelancer[eid] = to_address(freelancer)
        self.escrow_amount[eid] = amount
        self.escrow_status[eid] = "ACTIVE"
        self.escrow_brief_url[eid] = brief_url.strip()
        self.escrow_delivery_url[eid] = ""
        self.escrow_alignment_score[eid] = 0
        self.escrow_director_feedback[eid] = "Escrow established. Awaiting delivery from freelancer."

        self.escrows_count = int(eid) + 1
        return int(eid)

    @gl.public.write
    def release_escrow(self, escrow_id: int) -> None:
        """
        Allows the client to manually release funds early, overriding AI evaluation.
        """
        if escrow_id < 0 or escrow_id >= int(self.escrows_count):
            raise UserError("Escrow does not exist.")

        status = self.escrow_status.get(escrow_id, "ACTIVE")
        if status != "ACTIVE":
            raise UserError("Escrow is not in active state.")

        client = self.escrow_client.get(escrow_id, Address("0x0000000000000000000000000000000000000000"))
        if gl.message.sender_address != client:
            raise UserError("Only the designated client can manually release this escrow.")

        freelancer = self.escrow_freelancer.get(escrow_id, Address("0x0000000000000000000000000000000000000000"))
        amount = int(self.escrow_amount.get(escrow_id, 0))

        if amount <= 0:
            raise UserError("No funds found in the escrow pool.")

        # Reentrancy protection
        self.escrow_amount[escrow_id] = 0
        self.escrow_status[escrow_id] = "APPROVED"
        self.escrow_director_feedback[escrow_id] = "Client manually approved and released funds to freelancer."

        # Send funds to freelancer
        other = gl.get_contract_at(freelancer)
        other.emit_transfer(value=u256(amount))

    @gl.public.write
    def submit_delivery(self, escrow_id: int, delivery_url: str) -> None:
        """
        Freelancer submits their delivery URL. The contract pulls the contents from the brief
        and delivery URLs, evaluates them via AI, and auto-executes the payout/refund.
        """
        if escrow_id < 0 or escrow_id >= int(self.escrows_count):
            raise UserError("Escrow does not exist.")

        status = self.escrow_status.get(escrow_id, "ACTIVE")
        if status != "ACTIVE" and status != "FAILED":
            raise UserError("Escrow is not active or editable.")

        freelancer = self.escrow_freelancer.get(escrow_id, Address("0x0000000000000000000000000000000000000000"))
        if gl.message.sender_address != freelancer:
            raise UserError("Only the designated freelancer can submit delivery.")

        if len(delivery_url.strip()) == 0:
            raise UserError("Delivery URL cannot be empty.")

        brief_url = self.escrow_brief_url.get(escrow_id, "")
        client = self.escrow_client.get(escrow_id, Address("0x0000000000000000000000000000000000000000"))
        amount = int(self.escrow_amount.get(escrow_id, 0))

        if amount <= 0:
            raise UserError("No funds found in the escrow pool.")

        self.escrow_delivery_url[escrow_id] = delivery_url.strip()

        # Non-Deterministic logic block
        def leader_fn() -> str:
            # 1. Scrape Brief URL
            brief_failed = False
            try:
                brief_raw = gl.nondet.web.render(brief_url)
                brief_text = brief_raw.strip()
            except Exception as e:
                brief_failed = True
                brief_text = f"ERROR: Brief URL failed to render: {str(e)}"

            # 2. Scrape Delivery URL
            delivery_failed = False
            try:
                delivery_raw = gl.nondet.web.render(delivery_url)
                delivery_text = delivery_raw.strip()
            except Exception as e:
                delivery_failed = True
                delivery_text = f"ERROR: Delivery URL failed to render: {str(e)}"

            # Handle edge case: both fail
            if brief_failed and delivery_failed:
                return json.dumps({
                    "error": "BOTH_URLS_FAILED",
                    "is_approved": False,
                    "alignment_score": 0,
                    "director_feedback": "Arbitrator failed to scrape both the brief and delivery URLs. Please check the URLs and try again."
                })

            brief_excerpt = brief_text[:4000]
            delivery_excerpt = delivery_text[:4000]

            prompt = f"""You are an Expert Creative Director and Impartial Arbitrator on a decentralized freelancing platform.
Your task is to review a freelance submission (Delivery) against the original requirements document (Brief).
Your goal is to verify if the freelancer made a good-faith effort and fulfilled the core requirements of the brief.
Ignore minor aesthetic discrepancies or subjective nitpicking unless they explicitly violate the brief's rules (e.g. specified colors, text, or features).
If the freelancer has fulfilled the core objectives of the brief, set "is_approved" to true.
If the freelancer's work is completely unrelated, plagiarized, low-effort placeholder, or missing major core deliverables, set "is_approved" to false.

Brief URL: {brief_url}
Brief Content:
--- START BRIEF CONTENT ---
{brief_excerpt}
--- END BRIEF CONTENT ---

Delivery URL: {delivery_url}
Delivery Content:
--- START DELIVERY CONTENT ---
{delivery_excerpt}
--- END DELIVERY CONTENT ---

Please analyze:
1. The core deliverables listed in the brief and whether they are present in the delivery.
2. The overall alignment, quality, and effort shown in the delivery relative to the brief.
3. Determine if "is_approved" should be true or false.
4. Calculate an "alignment_score" from 0 to 100 representing how closely the delivery matches the brief's specifications.
5. Provide a professional Creative Director critique ("director_feedback") summarizing your evaluation (2-3 sentences).

Your output MUST be a single, valid JSON object with EXACTLY these keys:
{{
  "is_approved": true | false,
  "alignment_score": <int between 0 and 100>,
  "director_feedback": "<brief feedback analysis>"
}}
Do NOT wrap the JSON in markdown code blocks. Do NOT return any extra text. Return only raw JSON."""

            try:
                raw_output = gl.nondet.exec_prompt(prompt)
            except Exception as e:
                return json.dumps({
                    "error": f"LLM_EXECUTION_FAILED: {str(e)}",
                    "is_approved": False,
                    "alignment_score": 0,
                    "director_feedback": "Internal AI execution error occurred during evaluation."
                })

            cleaned = raw_output.strip()
            # Clean markdown code blocks if present
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                inner = []
                for line in lines[1:]:
                    if line.strip() == "```":
                        break
                    inner.append(line)
                cleaned = "\n".join(inner).strip()

            try:
                parsed = json.loads(cleaned)
                is_approved = bool(parsed.get("is_approved", False))
                score = int(parsed.get("alignment_score", 0))
                feedback = str(parsed.get("director_feedback", "")).strip()

                if score < 0: score = 0
                if score > 100: score = 100

                return json.dumps({
                    "is_approved": is_approved,
                    "alignment_score": score,
                    "director_feedback": feedback[:1000]
                })
            except Exception as e:
                return json.dumps({
                    "error": f"JSON_PARSE_FAILED: {str(e)}",
                    "is_approved": False,
                    "alignment_score": 0,
                    "director_feedback": f"AI response could not be parsed: {cleaned}"
                })

        def validator_fn(leader_result: str) -> bool:
            """
            Consensus on a Spectrum Validator:
            Checks if:
            1. The core boolean matches (leader["is_approved"] == validator["is_approved"])
            2. The alignment_score is within an acceptable threshold (abs(leader["alignment_score"] - validator["alignment_score"]) <= 10)
            """
            try:
                leader_data = json.loads(leader_result)
            except Exception:
                return False

            if "error" in leader_data:
                allowed_errors = {"BOTH_URLS_FAILED", "LLM_EXECUTION_FAILED", "JSON_PARSE_FAILED"}
                return any(err in str(leader_data.get("error", "")) for err in allowed_errors)

            validator_raw = leader_fn()
            try:
                validator_data = json.loads(validator_raw)
            except Exception:
                return True  # Abstain on local validation failure

            if "error" in validator_data:
                return True

            leader_app = bool(leader_data.get("is_approved", False))
            validator_app = bool(validator_data.get("is_approved", False))

            if leader_app != validator_app:
                return False

            leader_score = int(leader_data.get("alignment_score", 0))
            validator_score = int(validator_data.get("alignment_score", 0))

            return abs(leader_score - validator_score) <= 10

        # Execute Consensus on GenLayer VM
        consensus_json = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        try:
            res = json.loads(consensus_json)
        except Exception:
            self.escrow_status[escrow_id] = "FAILED"
            self.escrow_director_feedback[escrow_id] = "Consensus outcome was unparseable."
            return

        if "error" in res:
            self.escrow_status[escrow_id] = "FAILED"
            self.escrow_director_feedback[escrow_id] = f"Evaluation failed: {res.get('error')}. Detail: {res.get('director_feedback')}"
            return

        is_approved = bool(res.get("is_approved", False))
        score = int(res.get("alignment_score", 0))
        feedback = str(res.get("director_feedback", "AI evaluation completed."))

        self.escrow_alignment_score[escrow_id] = score
        self.escrow_director_feedback[escrow_id] = feedback

        if is_approved:
            # Payout to Freelancer
            self.escrow_amount[escrow_id] = 0
            self.escrow_status[escrow_id] = "APPROVED"
            
            other = gl.get_contract_at(freelancer)
            other.emit_transfer(value=u256(amount))
        else:
            # Refund to Client
            self.escrow_amount[escrow_id] = 0
            self.escrow_status[escrow_id] = "REJECTED"
            
            other = gl.get_contract_at(client)
            other.emit_transfer(value=u256(amount))

    @gl.public.view
    def get_escrow(self, escrow_id: int) -> str:
        """
        Returns details of an escrow in JSON format.
        """
        if escrow_id < 0 or escrow_id >= int(self.escrows_count):
            return "{}"

        client = self.escrow_client.get(escrow_id, Address("0x0000000000000000000000000000000000000000"))
        freelancer = self.escrow_freelancer.get(escrow_id, Address("0x0000000000000000000000000000000000000000"))
        amount = int(self.escrow_amount.get(escrow_id, 0))
        status = self.escrow_status.get(escrow_id, "ACTIVE")
        brief = self.escrow_brief_url.get(escrow_id, "")
        delivery = self.escrow_delivery_url.get(escrow_id, "")
        score = int(self.escrow_alignment_score.get(escrow_id, 0))
        feedback = self.escrow_director_feedback.get(escrow_id, "")

        return json.dumps({
            "id": escrow_id,
            "client": str(client),
            "freelancer": str(freelancer),
            "amount": amount,
            "status": status,
            "brief_url": brief,
            "delivery_url": delivery,
            "alignment_score": score,
            "director_feedback": feedback
        })

    @gl.public.view
    def get_escrows_count(self) -> int:
        """
        Returns the total count of escrows created.
        """
        return int(self.escrows_count)
