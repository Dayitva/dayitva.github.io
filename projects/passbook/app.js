// ==========================================================================
// 1. Initial State & Configuration
// ==========================================================================
const state = {
  activeView: 'cover', // 'cover' or 'ledger'
  currency: 'ETH',     // 'ETH', 'INR', 'USD'
  usdRate: 3500,       // Live ETH rate in USD (updated via API)
  inrRate: 295000,     // Live ETH rate in INR (updated via API)
  startingBalance: 0.0, // Running balance anchor (queried from current balance)
  currentAddress: '',  // Currently loaded address
  currentEns: '',      // Currently resolved ENS name
  transactions: [],    // Processed transaction history with historical balances
  pages: [],           // Pre-calculated pagination chunks of ledger transactions
  currentPagePair: 0,  // Active page pair index (displays page N on left, N+1 on right)
  pageStartNo: 1,      // Starting page number of passbook ledger
  isFlipping: false,   // Animation state lock
  network: 'ETH',      // 'ETH', 'BASE'
  
  // Default fallback details (SBI account cover details)
  customerName: 'MR. KALLAMADI HUSSAIN KOWSIK',
  relation: 'KALLAMADI CHENNAIAH',
  address: 'H NO 11/25, KOTHAPETA, MAIN BAZAR, BETAMCHERLA',
  dob: '-',
  phone: '273032, 273035',
  email: 'sa.02696@sbi.co.in',
  accountNo: '20164213515',
  cif: '86579885473',
  branchName: 'BETAMCHERLA',
  branchAddr: 'POST BAG NO.2, STATE BANK ROAD, BETAMCHERLA-518599',
  ifsc: 'SBIN0002696',
  issueDate: '29/05/2015',
  nominee: '0000000089315254',
  avatarUrl: null
};

const ROWS_PER_PAGE = 10;

// Standard public Ethereum RPC for ENS resolution and fallback
// No API keys here: this copy is served from a public site, so it uses
// free public RPCs and Blockscout's keyless API (lower rate limits).
const BLOCKSCOUT_KEY = '';

const RPC_ENDPOINTS = {
  'ETH': 'https://ethereum-rpc.publicnode.com',
  'BASE': 'https://base-rpc.publicnode.com'
};

// Keyless Blockscout (eth) returns intermittent 500s, which reach the browser
// as network errors (the error responses lack CORS headers); retry both.
async function fetchWithRetry(url, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url);
      if (res.status < 500 || i === tries - 1) return res;
    } catch (err) {
      if (i === tries - 1) throw err;
    }
    await new Promise(r => setTimeout(r, 800 * (i + 1)));
  }
}

// ==========================================================================
// 2. DOM Elements & References
// ==========================================================================
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchSubmit = document.getElementById('search-submit');
const searchError = document.getElementById('search-error');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const printBtn = document.getElementById('print-btn');
const ledgerPagination = document.getElementById('ledger-pagination');
const pageNumDisplay = document.getElementById('page-num-display');
const passbookBooklet = document.getElementById('passbook-booklet');
const flippingPage = document.getElementById('flipping-page');
const flipFaceFront = document.getElementById('flip-face-front');
const flipFaceBack = document.getElementById('flip-face-back');

// Top / Bottom flap stable content holders
const coverTopContent = document.getElementById('cover-top-content');
const coverBottomContent = document.getElementById('cover-bottom-content');

let pageFlipInstance = null;


const WATERMARK_SVG = `
  <svg viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3" />
    <g class="logo-inner">
      <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" stroke-width="0.75" />
      <rect x="45" y="50" width="10" height="40" fill="currentColor" opacity="0.15" />
    </g>
  </svg>
`;

const TABLE_HEADERS = `
  <thead>
    <tr>
      <th style="width: 18%;">दिनांक<br>Date</th>
      <th style="width: 26%;">विवरण<br>Particulars</th>
      <th style="width: 12%;">ब्लॉक नं.<br>BLOCK No.</th>
      <th style="width: 14%;">निकाली गयी राशि<br>DEBIT (Dr.)</th>
      <th style="width: 14%;">जमा की गयी राशि<br>CREDIT (Cr.)</th>
      <th style="width: 16%;">शेष<br>BALANCE</th>
    </tr>
  </thead>
`;

// ==========================================================================
// 3. Helper Formatting Functions
// ==========================================================================

// Formats transaction date to DD.MM.YY
function formatDate(dateObj) {
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = String(dateObj.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}

// Convert wei to ETH
function weiToEth(weiStr) {
  if (!weiStr) return 0;
  try {
    return parseFloat(ethers.formatEther(weiStr));
  } catch (e) {
    return 0;
  }
}

// Shorten Eth Address for printing
function shortenAddress(addr) {
  if (!addr) return 'UNKNOWN';
  if (addr.toLowerCase() === state.currentAddress.toLowerCase()) return 'SELF';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

// Map transaction methods and hashes to professional blockchain bank narrations
function mapToNarration(tx, address) {
  const isIncoming = tx.to && tx.to.hash.toLowerCase() === address.toLowerCase();
  const opponent = isIncoming ? tx.from : tx.to;
  const opponentShort = shortenAddress(opponent ? opponent.hash : '').toUpperCase();
  
  if (tx.isGasOnly) {
    return `CHG/NET TXN FEE`;
  }

  // Contract execution method mapping
  if (tx.method && tx.method !== '0x' && tx.method !== 'transfer') {
    const rawMethod = tx.method.toLowerCase();
    if (rawMethod.includes('swap') || rawMethod.includes('multicall')) {
      return `TRF/DEX-SWAP/${opponentShort}`;
    } else if (rawMethod.includes('approve')) {
      return `TRF/TOKEN-APPRV/${opponentShort}`;
    } else if (rawMethod.includes('mint')) {
      return `TRF/MINT-TOKN/${opponentShort}`;
    } else if (rawMethod.includes('deposit') || rawMethod.includes('stake')) {
      return `DEP/STAKE-POOL/${opponentShort}`;
    } else if (rawMethod.includes('withdraw') || rawMethod.includes('claim')) {
      return `WDL/WITHDRAW/${opponentShort}`;
    }
  }

  // Standard ETH transfers
  if (isIncoming) {
    return `TRF/BY-TRANSFER/${opponentShort}`;
  } else {
    return `TRF/TO-A/C/${opponentShort}`;
  }
}

// Determinstic CIF and Account No generation based on Ethereum Address
function generateDeterministicBankDetails(address) {
  if (!address || !address.startsWith('0x')) return;
  
  // Create a numeric seed from the address
  const cleanAddr = address.slice(2);
  let numSeed = 0;
  for (let i = 0; i < cleanAddr.length; i++) {
    numSeed += cleanAddr.charCodeAt(i);
  }
  
  // Determinstic Account number: starts with 201 + 8 deterministic digits
  let accSuffix = '';
  for (let i = 0; i < 8; i++) {
    accSuffix += String((numSeed + (i * 13)) % 10);
  }
  state.accountNo = `2016${accSuffix}`;

  // Deterministic CIF number: 11 deterministic digits
  let cif = '';
  for (let i = 0; i < 11; i++) {
    cif += String((numSeed * (i + 7) + 23) % 10);
  }
  state.cif = cif;

  // Deterministic IFSC code: select a realistic branch index
  if (state.network === 'BASE') {
    const branches = [
      { name: 'BASE MAINNET', addr: 'BLOCK 8453, BASE LAYER 2, ONCHAIN', code: '08453' },
      { name: 'ONCHAIN SUMMER', addr: 'COINBASE DOCK, 1 SHART STREET, REMOTE', code: '08453' },
      { name: 'JESSE\'S BRANCH', addr: 'BUILDERS WAY, BASE CAMP, DECENTRALIZED', code: '08453' },
      { name: 'BASED BUILDERS', addr: 'FOUNDRY PATH, ETHEREUM SCALED, SECURE', code: '08453' },
      { name: 'USDC STABLECOIN', addr: 'CIRCLE CIRCLE, CENTRE DOCK, LIQUIDITY', code: '08453' }
    ];
    const branchIdx = numSeed % branches.length;
    const branch = branches[branchIdx];

    state.branchName = branch.name;
    state.branchAddr = branch.addr;
    state.ifsc = `SBIN00${branch.code}`;
    state.nominee = String(numSeed * 12345678).padStart(16, '0');
    state.issueDate = '15/06/2023'; // Base mainnet genesis era
  } else {
    const branches = [
      { name: 'BETAMCHERLA', addr: 'POST BAG NO.2, STATE BANK ROAD, BETAMCHERLA-518599', code: '02696' },
      { name: 'MUMBAI MAIN', addr: 'BOMBAY SAMACHAR MARG, FORT, MUMBAI-400001', code: '00300' },
      { name: 'BENGALURU MAIN', addr: 'POST BAG NO. 5310, ST. MARKS ROAD, BENGALURU-560001', code: '00813' },
      { name: 'KOLKATA MAIN', addr: '1, STRAND ROAD, SAMRiddhi BHAVAN, KOLKATA-700001', code: '00001' },
      { name: 'NEW DELHI MAIN', addr: '11, PARLIAMENT STREET, NEW DELHI-110001', code: '00691' }
    ];
    const branchIdx = numSeed % branches.length;
    const branch = branches[branchIdx];

    state.branchName = branch.name;
    state.branchAddr = branch.addr;
    state.ifsc = `SBIN00${branch.code}`;
    state.nominee = String(numSeed * 12345678).padStart(16, '0');
    state.issueDate = '29/05/2015';
  }
  
  state.relation = '-';
  state.dob = '-';
}

// Convert amount values to selected currency
function formatAmount(ethValue) {
  if (ethValue === 0) return '';
  
  if (state.currency === 'ETH') {
    return ethValue.toFixed(4);
  } else if (state.currency === 'INR') {
    const inrVal = ethValue * state.inrRate;
    return inrVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else { // USD
    const usdVal = ethValue * state.usdRate;
    return usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

// Convert balance amount values to selected currency and append 'Cr' / 'Dr'
function formatBalance(ethValue) {
  const isNegative = ethValue < 0;
  const absVal = Math.abs(ethValue);
  
  let formatted = '';
  if (state.currency === 'ETH') {
    formatted = absVal.toFixed(4);
  } else if (state.currency === 'INR') {
    const inrVal = absVal * state.inrRate;
    formatted = inrVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else { // USD
    const usdVal = absVal * state.usdRate;
    formatted = usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  
  return `${formatted}${isNegative ? 'Dr' : 'Cr'}`;
}

const VINTAGE_PHOTO_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='150' viewBox='0 0 120 150'><rect width='120' height='150' fill='%23dacdb0'/><path d='M60 70c16.5 0 30-13.5 30-30S76.5 10 60 10 30 23.5 30 40s13.5 30 30 30zm0 10c-25 0-45 15-45 35v15h90v-15c0-20-20-35-45-35z' fill='%23705943'/></svg>`;

// ==========================================================================
// 4. API Calls (Market Price and Blockscout Ledger Data)
// ==========================================================================

// Fetches current spot price from Coinbase API
async function fetchMarketPrices() {
  try {
    const [usdRes, inrRes] = await Promise.all([
      fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot'),
      fetch('https://api.coinbase.com/v2/prices/ETH-INR/spot')
    ]);
    const usdData = await usdRes.json();
    const inrData = await inrRes.json();
    
    state.usdRate = parseFloat(usdData.data.amount) || 3500;
    state.inrRate = parseFloat(inrData.data.amount) || 295000;
    console.log(`Live Prices fetched - ETH/USD: $${state.usdRate}, ETH/INR: ₹${state.inrRate}`);
  } catch (e) {
    console.warn("Coinbase spot price fetch failed. Using fallback rates.", e);
  }
}

// Processes transactions list and computes exact balances backwards from the current RPC balance anchor
function processTransactions(rawTxs, balanceHistory, address) {
  const processed = [];
  let currentKnownBalance = state.startingBalance;
  
  // Create lookup map for exact historical balances
  const balanceMap = {};
  if (balanceHistory && balanceHistory.length > 0) {
    balanceHistory.forEach(b => {
      if (b.transaction_hash && b.value) {
        balanceMap[b.transaction_hash.toLowerCase()] = weiToEth(b.value);
      }
    });
  }
  
  rawTxs.forEach((tx) => {
    const isIncoming = tx.to && tx.to.hash.toLowerCase() === address.toLowerCase();
    const valueEth = weiToEth(tx.value);
    const gasFeeEth = weiToEth(tx.fee ? tx.fee.value : '0');
    const txDate = new Date(tx.timestamp);
    const blockNo = tx.block_number || tx.blockNumber || '';
    
    // Check if we have an exact canonical balance for this transaction
    const txHashLower = tx.hash ? tx.hash.toLowerCase() : '';
    if (balanceMap[txHashLower] !== undefined) {
      currentKnownBalance = balanceMap[txHashLower];
    }

    if (!isIncoming) {
      // 1. Gas Fee Row (printed as a separate debit row)
      if (gasFeeEth > 0) {
        processed.push({
          date: formatDate(txDate),
          particular: mapToNarration({ ...tx, isGasOnly: true }, address),
          chqNo: String(blockNo),
          debit: gasFeeEth,
          credit: 0,
          balance: currentKnownBalance,
          hash: tx.hash
        });
      }

      // 2. Transaction Value Row
      if (valueEth > 0) {
        processed.push({
          date: formatDate(txDate),
          particular: mapToNarration(tx, address),
          chqNo: String(blockNo),
          debit: valueEth,
          credit: 0,
          balance: currentKnownBalance,
          hash: tx.hash
        });
      }
    } else {
      // Incoming Credit transaction
      if (valueEth > 0) {
        processed.push({
          date: formatDate(txDate),
          particular: mapToNarration(tx, address),
          chqNo: String(blockNo),
          debit: 0,
          credit: valueEth,
          balance: currentKnownBalance,
          hash: tx.hash
        });
      }
    }
  });

  state.transactions = processed.reverse();
}

// ==========================================================================
// 5. 3D Flipping Animation Page Engine
// ==========================================================================

// Compiles and returns HTML rows for a ledger page
function getLedgerTableHTML(pageIndex) {
  const rowsPerPage = ROWS_PER_PAGE;
  const pageData = state.pages[pageIndex];
  
  if (!pageData) {
    // Fallback: render completely empty rows
    let html = '';
    for (let r = 0; r < rowsPerPage; r++) {
      html += `
        <tr class="ledger-row">
          <td>&nbsp;</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;
    }
    return html;
  }
  
  let html = '';
  let renderCount = 0;
  
  // Render B/F row if page has B/F
  if (pageData.hasBF) {
    html += `
      <tr class="forward-row">
        <td></td>
        <td class="particulars-cell">Brought Forward (B/F)</td>
        <td></td>
        <td></td>
        <td></td>
        <td>${formatBalance(pageData.bfBalance)}</td>
      </tr>
    `;
    renderCount++;
  }
  
  // Render transactions
  pageData.txs.forEach((tx, idx) => {
    let weakClass = '';
    // A subtle dot-matrix visual effect: every 7th or 11th row is slightly weak/blurry
    const globalIdx = pageData.startIndex + idx;
    if (globalIdx % 7 === 0) weakClass = 'ink-weak';
    if (globalIdx % 11 === 0) weakClass = 'ink-blurry';
    
    const explorerPrefix = state.network === 'BASE' ? 'basescan.org' : 'etherscan.io';
    const txLink = tx.hash ? `https://${explorerPrefix}/tx/${tx.hash}` : '';
    const particularsHTML = txLink 
      ? `<a href="${txLink}" target="_blank" rel="noopener noreferrer" class="tx-link">${tx.particular}</a>`
      : tx.particular;
    
    html += `
      <tr class="ledger-row">
        <td class="${weakClass}">${tx.date}</td>
        <td class="particulars-cell ${weakClass}" title="${tx.particular}">${particularsHTML}</td>
        <td class="${weakClass}">${tx.chqNo}</td>
        <td class="${weakClass}">${tx.debit > 0 ? formatAmount(tx.debit) : ''}</td>
        <td class="${weakClass}">${tx.credit > 0 ? formatAmount(tx.credit) : ''}</td>
        <td class="${weakClass}">${formatBalance(tx.balance)}</td>
      </tr>
    `;
    renderCount++;
  });
  
  // Render C/F row if page has C/F
  if (pageData.hasCF) {
    html += `
      <tr class="forward-row">
        <td></td>
        <td class="particulars-cell">Carried Forward (C/F)</td>
        <td></td>
        <td></td>
        <td></td>
        <td>${formatBalance(pageData.cfBalance)}</td>
      </tr>
    `;
    renderCount++;
  }
  
  // Pad with empty rows to fill rowsPerPage
  while (renderCount < rowsPerPage) {
    html += `
      <tr class="ledger-row">
        <td>&nbsp;</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    `;
    renderCount++;
  }
  
  return html;
}

// Compiles the entire inner HTML for a page flap (Header + Watermark + Table + Footer)
function getFlapPageHTML(pageIndex) {
  const isBase = state.network === 'BASE';
  const branchName = state.branchName || (isBase ? 'BASE MAINNET' : 'GENESIS MAINNET');
  const accountNo = state.accountNo || (isBase ? '20230615000' : '20150730000');
  
  return `
    <div class="page">
      <div class="page-content ledger-view">
        <div class="ledger-page-header">
          <span class="ledger-branch-info font-mono">${branchName}</span>
          <span class="ledger-ac-info font-mono">A/C: ${accountNo}</span>
          <span class="ledger-page-num font-mono">${state.pageStartNo + pageIndex}</span>
        </div>
        <div class="sbi-watermark">${WATERMARK_SVG}</div>
        <table class="ledger-table">
          ${TABLE_HEADERS}
          <tbody id="ledger-rows-${pageIndex}">
            ${getLedgerTableHTML(pageIndex)}
          </tbody>
        </table>
        ${pageIndex % 2 === 1 ? `
          <div class="ledger-page-footer">
            <span class="ledger-page-num font-mono">${state.pageStartNo + pageIndex}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

let originalCoverOuterHTML = '';
let originalCoverTopHTML = '';
let originalCoverBottomHTML = '';
let originalCoverBackInsideHTML = '';
let originalCoverBackOutsideHTML = '';

function clearCoverCache() {
  originalCoverOuterHTML = '';
  originalCoverTopHTML = '';
  originalCoverBottomHTML = '';
  originalCoverBackInsideHTML = '';
  originalCoverBackOutsideHTML = '';
}

function updateBankBranding() {
  const isBase = state.network === 'BASE';
  const engTitle = isBase ? 'State Bank of Base' : 'State Bank of India';
  const engTitleUpper = isBase ? 'STATE BANK OF BASE' : 'STATE BANK OF INDIA';
  const hinTitle = isBase ? 'बेस स्टेट बैंक' : 'भारतीय स्टेट बैंक';
  const shortTitle = isBase ? 'SBB' : 'SBI';

  // Update header
  const headerEng = document.querySelector('.sbi-header-text .english-title');
  if (headerEng) headerEng.textContent = engTitle;
  const headerHin = document.querySelector('.sbi-header-text .hindi-title');
  if (headerHin) headerHin.textContent = hinTitle;

  // Update cover
  const coverShort = document.querySelector('.cover-sbi-title');
  if (coverShort) coverShort.textContent = shortTitle;
  const coverEng = document.querySelector('.english-logo-sub');
  if (coverEng) coverEng.textContent = engTitleUpper;
  const coverHin = document.querySelector('.hindi-logo-sub');
  if (coverHin) coverHin.textContent = hinTitle;
  const coverYono = document.getElementById('cover-yono-sbi');
  if (coverYono) coverYono.textContent = shortTitle;

  // Update inner cover
  const innerEng = document.querySelector('.english-logo-text');
  if (innerEng) innerEng.textContent = engTitle;
  const innerHin = document.querySelector('.hindi-logo-text');
  if (innerHin) innerHin.textContent = hinTitle;

  // Update inside back cover
  const backEng = document.querySelector('.english-logo-text-footer');
  if (backEng) backEng.textContent = engTitle;
  const backHin = document.querySelector('.hindi-logo-text-footer');
  if (backHin) backHin.textContent = hinTitle;

  // Update footer paragraph
  const footerP = document.querySelector('.app-footer p');
  if (footerP) {
    footerP.textContent = isBase
      ? 'State Bank of Base Passbook Replica. Maintained for educational and fun blockchain visualizations.'
      : 'State Bank of India Passbook Replica. Maintained for educational and fun blockchain visualizations.';
  }
}


// Empty booklet for initial load (front cover + back cover only)
function initEmptyBooklet() {
  if (!originalCoverTopHTML) {
    const outer = document.getElementById('page-cover-outer');
    const top = document.getElementById('page-cover-top');
    const bottom = document.getElementById('page-cover-bottom');
    const backInside = document.getElementById('page-cover-back-inside');
    const backOutside = document.getElementById('page-cover-back-outside');
    if (outer) originalCoverOuterHTML = outer.outerHTML;
    if (top) originalCoverTopHTML = top.outerHTML;
    if (bottom) originalCoverBottomHTML = bottom.outerHTML;
    if (backInside) originalCoverBackInsideHTML = backInside.outerHTML;
    if (backOutside) originalCoverBackOutsideHTML = backOutside.outerHTML;
  }
  if (pageFlipInstance) {
    try {
      pageFlipInstance.destroy();
    } catch (e) {
      console.warn("Error destroying page flip instance in empty booklet", e);
    }
    pageFlipInstance = null;
  }

  let container = document.getElementById('passbook-booklet');
  if (!container) {
    const wrapper = document.querySelector('.passbook-outer-wrapper');
    if (wrapper) {
      wrapper.innerHTML = `<div class="passbook-booklet" id="passbook-booklet"></div>`;
      container = document.getElementById('passbook-booklet');
    }
  }

  if (!container) return;

  // Render 4 pages: Front Cover + Inner Top + Inner Bottom + Back Cover (Outside) to satisfy PageFlip's 4-page minimum requirement
  container.innerHTML = `
    ${originalCoverOuterHTML}
    ${originalCoverTopHTML}
    ${originalCoverBottomHTML}
    ${originalCoverBackOutsideHTML}
  `;

  // Update elements inside the booklet container before initializing PageFlip
  updateCoverUI();

  console.log('Booklet container inner HTML updated. Children elements:', Array.from(container.children).map(c => ({ id: c.id, className: c.className })));

  pageFlipInstance = new St.PageFlip(document.getElementById('passbook-booklet'), {
    width: 650, height: 780, size: 'stretch',
    minWidth: 350, maxWidth: 650, minHeight: 500, maxHeight: 780,
    drawShadow: true, showCover: true, usePortrait: false, mobileScrollSupport: false
  });

  pageFlipInstance.loadFromHTML(document.querySelectorAll('#passbook-booklet .page'));
  pageNumDisplay.textContent = 'Front Cover';

  pageFlipInstance.on('flip', (e) => {
    playPageFlipSound();
    state.currentPage = e.data;
    if (e.data === 0) {
      pageNumDisplay.textContent = 'Front Cover';
    } else if (e.data === 1) {
      pageNumDisplay.textContent = 'Inside Cover';
    } else {
      pageNumDisplay.textContent = 'Back Cover';
    }
  });
}

// PageFlip.js integration (full booklet with data)
function initPageFlip() {
  if (!originalCoverTopHTML) {
    const outer = document.getElementById('page-cover-outer');
    const top = document.getElementById('page-cover-top');
    const bottom = document.getElementById('page-cover-bottom');
    const backInside = document.getElementById('page-cover-back-inside');
    const backOutside = document.getElementById('page-cover-back-outside');
    if (outer) originalCoverOuterHTML = outer.outerHTML;
    if (top) originalCoverTopHTML = top.outerHTML;
    if (bottom) originalCoverBottomHTML = bottom.outerHTML;
    if (backInside) originalCoverBackInsideHTML = backInside.outerHTML;
    if (backOutside) originalCoverBackOutsideHTML = backOutside.outerHTML;
  }

  if (pageFlipInstance) {
    try {
      pageFlipInstance.destroy();
    } catch (e) {
      console.warn("Error destroying page flip instance", e);
    }
    pageFlipInstance = null;
  }

  // Find the container
  let container = document.getElementById('passbook-booklet');
  if (!container) {
    const wrapper = document.querySelector('.passbook-outer-wrapper');
    if (wrapper) {
      wrapper.innerHTML = `<div class="passbook-booklet" id="passbook-booklet"></div>`;
      container = document.getElementById('passbook-booklet');
    }
  }

  if (!container) {
    console.error("Could not find or recreate passbook-booklet container");
    return;
  }
  
  // Calculate dynamic paginated chunks
  const txs = state.transactions;
  const rowsPerPage = ROWS_PER_PAGE;
  state.pages = [];
  let currentIdx = 0;
  const totalTxs = txs.length;
  let pageIndex = 0;
  
  if (totalTxs === 0) {
    state.pages.push({
      pageIndex: 0,
      startIndex: 0,
      hasBF: false,
      hasCF: false,
      bfBalance: state.startingBalance,
      cfBalance: state.startingBalance,
      txs: []
    });
  } else {
    while (currentIdx < totalTxs) {
      const hasBF = pageIndex > 0;
      let availableRows = rowsPerPage;
      if (hasBF) {
        availableRows -= 1; // B/F row takes 1 slot
      }
      
      const remainingTxs = totalTxs - currentIdx;
      let hasCF = false;
      let txsToPrintCount = remainingTxs;
      
      if (remainingTxs > availableRows) {
        hasCF = true;
        txsToPrintCount = availableRows - 1; // C/F row takes 1 slot
      }
      
      const pageTxs = txs.slice(currentIdx, currentIdx + txsToPrintCount);
      
      let bfBalance = state.startingBalance;
      if (hasBF && currentIdx > 0) {
        bfBalance = txs[currentIdx - 1].balance;
      }
      
      let cfBalance = bfBalance;
      if (pageTxs.length > 0) {
        cfBalance = pageTxs[pageTxs.length - 1].balance;
      }
      
      state.pages.push({
        pageIndex,
        startIndex: currentIdx,
        hasBF,
        hasCF,
        bfBalance,
        cfBalance,
        txs: pageTxs
      });
      
      currentIdx += pageTxs.length;
      pageIndex++;
    }
  }
  
  let totalLedgerPages = state.pages.length;
  if (totalLedgerPages % 2 === 0) {
    // Add empty page for page count parity to align covers correctly
    state.pages.push({
      pageIndex: totalLedgerPages,
      startIndex: txs.length,
      hasBF: true,
      hasCF: false,
      bfBalance: state.pages[totalLedgerPages - 1] ? state.pages[totalLedgerPages - 1].cfBalance : state.startingBalance,
      cfBalance: state.pages[totalLedgerPages - 1] ? state.pages[totalLedgerPages - 1].cfBalance : state.startingBalance,
      txs: []
    });
    totalLedgerPages += 1;
  }
  
  let dynamicPagesHtml = '';
  for (let i = 0; i < totalLedgerPages; i++) {
    dynamicPagesHtml += getFlapPageHTML(i);
  }
  
  // Rebuild container: Outer Front + Inner Top + Inner Bottom + Dynamic Ledger Pages + Inside Back + Outside Back
  container.innerHTML = `
    ${originalCoverOuterHTML}
    ${originalCoverTopHTML}
    ${originalCoverBottomHTML}
    ${dynamicPagesHtml}
    ${originalCoverBackInsideHTML}
    ${originalCoverBackOutsideHTML}
  `;

  // Update elements inside the booklet container before initializing PageFlip
  updateCoverUI();

  // Initialize PageFlip
  pageFlipInstance = new St.PageFlip(document.getElementById('passbook-booklet'), {
    width: 650,   // Each page is 650px; spread = 1300px fits in 1350px container
    height: 780,  // Tall enough for 10 transaction rows + headers + B/F + C/F
    size: 'stretch',
    minWidth: 350,
    maxWidth: 650,
    minHeight: 500,
    maxHeight: 780,
    drawShadow: true,
    showCover: true,
    usePortrait: false,
    mobileScrollSupport: false
  });
  
  pageFlipInstance.loadFromHTML(document.querySelectorAll('#passbook-booklet .page'));
  
  pageFlipInstance.on('flip', (e) => {
    playPageFlipSound();
    state.currentPagePair = Math.floor(e.data / 2);
    
    const totalTxs = state.transactions.length;
    let totalLedgerPages = state.pages.length;
    
    state.currentPage = e.data;
    if (e.data >= 3 && e.data < totalLedgerPages + 3) {
      state.activeView = 'ledger';
    } else {
      state.activeView = 'cover';
    }

    if (e.data === 0) {
      pageNumDisplay.textContent = `Front Cover`;
    } else if (e.data >= totalLedgerPages + 3) {
      pageNumDisplay.textContent = `Back Cover`;
    } else if (e.data === 1) {
      pageNumDisplay.textContent = `Inside Cover`;
    } else {
      const pageL = e.data - 2;
      if (pageL === totalLedgerPages) {
        pageNumDisplay.textContent = `Page ${pageL}`;
      } else {
        const pageR = pageL + 1;
        pageNumDisplay.textContent = `Pages ${pageL}-${pageR}`;
      }
    }
  });
}

function turnPage(direction) {
  if (!pageFlipInstance) return;
  if (direction === 'next') {
    pageFlipInstance.flipNext();
  } else if (direction === 'prev') {
    pageFlipInstance.flipPrev();
  } else if (direction === 'next_to_ledger') {
    pageFlipInstance.flip(3); // Turn to first ledger page
  } else if (direction === 'prev_to_cover') {
    pageFlipInstance.flip(0); // Turn to cover
  }
}

// Render ledger without 3D animation (for initial loading or view changes)
function renderLedgerPagesImmediate() {
  initPageFlip();
}

// ==========================================================================
// 6. View Swapping & Reactive Display Update
// ==========================================================================

function updateCoverUI() {
  const cName = document.getElementById('disp-cust-name');
  if (cName) cName.textContent = state.customerName;
  const cRel = document.getElementById('disp-relation');
  if (cRel) cRel.textContent = state.relation;
  const cAddr = document.getElementById('disp-address');
  if (cAddr) cAddr.textContent = state.address;
  const cDob = document.getElementById('disp-dob');
  if (cDob) cDob.textContent = state.dob;
  const cPhone = document.getElementById('disp-phone');
  if (cPhone) cPhone.textContent = state.phone;
  const cEmail = document.getElementById('disp-email');
  if (cEmail) cEmail.textContent = state.email;
  const aNum = document.getElementById('disp-account-no');
  if (aNum) aNum.textContent = state.accountNo;
  const cCif = document.getElementById('disp-cif');
  if (cCif) cCif.textContent = state.cif;
  const bName = document.getElementById('disp-branch-name');
  if (bName) bName.textContent = state.branchName;
  const bAddr = document.getElementById('disp-branch-addr');
  if (bAddr) bAddr.textContent = state.branchAddr;
  const ifsc = document.getElementById('disp-ifsc');
  if (ifsc) ifsc.textContent = state.ifsc;
  const nom = document.getElementById('disp-nominee');
  if (nom) nom.textContent = state.nominee;
  const iss = document.getElementById('disp-issue-date');
  if (iss) iss.textContent = state.issueDate;
  const mop = document.getElementById('disp-mop');
  if (mop) mop.textContent = state.mop || 'SINGLE';
  
  const photo = document.getElementById('passport-photo');
  if (photo && state.avatarUrl) {
    photo.src = state.avatarUrl;
  }

  // Dynamic stamp/signature text replacement based on network
  const isBase = state.network === 'BASE';
  const photoStampBank = document.getElementById('photo-stamp-bank');
  if (photoStampBank) photoStampBank.textContent = isBase ? 'STATE BANK OF BASE' : 'STATE BANK OF INDIA';
  const photoStampBranch = document.getElementById('photo-stamp-branch');
  if (photoStampBranch) photoStampBranch.textContent = `* ${state.branchName} BR. *`;

  const stampBankTitle = document.getElementById('stamp-bank-title');
  if (stampBankTitle) stampBankTitle.textContent = isBase ? 'STATE BANK OF BASE' : 'STATE BANK OF INDIA';
  const stampBranchTitle = document.getElementById('stamp-branch-title');
  if (stampBranchTitle) stampBranchTitle.textContent = `${state.branchName} BRANCH`;
    // Update logo bank name (English) to match network
  const logoBankSpan = document.querySelector('.english-logo-sub');
  if (logoBankSpan) logoBankSpan.textContent = isBase ? 'STATE BANK OF BASE' : 'STATE BANK OF INDIA';
  // Update Hindi logo bank name
  const hindiLogoSpan = document.querySelector('.hindi-logo-sub');
  if (hindiLogoSpan) hindiLogoSpan.textContent = isBase ? 'बेस स्टेट बैंक' : 'भारतीय स्टेट बैंक';
  const stampSignature = document.getElementById('stamp-signature');
  if (stampSignature) stampSignature.textContent = isBase ? 'jesse.eth' : 'B. Venkatswamy';

  // Dynamic barcode link & text replacement
  const barcodeAddr = document.getElementById('barcode-address');
  const barcodeLink = document.getElementById('barcode-link');
  if (state.currentAddress) {
    if (barcodeAddr) barcodeAddr.textContent = state.currentAddress.slice(0, 10) + '...' + state.currentAddress.slice(-8);
    if (barcodeLink) {
      const targetHref = isBase 
        ? `https://basescan.org/address/${state.currentAddress}`
        : `https://etherscan.io/address/${state.currentAddress}`;
      barcodeLink.href = targetHref;
      barcodeLink.onclick = (e) => {
        e.stopPropagation();
        window.open(targetHref, '_blank');
      };
    }
  } else {
    if (barcodeAddr) barcodeAddr.textContent = '0x00000000...00000000';
    if (barcodeLink) {
      barcodeLink.href = '#';
      barcodeLink.onclick = null;
    }
  }
}

// Switch between Cover Page and Ledger Entries
function toggleView(view) {
  if (state.activeView === view) return;
  
  if (view === 'ledger') {
    if (!state.currentAddress) {
      searchError.textContent = "Please enter an Ethereum address or ENS name first.";
      return;
    }
    turnPage('next_to_ledger');
  } else {
    turnPage('prev_to_cover');
  }
}

// Setup currency and network selectors bindings
function setupBindings() {
  const currencyToggle = document.getElementById('currency-toggle');
  currencyToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.currency-btn');
    if (!btn) return;
    currencyToggle.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.currency = btn.getAttribute('data-currency');
    if (state.activeView === 'ledger' && pageFlipInstance) {
      initPageFlip();
      pageFlipInstance.flip(state.currentPage);
    }
  });

  const networkToggle = document.getElementById('network-toggle');
  networkToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.currency-btn');
    if (!btn) return;
    const nextNetwork = btn.getAttribute('data-network');
    if (state.network === nextNetwork) return;

    networkToggle.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.network = nextNetwork;

    // Toggle body class for CSS transforms/rotations
    if (state.network === 'BASE') {
      document.body.classList.add('network-base');
    } else {
      document.body.classList.remove('network-base');
    }

    // Dynamic bank branding update (header, cover text, footer)
    updateBankBranding();

    // Clear HTML cover cache so the booklet is rebuilt with the correct titles next time
    clearCoverCache();

    // If a wallet is actively loaded, trigger live re-fetch for the new network
    if (state.currentAddress) {
      resolveAndFetch(state.currentAddress);
    } else {
      resetStateToDefaults();
      updateCoverUI();
      // Re-initialize empty booklet so the updated inside cover shows correct text on next flip
      initEmptyBooklet();
    }
  });
}

// ==========================================================================
// 7. ENS Resolving & Ethers.js Records Querying
// ==========================================================================

function resetStateToDefaults() {
  state.currentAddress = '';
  state.currentEns = '';
  state.transactions = [];
  state.pages = [];
  state.currentPagePair = 0;
  state.startingBalance = 0.0;
  
  const isBase = state.network === 'BASE';
  if (isBase) {
    state.customerName = 'JESSE POLLAK';
    state.relation = 'COINBASE INC';
    state.address = 'BLOCK 8453, DECENTRALIZED LAYER 2, ONCHAIN';
    state.dob = '-';
    state.phone = '8453, 420';
    state.email = 'jesse@base.org';
    state.accountNo = '20230615000';
    state.cif = '00000008453';
    state.branchName = 'BASE MAINNET';
    state.branchAddr = 'BUILDERS ROAD, COINBASE DECK, REMOTE';
    state.ifsc = 'SBIN0008453';
    state.nominee = 'VITALIK BUTERIN';
    state.issueDate = '15/06/2023';
  } else {
    state.customerName = 'VITALIK BUTERIN';
    state.relation = 'DMITRY BUTERIN';
    state.address = 'BLOCK 0, GENESIS BLOCK, ETHEREUM MAINNET';
    state.dob = '-';
    state.phone = '1559, 4844';
    state.email = 'vitalik@ethereum.org';
    state.accountNo = '20150730000';
    state.cif = '00000000000';
    state.branchName = 'GENESIS MAINNET';
    state.branchAddr = 'CONSENSUAL HARMONY, ETHEREUM VIRTUAL MACHINE';
    state.ifsc = 'SBIN0000000';
    state.nominee = 'SATOSHI NAKAMOTO';
    state.issueDate = '30/07/2015';
  }
  state.mop = 'SINGLE';
  state.avatarUrl = VINTAGE_PHOTO_SVG;
}

async function resolveAndFetch(inputVal) {
  searchError.textContent = '';
  document.querySelector('.spinner').classList.remove('hidden');
  searchSubmit.disabled = true;
  
  // Reset all state details first so we don't leak old searches
  resetStateToDefaults();
  updateCoverUI();
  renderLedgerPagesImmediate();
  
  try {
    let resolvedAddress = '';
    let ensName = '';
    
    const rpcUrl = RPC_ENDPOINTS[state.network];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const cleanInput = inputVal.trim();
    
    // Start printer sound while resolving and fetching data
    startPrinterSound();
    
    // ENS resolution is typically on Ethereum Mainnet even if network is Base
    // But we will use the selected network provider if it works, or fallback to ETH for ENS
    if (cleanInput.endsWith('.eth')) {
      const ensProvider = state.network === 'BASE' ? new ethers.JsonRpcProvider(RPC_ENDPOINTS['ETH']) : provider;
      resolvedAddress = await ensProvider.resolveName(cleanInput);
      if (!resolvedAddress) {
        throw new Error(`ENS name "${cleanInput}" could not be resolved.`);
      }
      ensName = cleanInput;
    } else if (ethers.isAddress(cleanInput)) {
      resolvedAddress = cleanInput;
      try {
        const ensProvider = state.network === 'BASE' ? new ethers.JsonRpcProvider(RPC_ENDPOINTS['ETH']) : provider;
        ensName = await ensProvider.lookupAddress(resolvedAddress) || '';
      } catch (err) {
        ensName = '';
      }
    } else {
      throw new Error('Please enter a valid Ethereum address (0x...), .eth ENS name, or .base.eth Basename.');
    }
    
    state.currentAddress = resolvedAddress;
    state.currentEns = ensName;
    
    // Set fallback name / deterministic details immediately
    generateDeterministicBankDetails(resolvedAddress);
    if (ensName) {
      state.customerName = ensName.toUpperCase();
      state.address = `A/C HOLDER ENS: ${ensName}\nADDR: ${resolvedAddress.slice(0, 16)}...\nNET: ${state.network === 'BASE' ? 'BASE MAINNET' : 'ETHEREUM MAINNET'}`;
      // For standard .eth names, use ENS metadata service; for .base.eth, we'll resolve via provider later
      if (ensName.endsWith('.base.eth')) {
        state.avatarUrl = null; // Will be fetched via provider.getAvatar in ensPromise
      } else {
        state.avatarUrl = `https://metadata.ens.domains/mainnet/avatar/${ensName}`;
      }
    } else {
      state.customerName = 'MR. WALLET-' + resolvedAddress.slice(2, 10).toUpperCase();
      state.address = `WALLET ADDR: ${resolvedAddress.slice(0, 20)}...\nBRANCH: ${state.network === 'BASE' ? 'BASE MAINNET' : 'ETHEREUM MAINNET'}`;
      state.avatarUrl = VINTAGE_PHOTO_SVG;
    }
    
    // 1. Kick off all network requests concurrently to reduce load time
    const balancePromise = provider.getBalance(resolvedAddress);
    const pricesPromise = fetchMarketPrices();
    const txPromise = fetchTransactions(resolvedAddress);
    const balancesPromise = fetchCoinBalances(resolvedAddress);
    
    let ensPromise = Promise.resolve();
    if (ensName) {
      ensPromise = (async () => {
        try {
          // For .base.eth Base Names, use provider.getAvatar which resolves via CCIP Read
          if (ensName.endsWith('.base.eth')) {
            const ensProvider = new ethers.JsonRpcProvider(RPC_ENDPOINTS['ETH']);
            const avatarUrl = await ensProvider.getAvatar(ensName);
            if (avatarUrl) {
              state.avatarUrl = avatarUrl;
            }
          }

          // Resolve ENS text records (works for both .eth and .base.eth)
          const ensProvider = state.network === 'BASE' ? new ethers.JsonRpcProvider(RPC_ENDPOINTS['ETH']) : provider;
          const resolver = await ensProvider.getResolver(ensName);
          if (resolver) {
            const [email, twitter, phone, description] = await Promise.all([
              resolver.getText('email'),
              resolver.getText('com.twitter').then(v => v || resolver.getText('twitter')),
              resolver.getText('phone'),
              resolver.getText('description')
            ]);
            if (email) state.email = email;
            if (phone) state.phone = phone;
            if (twitter) state.relation = `TWITTER: @${twitter.replace('@', '')}`;
            if (description) state.dob = description;
          }
        } catch (e) {
          console.warn("Failed to retrieve text records for ENS", e);
        }
      })();
    }
    
    // Wait for all fetches
    const [balanceWei, _, txItems, balanceHistoryItems] = await Promise.all([
      balancePromise,
      pricesPromise,
      txPromise,
      balancesPromise,
      ensPromise
    ]);
    
    // 2. Compute starting balance
    state.startingBalance = parseFloat(ethers.formatEther(balanceWei));
    console.log(`Resolved wallet current balance: ${state.startingBalance} ETH`);

    // 3. Process transactions now that startingBalance is set
    if (txItems && txItems.length > 0) {
      processTransactions(txItems, balanceHistoryItems, resolvedAddress);
    } else {
      state.transactions = [];
      throw new Error(`No transactions found for this address on ${state.network} Mainnet.`);
    }
    
    // 4. Try fetching an NFT avatar for the passport photo
    const nftImg = await fetchFirstNFT(resolvedAddress);
    
    if (!state.avatarUrl && ensName) {
      // Fallback for mainnet ENS if getAvatar failed
      state.avatarUrl = `https://metadata.ens.domains/mainnet/avatar/${ensName}`;
    }
    
    if (!state.avatarUrl && nftImg) {
      // No ENS avatar found, fallback to first NFT
      state.avatarUrl = nftImg;
    }
    
    if (!state.avatarUrl) {
      // Absolute fallback
      state.avatarUrl = VINTAGE_PHOTO_SVG;
    }
    
    stopPrinterSound();
    
    // Re-initialize page flip with newly fetched transactions and pristine cover HTML
    renderLedgerPagesImmediate();

    // Update booklet cover page visual text NOW, after the DOM has been rebuilt from the cache
    updateCoverUI();
    
    // Automatically flip open from cover to first ledger page (index 3)
    if (pageFlipInstance) {
      pageFlipInstance.flip(3);
    }
    
  } catch (err) {
    console.error("Resolve Error:", err);
    searchError.textContent = err.message || "Failed to load account details.";
    stopPrinterSound();
  } finally {
    document.querySelector('.spinner').classList.add('hidden');
    searchSubmit.disabled = false;
    
    // Show photocopy button
    const photocopyBtn = document.getElementById('photocopy-btn');
    if (photocopyBtn) photocopyBtn.classList.remove('hidden');
  }
}

// Fetch NFT Avatar
async function fetchFirstNFT(address) {
  try {
    const cleanAddr = address.toLowerCase();
    const prefix = state.network === 'BASE' ? 'base' : 'eth';
    let url = `https://${prefix}.blockscout.com/api/v2/addresses/${cleanAddr}/nft`;
    if (BLOCKSCOUT_KEY) {
      url += `?apikey=${BLOCKSCOUT_KEY}`;
    }
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      console.warn("NFT API returned status:", res.status);
      return null;
    }
    const data = await res.json();
    console.log("NFT data:", data);
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        if (item.image_url) return item.image_url;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch NFTs", e);
  }
  return null;
}

// Fetch transactions via Blockscout Public API with pagination support (avoids CORS preflight blocks)
async function fetchTransactions(address) {
  const cleanAddr = address.toLowerCase();
  let prefix = state.network === 'BASE' ? 'base' : 'eth';
  let allTransactions = [];
  let nextPageParams = null;
  let hasMore = true;
  let pageCount = 0;
  const maxPages = 15; // safety cap of 15 pages (up to 750 txs) to prevent infinite loops

  while (hasMore && pageCount < maxPages) {
    let url = `https://${prefix}.blockscout.com/api/v2/addresses/${cleanAddr}/transactions`;
    
    // Build query params
    const params = new URLSearchParams();
    if (BLOCKSCOUT_KEY) {
      params.append('apikey', BLOCKSCOUT_KEY);
    }
    if (nextPageParams) {
      for (const [key, val] of Object.entries(nextPageParams)) {
        params.append(key, val);
      }
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const res = await fetchWithRetry(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch transactions from blockchain: API error ${res.status}`);
    }

    const data = await res.json();
    if (data.items && data.items.length > 0) {
      allTransactions = allTransactions.concat(data.items);
    }

    if (data.next_page_params && Object.keys(data.next_page_params).length > 0) {
      nextPageParams = data.next_page_params;
      pageCount++;
    } else {
      hasMore = false;
    }
  }

  return allTransactions;
}

// Fetch historical coin balances via Blockscout Public API with pagination support
async function fetchCoinBalances(address) {
  const cleanAddr = address.toLowerCase();
  let prefix = state.network === 'BASE' ? 'base' : 'eth';
  let allBalances = [];
  let nextPageParams = null;
  let hasMore = true;
  let pageCount = 0;
  const maxPages = 15; // safety cap

  while (hasMore && pageCount < maxPages) {
    let url = `https://${prefix}.blockscout.com/api/v2/addresses/${cleanAddr}/coin-balance-history`;
    
    const params = new URLSearchParams();
    if (BLOCKSCOUT_KEY) {
      params.append('apikey', BLOCKSCOUT_KEY);
    }
    if (nextPageParams) {
      for (const [key, val] of Object.entries(nextPageParams)) {
        params.append(key, val);
      }
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const res = await fetchWithRetry(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch coin balances: API error ${res.status}`);
    }

    const data = await res.json();
    if (data.items && data.items.length > 0) {
      allBalances = allBalances.concat(data.items);
    }

    if (data.next_page_params && Object.keys(data.next_page_params).length > 0) {
      nextPageParams = data.next_page_params;
      pageCount++;
    } else {
      hasMore = false;
    }
  }

  return allBalances;
}

// ==========================================================================
// 6. Initialize App & Book Gestures Click Bindings
// ==========================================================================
function init() {
  // Bind form submissions
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = searchInput.value;
    if (val) resolveAndFetch(val);
  });

  // Pagination arrows (trigger 3D flip)
  prevPageBtn.addEventListener('click', () => {
    if (pageFlipInstance) pageFlipInstance.flipPrev();
  });

  nextPageBtn.addEventListener('click', () => {
    if (pageFlipInstance) pageFlipInstance.flipNext();
  });

  // Print Passbook & Photocopy button bindings
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
  const photocopyBtn = document.getElementById('photocopy-btn');
  if (photocopyBtn) {
    photocopyBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Setup initial rates (non-blocking)
  fetchMarketPrices();

  // Setup bindings
  setupBindings();

  // Reset defaults (Vitalik / Jesse depending on network toggle state) and update UI
  resetStateToDefaults();
  updateCoverUI();

  // Setup initial branding (State Bank of India vs State Bank of Base)
  updateBankBranding();
  
  // Initialize empty booklet (front cover + back cover only)
  if (window.St && window.St.PageFlip) {
    initEmptyBooklet();
  }
}

// ==========================================================================
// Sound Effects API
// ==========================================================================
let audioCtx = null;
let printerAudio = new Audio('printer-sound.mp3');
printerAudio.loop = true;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function startPrinterSound() {
  printerAudio.play().catch(e => console.warn(e));
}

function stopPrinterSound() {
  printerAudio.pause();
  printerAudio.currentTime = 0;
}

function playPageFlipSound() {
  try {
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * 0.1; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch(e) {}
}

window.addEventListener('DOMContentLoaded', init);
