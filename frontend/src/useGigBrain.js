import { useState, useCallback, useEffect } from 'react';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

let _readClient = null;

function getReadClient() {
  if (!_readClient) {
    _readClient = createClient({ chain: studionet });
  }
  return _readClient;
}

function getWriteClient(account) {
  return createClient({ chain: studionet, account });
}

// Convert Wei (u256) to human readable GEN string
export function formatGen(weiVal) {
  if (!weiVal) return '0';
  try {
    const big = BigInt(weiVal);
    const integerPart = big / 10n**18n;
    const fractionalPart = big % 10n**18n;
    let fractionStr = fractionalPart.toString().padStart(18, '0');
    fractionStr = fractionStr.replace(/0+$/, ''); // Trim trailing zeros
    if (fractionStr === '') {
      return integerPart.toString();
    }
    return `${integerPart}.${fractionStr.slice(0, 4)}`;
  } catch (e) {
    return '0';
  }
}

// Convert human readable GEN input to Wei (u256 BigInt)
export function parseGen(genVal) {
  if (!genVal || genVal.toString().trim() === '') return 0n;
  try {
    const parts = genVal.toString().split('.');
    let integerPart = parts[0] || '0';
    let fractionalPart = parts[1] || '';
    fractionalPart = fractionalPart.slice(0, 18).padEnd(18, '0');
    return BigInt(integerPart) * 10n**18n + BigInt(fractionalPart);
  } catch (e) {
    return 0n;
  }
}

export function useGigBrain() {
  const [address, setAddress] = useState('');
  const [glAccount, setGlAccount] = useState(null);
  const [escrows, setEscrows] = useState([]);
  const [contractBalance, setContractBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [txStatus, setTxStatus] = useState('');

  // Connect Wallet (MetaMask/ethereum provider or fallback ephemeral account)
  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const addr = accounts[0].toLowerCase();
        setAddress(addr);
        setGlAccount(addr);
      } else {
        // Ephemeral account fallback
        let savedKey = localStorage.getItem('__gigbrain_sk');
        let acct;
        if (savedKey) {
          acct = createAccount(savedKey);
        } else {
          acct = createAccount();
          localStorage.setItem('__gigbrain_sk', acct.privateKey);
        }
        const addr = acct.address.toLowerCase();
        setAddress(addr);
        setGlAccount(acct);
      }
    } catch (err) {
      console.error('Wallet connection failed:', err);
      setError('Wallet connection failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all escrows and contract balance
  const fetchEscrowsState = useCallback(async () => {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return;
    setLoading(true);
    try {
      const client = getReadClient();
      
      // Get the number of escrows
      const rawCount = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_escrows_count',
        args: [],
      });
      const count = Number(rawCount);
      
      const fetchedEscrows = [];
      for (let i = 0; i < count; i++) {
        const rawEscrow = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_escrow',
          args: [i],
        });
        if (rawEscrow && rawEscrow !== '{}') {
          const escrowObj = JSON.parse(rawEscrow);
          fetchedEscrows.push(escrowObj);
        }
      }
      
      // Get balance of contract (pool balance)
      const rawBalance = await client.getBalance({ address: CONTRACT_ADDRESS });
      setContractBalance(rawBalance.toString());
      
      setEscrows(fetchedEscrows.reverse()); // Show newest first
      setError('');
    } catch (err) {
      console.error('Error fetching escrows:', err);
      setError('Failed to fetch escrows: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create Escrow (Lock GEN, set freelancer, and brief URL)
  const createEscrow = async (freelancerAddress, briefUrl, depositAmt) => {
    if (!glAccount || !CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }
    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus(`Locking ${depositAmt} GEN in Escrow for freelancer ${freelancerAddress}...`);

    try {
      const client = getWriteClient(glAccount);
      const valueWei = parseGen(depositAmt);
      
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'create_escrow',
        args: [freelancerAddress.trim(), briefUrl.trim()],
        value: valueWei,
      });
      
      setTxHash(hash);
      setTxStatus('Submitting transaction. Depositing funds and registering brief...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Contract execution error';
        throw new Error(errorMsg);
      }

      setTxStatus('Success! Escrow funds locked successfully.');
      await fetchEscrowsState();
      return receipt;
    } catch (err) {
      console.error('Escrow creation failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Release Escrow (Manual early client release)
  const releaseEscrow = async (escrowId) => {
    if (!glAccount || !CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }
    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus(`Releasing escrow #${escrowId} to freelancer manually...`);

    try {
      const client = getWriteClient(glAccount);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'release_escrow',
        args: [Number(escrowId)],
      });
      
      setTxHash(hash);
      setTxStatus('Submitting manual release transaction...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Contract execution error';
        throw new Error(errorMsg);
      }

      setTxStatus('Success! Escrow funds manually released to freelancer.');
      await fetchEscrowsState();
      return receipt;
    } catch (err) {
      console.error('Release escrow failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Submit Delivery (AI evaluation based arbitration)
  const submitDelivery = async (escrowId, deliveryUrl) => {
    if (!glAccount || !CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }
    setLoading(true);
    setError('');
    setTxHash('');
    setTxStatus(`Submitting delivery for escrow #${escrowId}. Triggering Creative Director AI...`);

    try {
      const client = getWriteClient(glAccount);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'submit_delivery',
        args: [Number(escrowId), deliveryUrl.trim()],
      });
      
      setTxHash(hash);
      setTxStatus('AI Creative Directors are downloading the Brief and Delivery, cross-referencing alignment, and compiling evaluations. Please wait 15-30 seconds...');

      const receipt = await client.waitForTransactionReceipt({ hash });
      
      const leaderReceipt = receipt.consensus_data?.leader_receipt?.[0];
      if (leaderReceipt && leaderReceipt.execution_result === 'ERROR') {
        const errorMsg = leaderReceipt.genvm_result?.stderr || 'Evaluation execution error';
        throw new Error(errorMsg);
      }

      setTxStatus('Consensus complete! AI evaluation finalized.');
      await fetchEscrowsState();
      return receipt;
    } catch (err) {
      console.error('Submit delivery failed:', err);
      setError(err.message || 'Transaction failed');
      setTxStatus('Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      fetchEscrowsState();
    }
  }, [CONTRACT_ADDRESS, address, fetchEscrowsState]);

  return {
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
    contractAddress: CONTRACT_ADDRESS,
  };
}
