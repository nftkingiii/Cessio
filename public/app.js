const TESTNET = Object.freeze({
  chainId: '0x3c8',
  chainName: 'BOT Chain Testnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: ['https://rpc.bohr.life'],
  blockExplorerUrls: ['https://scan.bohr.life']
});

const CONTRACTS = Object.freeze({
  token: '0x4D0984B958b4376dE072DC098404c4afA9155C90',
  receivables: '0x212d99C7fC7C83901e8d6BB0F82d937F9735d248',
  receiptId: 1n
});

const RECEIVABLE_STATUS = ['Unissued', 'Funding', 'Funded', 'Repaid', 'Cancelled'];
const state = { account: null, receipt: null, receiptId: 1n, receiptError: null, tokenBalance: null, pending: false };

const walletButton = document.querySelector('#connect-wallet');
const networkStatusText = document.querySelector('#network-status-text');
const drawer = document.querySelector('#fund-drawer');
const backdrop = document.querySelector('#drawer-backdrop');
const drawerTitle = document.querySelector('#drawer-title');
const drawerCopy = document.querySelector('#drawer-copy');
const drawerFootnote = document.querySelector('#drawer-footnote');
const closeDrawer = document.querySelector('.close-drawer');
const refreshButton = document.querySelector('#refresh-market');
const syncChainButton = document.querySelector('#sync-chain');
const fundButton = document.querySelector('#fund-action');
const fundButtonText = document.querySelector('#fund-action-text');
const fundAmount = document.querySelector('#fund-amount');
const receiptStatus = document.querySelector('#receipt-status');
const receiptStatusText = document.querySelector('#receipt-status-text');
const receiptPrincipal = document.querySelector('#receipt-principal');
const receiptRepayment = document.querySelector('#receipt-repayment');
const receiptClaim = document.querySelector('#receipt-claim');
const proofState = document.querySelector('#proof-state');
const demoForm = document.querySelector('#demo-form');
const demoSubmit = document.querySelector('#demo-submit');
const demoStatus = document.querySelector('#demo-status');
const confidenceInput = demoForm.querySelector('[name="deliveryConfidence"]');
const confidenceOutput = document.querySelector('#confidence-output');
const demoResults = document.querySelector('#demo-results');
const demoResultTitle = document.querySelector('#demo-result-title');
const demoResultCopy = document.querySelector('#demo-result-copy');
const registerDemoButton = document.querySelector('#register-demo');
const fundDemoButton = document.querySelector('#fund-demo');
const portfolioAccount = document.querySelector('#portfolio-account');
const portfolioNetwork = document.querySelector('#portfolio-network');
const portfolioBalance = document.querySelector('#portfolio-balance');
const portfolioReceipt = document.querySelector('#portfolio-receipt');
const portfolioReceiptState = document.querySelector('#portfolio-receipt-state');
const portfolioFunded = document.querySelector('#portfolio-funded');
const portfolioRepayment = document.querySelector('#portfolio-repayment');
const portfolioConnect = document.querySelector('#portfolio-connect');
const portfolioActivity = document.querySelector('#portfolio-activity');
const opportunitiesBody = document.querySelector('#opportunities-body');
let latestDemo = null;
let latestDemoReceiptId = null;
let activity = JSON.parse(localStorage.getItem('cessio-funding-activity') || '[]');
const storedReceiptId = activity[0]?.receiptId || activity[0]?.label?.match(/Receipt #(\d+)/)?.[1];
if (storedReceiptId) state.receiptId = BigInt(storedReceiptId);

function renderIcons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.6 } });
}

function setButton(button, text, disabled) {
  button.disabled = disabled;
  if (button === fundButton) fundButtonText.textContent = text;
}

function formatCUSDT(amount) {
  const whole = amount / 1_000_000n;
  const fraction = (amount % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return `${whole.toLocaleString()}${fraction ? `.${fraction}` : ''} cUSDT`;
}

function encodeWord(value) {
  return BigInt(value).toString(16).padStart(64, '0');
}

function encodeAddress(address) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('Invalid contract address');
  return address.slice(2).toLowerCase().padStart(64, '0');
}

function hexFromBytes(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return hexFromBytes(new Uint8Array(digest));
}

function encodeBytes32(value) {
  if (!/^[a-fA-F0-9]{64}$/.test(value)) throw new Error('Expected a bytes32 digest');
  return value.toLowerCase();
}

function encodeCreateReceivable({ originator, token, principal, repayment, deadline, invoiceDigest, assessmentDigest }) {
  return `0xbbd61590${encodeAddress(originator)}${encodeAddress(originator)}${encodeAddress(token)}${encodeWord(principal)}${encodeWord(repayment)}${encodeWord(deadline)}${encodeBytes32(invoiceDigest)}${encodeBytes32(assessmentDigest)}`;
}

async function readReceipt(receiptId = state.receiptId) {
  const response = await fetch(`/v1/chain/receipts/${receiptId}`, { headers: { Accept: 'application/json' } });
  const payload = await response.json();
  if (!response.ok || !payload.receipt) throw new Error(payload.error?.message || 'Testnet receipt read failed');
  return {
    ...payload.receipt,
    id: BigInt(payload.receipt.id),
    principal: BigInt(payload.receipt.principal),
    repayment: BigInt(payload.receipt.repayment),
    totalFunded: BigInt(payload.receipt.totalFunded)
  };
}

function renderReceipt() {
  if (!state.receipt) {
    proofState.dataset.state = 'error';
    receiptStatus.className = 'status status-review';
    receiptStatusText.textContent = state.receiptError ? `Receipt unavailable: ${state.receiptError}` : 'Receipt unavailable';
    receiptPrincipal.textContent = '--';
    receiptRepayment.textContent = '--';
    receiptClaim.textContent = '--';
    portfolioReceiptState.textContent = state.receiptError ? `Unavailable: ${state.receiptError}` : 'Receipt unavailable';
    return;
  }

  const status = RECEIVABLE_STATUS[state.receipt.status] || 'Unknown';
  const settled = state.receipt.status === 3;
  proofState.dataset.state = settled ? 'settled' : 'open';
  receiptStatus.className = `status ${settled ? 'status-approved' : 'status-neutral'}`;
  receiptStatusText.textContent = `Receipt #${state.receipt.id} ${status}`;
  receiptPrincipal.textContent = formatCUSDT(state.receipt.totalFunded);
  receiptRepayment.textContent = formatCUSDT(state.receipt.repayment);
  receiptClaim.textContent = settled ? 'Completed' : 'Pending';
  portfolioReceipt.textContent = `Receipt #${state.receipt.id}`;
  portfolioReceiptState.textContent = `${status} on BOT Testnet`;
  portfolioFunded.textContent = formatCUSDT(state.receipt.totalFunded);
  portfolioRepayment.textContent = formatCUSDT(state.receipt.repayment);
  renderFundingState();
}

function renderFundingState() {
  const canFund = state.receipt && state.receipt.status === 1 && state.receipt.totalFunded < state.receipt.principal;
  if (!state.account) {
    drawerCopy.textContent = 'Connect a wallet to inspect the deployed Testnet receipt. Funding is enabled only while a receipt is open.';
    setButton(fundButton, 'Connect wallet to continue', false);
    return;
  }
  if (!canFund) {
    drawerCopy.textContent = `Receipt #${state.receipt.id} is settled and can no longer accept funding. New verified opportunities will unlock wallet funding here.`;
    setButton(fundButton, 'Receipt settled', true);
    return;
  }
  drawerCopy.textContent = 'This Testnet receipt is open. Your wallet will approve cUSDT first, then submit a separate funding transaction.';
  if (state.tokenBalance !== null) drawerFootnote.textContent = `Available balance: ${formatCUSDT(state.tokenBalance)}. Funding checks this balance before approval.`;
  setButton(fundButton, state.pending ? 'Wallet confirmation in progress' : 'Approve and fund', state.pending);
}

async function refreshContractState() {
  syncChainButton.setAttribute('aria-busy', 'true');
  try {
    state.receipt = await readReceipt(state.receiptId);
    state.receiptError = null;
  } catch (error) {
    state.receipt = null;
    state.receiptError = typeof error.message === 'string' ? error.message.slice(0, 100) : 'Unknown receipt read error';
  } finally {
    renderReceipt();
    syncChainButton.removeAttribute('aria-busy');
  }
}

async function readTokenBalance(account) {
  const result = await requestWallet('read cUSDT balance', 'eth_call', [{ to: CONTRACTS.token, data: `0x70a08231${encodeAddress(account)}` }, 'latest']);
  return BigInt(result);
}

function renderPortfolio() {
  portfolioAccount.textContent = state.account ? `${state.account.slice(0, 10)}...${state.account.slice(-8)}` : 'Not connected';
  portfolioNetwork.textContent = state.account ? 'BOT Testnet connected' : 'Connect a wallet to continue';
  portfolioBalance.textContent = state.tokenBalance === null ? '--' : formatCUSDT(state.tokenBalance);
  portfolioConnect.hidden = Boolean(state.account);
  portfolioActivity.innerHTML = activity.length
    ? activity.map((entry) => `<div class="activity-row"><span><strong>${entry.label}</strong><small>${entry.hash}</small></span><b>${entry.amount} cUSDT</b></div>`).join('')
    : '<span class="portfolio-empty">No funding activity recorded in this browser yet.</span>';
}

function seedOpportunityRows() {
  return `<tr><td><strong>Atlas Compute</strong><span>Compute provider</span></td><td>GPU capacity invoice</td><td>$1,000</td><td><span class="risk-pill low">Low · 18</span></td><td>20d</td><td><div class="mini-progress"><span style="width:64%"></span></div><span class="mono">64%</span></td><td><button class="icon-button open-fund" data-receivable="Atlas Compute" aria-label="Fund Atlas Compute"><i data-lucide="arrow-up-right"></i></button></td></tr>`;
}

function renderOpportunityRows(receivables = []) {
  const rows = receivables.map((entry) => {
    const invoice = entry.invoice || {};
    const decision = entry.underwriting || {};
    const label = invoice.obligorName || 'Testnet originator';
    const amount = Number(entry.requestedFundingAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const risk = Number(decision.riskScore ?? 0);
    const riskClass = risk <= 30 ? 'low' : 'review';
    return `<tr><td><strong>${label}</strong><span>${invoice.serviceCategory || 'Receivable'}</span></td><td>${invoice.invoiceReference || 'Demo invoice'}</td><td>$${amount}</td><td><span class="risk-pill ${riskClass}">${riskClass === 'low' ? 'Low' : 'Review'} · ${risk}</span></td><td>${invoice.dueDate || '--'}</td><td><span class="mono">TESTNET</span></td><td><button class="icon-button open-fund" data-receivable="${label}" aria-label="Fund ${label}"><i data-lucide="arrow-up-right"></i></button></td></tr>`;
  });
  opportunitiesBody.innerHTML = rows.length ? rows.join('') : seedOpportunityRows();
  document.querySelectorAll('#opportunities-body .open-fund').forEach((button) => button.addEventListener('click', openFundDrawer));
  renderIcons();
}

async function refreshOpportunities() {
  try {
    const response = await fetch('/v1/receivables', { headers: { Accept: 'application/json' } });
    const payload = await response.json();
    if (response.ok) renderOpportunityRows(payload.receivables || []);
  } catch {
    renderOpportunityRows([]);
  }
}

async function refreshWalletBalance() {
  if (!state.account) {
    state.tokenBalance = null;
    renderPortfolio();
    return;
  }
  try {
    await ensureTestnet();
    state.tokenBalance = await readTokenBalance(state.account);
  } catch (error) {
    state.tokenBalance = null;
    drawerFootnote.textContent = error.message || 'Could not read cUSDT balance.';
  }
  renderPortfolio();
  renderFundingState();
}

function openFundDrawer(event) {
  const name = event.currentTarget.dataset.receivable ?? 'this opportunity';
  drawerTitle.textContent = `Fund ${name}`;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  backdrop.hidden = false;
  fundAmount.focus();
  renderFundingState();
}

function closeFundDrawer() {
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  backdrop.hidden = true;
}

async function ensureTestnet() {
  const provider = window.ethereum;
  if (!provider) throw new Error('No EVM wallet was found');
  let chainId = await requestWallet('read network', 'eth_chainId');
  if (chainId.toLowerCase() === TESTNET.chainId) return;
  try {
    await requestWallet('switch network', 'wallet_switchEthereumChain', [{ chainId: TESTNET.chainId }]);
  } catch (error) {
    const unknownChain = error.code === 4902 || /unrecognized chain id|unknown chain/i.test(error.message);
    if (!unknownChain) throw error;
    await requestWallet('add BOT Testnet', 'wallet_addEthereumChain', [TESTNET]);
    await requestWallet('switch to BOT Testnet', 'wallet_switchEthereumChain', [{ chainId: TESTNET.chainId }]);
  }
  chainId = await requestWallet('confirm network', 'eth_chainId');
  if (chainId.toLowerCase() !== TESTNET.chainId) throw new Error('BOT Testnet was not selected');
}

async function requestWallet(stage, method, params) {
  try {
    return await window.ethereum.request(params ? { method, params } : { method });
  } catch (error) {
    const message = typeof error.message === 'string' ? error.message : 'No provider message was returned';
    const wrapped = new Error(`${stage}: ${message}`);
    wrapped.code = error.code;
    throw wrapped;
  }
}

function setConnectedAccount(account) {
  state.account = account;
  walletButton.querySelector('span').textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
  networkStatusText.textContent = 'BOT Testnet connected';
  renderPortfolio();
  refreshWalletBalance();
  renderFundingState();
}

async function connectWallet() {
  if (!window.ethereum) {
    walletButton.querySelector('span').textContent = 'Wallet unavailable';
    return;
  }
  try {
    const [account] = await requestWallet('request account access', 'eth_requestAccounts');
    await ensureTestnet();
    setConnectedAccount(account);
  } catch (error) {
    const providerCode = Number.isInteger(error.code) ? ` (${error.code})` : '';
    const providerMessage = typeof error.message === 'string' ? error.message.slice(0, 120) : 'No provider message was returned';
    const message = error.code === 4001
      ? 'Connection declined'
      : error.code === -32002
        ? 'Wallet request pending'
        : error.message === 'BOT Testnet was not selected'
          ? 'Switch to BOT Testnet'
          : `Wallet error${providerCode}`;
    walletButton.querySelector('span').textContent = message;
    networkStatusText.textContent = message === 'Switch to BOT Testnet' ? 'Wrong network' : 'BOT Testnet';
    drawerFootnote.textContent = `Wallet provider: ${providerMessage}`;
  }
}

function parseCUSDT(value) {
  const normalized = value.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(normalized)) throw new Error('Enter a cUSDT amount with up to 6 decimals');
  const [whole, fraction = ''] = normalized.split('.');
  const amount = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
  if (amount <= 0n) throw new Error('Funding amount must be greater than zero');
  return amount;
}

async function waitForReceipt(hash) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const receipt = await window.ethereum.request({ method: 'eth_getTransactionReceipt', params: [hash] });
    if (receipt) {
      if (receipt.status !== '0x1') throw new Error('Transaction reverted on BOT Testnet');
      return receipt;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
  }
  throw new Error('Transaction confirmation timed out');
}

async function submitFunding() {
  if (!state.account) return connectWallet();
  if (!state.receipt || state.receipt.status !== 1) return;
  let amount;
  try {
    amount = parseCUSDT(fundAmount.value);
    if (amount > state.receipt.principal - state.receipt.totalFunded) throw new Error('Amount exceeds the remaining funding capacity');
    const balance = state.tokenBalance ?? await readTokenBalance(state.account);
    state.tokenBalance = balance;
    if (balance < amount) throw new Error(`Insufficient cUSDT balance. Wallet has ${formatCUSDT(balance)}; requested ${formatCUSDT(amount)}.`);
    state.pending = true;
    renderFundingState();
    await ensureTestnet();
    const approveHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: state.account, to: CONTRACTS.token, data: `0x095ea7b3${encodeAddress(CONTRACTS.receivables)}${encodeWord(amount)}` }]
    });
    await waitForReceipt(approveHash);
    const fundHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: state.account, to: CONTRACTS.receivables, data: `0xe91c4052${encodeWord(state.receipt.id)}${encodeWord(amount)}` }]
    });
    await waitForReceipt(fundHash);
    drawerFootnote.textContent = `Funding confirmed: ${fundHash.slice(0, 10)}...${fundHash.slice(-8)}`;
    activity.unshift({ receiptId: state.receipt.id.toString(), label: `Receipt #${state.receipt.id} funded`, hash: `${fundHash.slice(0, 10)}...${fundHash.slice(-8)}`, amount: (Number(amount) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 }) });
    localStorage.setItem('cessio-funding-activity', JSON.stringify(activity.slice(0, 12)));
    renderPortfolio();
    await refreshContractState();
    await refreshWalletBalance();
  } catch (error) {
    drawerFootnote.textContent = error.code === 4001 ? 'Wallet confirmation was rejected. No funding was submitted.' : error.message || 'Funding could not be completed.';
  } finally {
    state.pending = false;
    renderFundingState();
  }
}

async function submitDemo(event) {
  event.preventDefault();
  if (!state.account) return connectWallet();
  const form = new FormData(demoForm);
  const invoice = Object.fromEntries(form.entries());
  invoice.originatorWallet = state.account;
  invoice.currency = 'USD';
  invoice.deliveryConfidence = Number(invoice.deliveryConfidence);
  invoice.evidenceDigest = await sha256Hex(JSON.stringify({ reference: invoice.invoiceReference, confidence: invoice.deliveryConfidence, category: invoice.serviceCategory }));
  demoSubmit.disabled = true;
  demoStatus.className = 'form-status';
  demoStatus.textContent = 'Running bounded Testnet underwriting...';
  try {
    const response = await fetch('/v1/demo/receivables', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(invoice) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || 'Demo submission failed');
    latestDemo = payload;
    await refreshOpportunities();
    demoResults.hidden = false;
    demoResultTitle.textContent = payload.assessment.decision.decision === 'approved' ? 'Approved for Testnet registration' : 'Held for review';
    demoResultCopy.textContent = payload.receivable ? `Risk ${payload.assessment.decision.riskScore}/100. Maximum funding: ${payload.assessment.decision.maxFundingAmount} ${invoice.currency}. Register it from the connected underwriter wallet to create the on-chain receipt.` : payload.assessment.decision.reasons.join(' ');
    registerDemoButton.disabled = !payload.receivable;
    demoStatus.className = 'form-status success';
    demoStatus.textContent = 'Underwriting complete. Review the decision before registering on-chain.';
  } catch (error) {
    demoStatus.className = 'form-status error';
    demoStatus.textContent = error.message || 'Demo submission failed';
  } finally {
    demoSubmit.disabled = false;
  }
}

async function registerDemo() {
  if (!latestDemo?.receivable || !state.account) return connectWallet();
  registerDemoButton.disabled = true;
  try {
    const nextIdData = await requestWallet('read next receipt ID', 'eth_call', [{ to: CONTRACTS.receivables, data: '0x0ae3cd24' }, 'latest']);
    latestDemoReceiptId = BigInt(nextIdData);
    const amount = parseCUSDT(latestDemo.receivable.requestedFundingAmount);
    const repayment = amount + (amount * BigInt(latestDemo.assessment.decision.expectedYieldBps)) / 10_000n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);
    const invoiceDigest = latestDemo.assessment.invoice.evidenceDigest;
    const assessmentDigest = await sha256Hex(JSON.stringify(latestDemo.assessment.decision));
    const hash = await requestWallet('register receivable', 'eth_sendTransaction', [{ from: state.account, to: CONTRACTS.receivables, data: encodeCreateReceivable({ originator: state.account, token: CONTRACTS.token, principal: amount, repayment, deadline, invoiceDigest, assessmentDigest }) }]);
    await waitForReceipt(hash);
    state.receipt = await readReceipt(latestDemoReceiptId);
    state.receiptId = latestDemoReceiptId;
    state.receiptError = null;
    renderReceipt();
    demoResultCopy.textContent = `Registered on BOT Testnet: ${hash.slice(0, 12)}...${hash.slice(-8)}. You can now approve cUSDT and fund this receipt from the connected wallet.`;
    fundDemoButton.disabled = false;
    fundDemoButton.dataset.receiptId = latestDemoReceiptId.toString();
  } catch (error) {
    demoResultCopy.textContent = error.message || 'Registration failed';
    registerDemoButton.disabled = false;
  }
}

async function fundDemo() {
  if (!latestDemo || latestDemoReceiptId === null) return;
  state.receipt = await readReceipt(latestDemoReceiptId);
  state.receiptId = latestDemoReceiptId;
  state.receiptError = null;
  renderReceipt();
  fundAmount.value = '';
  openFundDrawer({ currentTarget: { dataset: { receivable: latestDemo.receivable.obligorName || 'latest demo receivable' } } });
  demoResultCopy.textContent = 'Receipt registered. Enter a partial or full cUSDT amount in the funding panel; your balance is checked before approval.';
}

function setView(view) {
  const next = ['market', 'opportunities', 'portfolio', 'create'].includes(view) ? view : 'market';
  document.querySelectorAll('[data-view-panel]').forEach((panel) => { panel.hidden = panel.dataset.viewPanel !== next || (panel.id === 'demo-results' && !latestDemo); });
  document.querySelectorAll('[data-view]').forEach((link) => link.classList.toggle('active', link.dataset.view === next));
  if (window.location.hash !== `#${next}`) history.replaceState(null, '', `#${next}`);
}

async function refreshMarket() {
  refreshButton.setAttribute('aria-busy', 'true');
  try {
    await Promise.all([refreshOpportunities(), refreshContractState()]);
  } catch {
    // Contract evidence is independently read from the Testnet RPC.
  } finally {
    refreshButton.removeAttribute('aria-busy');
  }
}

async function bootstrapWallet() {
  if (!window.ethereum) return;
  try {
    const [account] = await requestWallet('read connected account', 'eth_accounts');
    if (account) {
      await ensureTestnet();
      setConnectedAccount(account);
    }
  } catch {
    // The user can still connect explicitly from the header or Portfolio tab.
  }
}

function watchWallet() {
  if (!window.ethereum?.on) return;
  window.ethereum.on('accountsChanged', ([account]) => {
    if (account) setConnectedAccount(account);
    else {
      state.account = null;
      walletButton.querySelector('span').textContent = 'Connect wallet';
      networkStatusText.textContent = 'BOT Testnet';
      renderPortfolio();
      refreshWalletBalance();
      renderFundingState();
    }
  });
  window.ethereum.on('chainChanged', (chainId) => {
    if (chainId.toLowerCase() === TESTNET.chainId) {
      networkStatusText.textContent = state.account ? 'BOT Testnet connected' : 'BOT Testnet';
    } else {
      networkStatusText.textContent = 'Wrong network';
    }
    renderFundingState();
  });
}

document.querySelectorAll('.open-fund').forEach((button) => button.addEventListener('click', openFundDrawer));
document.querySelectorAll('[data-view]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); setView(link.dataset.view); }));
closeDrawer.addEventListener('click', closeFundDrawer);
backdrop.addEventListener('click', closeFundDrawer);
walletButton.addEventListener('click', connectWallet);
document.querySelector('#portfolio-connect').addEventListener('click', connectWallet);
document.querySelector('#portfolio-refresh').addEventListener('click', refreshWalletBalance);
refreshButton.addEventListener('click', refreshMarket);
syncChainButton.addEventListener('click', refreshContractState);
fundButton.addEventListener('click', submitFunding);
demoForm.addEventListener('submit', submitDemo);
confidenceInput.addEventListener('input', () => { confidenceOutput.value = `${Math.round(Number(confidenceInput.value) * 100)}%`; confidenceOutput.textContent = confidenceOutput.value; });
registerDemoButton.addEventListener('click', registerDemo);
  fundDemoButton.addEventListener('click', fundDemo);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeFundDrawer(); });
window.addEventListener('hashchange', () => setView(window.location.hash.slice(1) || 'market'));
window.addEventListener('load', () => {
  const today = new Date();
  const due = new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000);
  demoForm.querySelector('[name="issuedDate"]').value = today.toISOString().slice(0, 10);
  demoForm.querySelector('[name="dueDate"]').value = due.toISOString().slice(0, 10);
  renderIcons();
  renderOpportunityRows([]);
  setView(window.location.hash.slice(1) || 'market');
  renderPortfolio();
  refreshMarket();
  watchWallet();
  bootstrapWallet();
});
