import React, { useEffect, useMemo, useState } from 'react';
import {
  Scan, UploadCloud, CheckCircle2, AlertCircle, FileText,
  Image, Plus,
  X, ArrowRight, ShieldCheck, History, Minimize2, Search
} from 'lucide-react';
import Button from '../components/Button';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../context/PageTitleContext';
import { createWorker } from 'tesseract.js';

const RECENT_SCANS_KEY = 'em_recent_receipt_scans_v1';
const MAX_FILE_SIZE_MB = 10;

function suggestCategoryFromMerchant(name = '') {
  const n = name.toLowerCase();
  if (/swiggy|zomato|restaurant|cafe|hotel|food|pizza|burger|tea|coffee/.test(n)) return 'Food';
  if (/uber|ola|metro|bus|cab|fuel|petrol|diesel|transport/.test(n)) return 'Transport';
  if (/amazon|flipkart|mall|store|mart|shop/.test(n)) return 'Shopping';
  if (/microsoft|adobe|google|apple|github|aws|software|subscription|saas/.test(n)) return 'Software';
  if (/hardware|tool|equipment|repair/.test(n)) return 'Equipment';
  return 'Other';
}

function detectRecurring(text = '', merchant = '') {
  const blob = `${text} ${merchant}`.toLowerCase();
  return /(netflix|spotify|prime|hotstar|youtube|subscription|monthly|renewal|bill payment)/.test(blob);
}

// ── OCR helpers ───────────────────────────────────────────────────────────────
function extractAmount(text) {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  // ULTRA-ROBUST Net Amount detection (handles broken OCR lines)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();

    if (line.includes('net') && line.includes('amount')) {
      // Case 1: value on same line
      let match = line.match(/(\d+(?:[.,]\d{1,2})?)/);
      if (match) {
        const val = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(val)) {
          return { value: val, sourceLabel: 'Net Amount (same line)' };
        }
      }

      // Case 2: value in next 1-3 lines
      for (let j = 1; j <= 3; j++) {
        const next = lines[i + j];
        if (!next) continue;

        const matchNext = next.match(/(\d+(?:[.,]\d{1,2})?)/);
        if (matchNext) {
          const val = parseFloat(matchNext[1].replace(',', '.'));
          if (!isNaN(val)) {
            return { value: val, sourceLabel: 'Net Amount (multi-line)' };
          }
        }
      }
    }
  }

  // ✅ Handle "Net Amount" on one line and value on next line
for (let i = 0; i < lines.length - 1; i++) {
  const line = lines[i].toLowerCase();

  if (line.includes('net amount')) {
    const nextLine = lines[i + 1];
    const match = nextLine.match(/(\d+(?:[.,]\d{1,2})?)/);

    if (match) {
      const value = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(value)) {
        return {
          value,
          sourceLabel: 'Net Amount (Next Line)',
        };
      }
    }
  }
}

  // STRICT: Directly extract "Net Amount" (highest priority)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].toLowerCase();

    if (line.includes('net amount')) {
      const match = line.match(/(\d+(?:[.,]\d{1,2})?)/);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        if (!Number.isNaN(value)) {
          return {
            value,
            sourceLabel: 'Net Amount (Strict)',
          };
        }
      }
    }
  }

  if (!lines.length) return null;

  const amountRe = /(?:₹|rs\.?|inr)?\s*([\doOlISB,.\s]{1,18})/gi;

  const normalizeLine = (line) =>
    line
      .toLowerCase()
      .replace(/aount/g, 'amount')
      .replace(/amnt/g, 'amount')
      .replace(/amt\b/g, 'amount')
      .replace(/tota1/g, 'total')
      .replace(/gr and/g, 'grand')
      .replace(/[^a-z0-9\s:/.-]/g, ' ');

  const strongPositive = [
    'grand total', 'total amount', 'net amount', 'amount payable',
    'amount due', 'balance due', 'net payable', 'total payable',
    'bill amount', 'final amount', 'to pay', 'total due'
  ];
  const mildPositive = ['total', 'payable', 'due', 'net'];
  const strongNegative = [
    'invoice', 'bill no', 'receipt no', 'order id', 'txn', 'transaction',
    'gstin', 'hsn', 'phone', 'mobile', 'customer', 'date', 'time',
    'subtotal', 'sub total', 'discount', 'change', 'cash', 'round off',
    'saved', 'you save', 'cashback'
  ];
  const mildNegative = ['cgst', 'sgst', 'igst', 'tax', 'qty', 'rate', 'mrp'];

  const normalizeAmountToken = (raw) => {
    if (!raw) return null;

    // Fix common OCR character confusions seen in monetary values.
    let s = String(raw)
      .trim()
      .replace(/[oO]/g, '0')
      .replace(/[lI]/g, '1')
      .replace(/S/g, '5')
      .replace(/B/g, '8')
      .replace(/\s+/g, ' ')
      .replace(/[^\d.,\s]/g, '')
      .trim();

    if (!s) return null;

    const spaceGroups = s.split(' ').filter(Boolean);
    if (spaceGroups.length >= 2 && spaceGroups[spaceGroups.length - 1].length === 2) {
      const head = spaceGroups.slice(0, -1).join('');
      if (/^\d+$/.test(head)) {
        const val = parseFloat(`${head}.${spaceGroups[spaceGroups.length - 1]}`);
        if (!Number.isNaN(val) && val > 0 && val <= 1000000) return val;
      }
    }

    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');

    if (lastDot !== -1 && lastComma !== -1) {
      // If both are present, treat the right-most separator as decimal and strip the other one.
      const decimalPos = Math.max(lastDot, lastComma);
      const decimalSep = s[decimalPos];
      const thousandsSep = decimalSep === '.' ? ',' : '.';
      s = s.replace(new RegExp(`\\${thousandsSep}`, 'g'), '');
      if (decimalSep === ',') s = s.replace(',', '.');
      s = s.replace(/\s+/g, '');
    } else if (lastComma !== -1) {
      const parts = s.split(',');
      if (parts.length === 2 && parts[1].length >= 1 && parts[1].length <= 2) {
        s = `${parts[0].replace(/\s+/g, '')}.${parts[1]}`;
      } else {
        s = s.replace(/,/g, '').replace(/\s+/g, '');
      }
    } else if (lastDot !== -1) {
      const parts = s.split('.');
      if (parts.length === 2 && parts[1].length >= 1 && parts[1].length <= 2) {
        s = `${parts[0].replace(/\s+/g, '')}.${parts[1]}`;
      } else {
        s = s.replace(/\./g, '').replace(/\s+/g, '');
      }
    } else {
      s = s.replace(/\s+/g, '');
    }

    if (!/^\d+(?:\.\d{1,2})?$/.test(s)) return null;

    // NEW: reject unrealistic long numbers
    const digitsOnly = s.replace(/\D/g, '');
    if (digitsOnly.length > 6) return null;

    const val = parseFloat(s);
    if (val > 10000) return null;
    if (Number.isNaN(val) || val <= 0 || val > 1000000) return null;
    return val;
  };

  // Pass -1: regex-first search on full OCR text for common payable labels (with OCR variants).
  const normalizedFull = lines.map((l) =>
    l
      .toLowerCase()
      .replace(/aount/g, 'amount')
      .replace(/amnt/g, 'amount')
      .replace(/amt\b/g, 'amount')
      .replace(/tota1/g, 'total')
      .replace(/gr and/g, 'grand')
  ).join(' ');

  const strictRegexRules = [
    { label: 'Net Amount', regex: /\bnet\s*a(?:m|rn)?ou?nt\b[^\d]{0,24}(\d{1,3}(?:[ ,]\d{2,3})+|\d{1,7}(?:\.\d{1,2})?)/gi },
    { label: 'Grand Total', regex: /\bgrand\s*t(?:o|0)tal\b[^\d]{0,24}(\d{1,3}(?:[ ,]\d{2,3})+|\d{1,7}(?:\.\d{1,2})?)/gi },
    { label: 'Amount Payable', regex: /\bamount\s*payable\b[^\d]{0,24}(\d{1,3}(?:[ ,]\d{2,3})+|\d{1,7}(?:\.\d{1,2})?)/gi },
    { label: 'Total Payable', regex: /\btotal\s*payable\b[^\d]{0,24}(\d{1,3}(?:[ ,]\d{2,3})+|\d{1,7}(?:\.\d{1,2})?)/gi },
    { label: 'Amount Due', regex: /\bamount\s*due\b[^\d]{0,24}(\d{1,3}(?:[ ,]\d{2,3})+|\d{1,7}(?:\.\d{1,2})?)/gi },
    { label: 'Balance Due', regex: /\bbalance\s*due\b[^\d]{0,24}(\d{1,3}(?:[ ,]\d{2,3})+|\d{1,7}(?:\.\d{1,2})?)/gi },
    { label: 'Bill Amount', regex: /\bbill\s*amount\b[^\d]{0,24}(\d{1,3}(?:[ ,]\d{2,3})+|\d{1,7}(?:\.\d{1,2})?)/gi },
    { label: 'Final Amount', regex: /\bfinal\s*amount\b[^\d]{0,24}(\d{1,3}(?:[ ,]\d{2,3})+|\d{1,7}(?:\.\d{1,2})?)/gi },
  ];

  for (const rule of strictRegexRules) {
    const matches = [...normalizedFull.matchAll(rule.regex)];
    if (!matches.length) continue;
    const last = matches[matches.length - 1];
    const value = normalizeAmountToken(last[1]);
    if (value !== null) {
      return { value, sourceLabel: rule.label };
    }
  }

  // Pass 0: strict bottom-up label extraction for payable/final totals.
  const strictLabelRules = [
    { key: 'net amount', label: 'Net Amount' },
    { key: 'amount payable', label: 'Amount Payable' },
    { key: 'total payable', label: 'Total Payable' },
    { key: 'amount due', label: 'Amount Due' },
    { key: 'balance due', label: 'Balance Due' },
    { key: 'grand total', label: 'Grand Total' },
    { key: 'final amount', label: 'Final Amount' },
    { key: 'bill amount', label: 'Bill Amount' },
    { key: 'to pay', label: 'To Pay' },
    { key: 'total amount', label: 'Total Amount' },
  ];

  const strictPickFromLine = (line, ruleKey) => {
    const normalized = normalizeLine(line);
    const idx = normalized.indexOf(ruleKey);
    if (idx === -1) return null;

    const valuesAfterLabel = [];
    amountRe.lastIndex = 0;
    let m = amountRe.exec(line);
    while (m !== null) {
      const cur = m;
      m = amountRe.exec(line);
      const val = normalizeAmountToken(cur[1]);
      if (val === null || val < 1 || val > 1000000) continue;
      if ((cur.index || 0) >= idx) valuesAfterLabel.push({ value: val, idx: cur.index || 0 });
    }

    if (!valuesAfterLabel.length) return null;
    // Prefer right-most value after the label.
    valuesAfterLabel.sort((a, b) => b.idx - a.idx);
    return valuesAfterLabel[0].value;
  };

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    for (const rule of strictLabelRules) {
      const sameLineValue = strictPickFromLine(line, rule.key);
      if (sameLineValue !== null) {
        return { value: sameLineValue, sourceLabel: rule.label };
      }

      // If label is on this line and amount is on next line, check next line.
      const normalized = normalizeLine(line);
      if (!normalized.includes(rule.key)) continue;
      const nextLine = lines[i + 1];
      if (!nextLine) continue;
      const nextValue = strictPickFromLine(nextLine, '');
      if (nextValue !== null) {
        return { value: nextValue, sourceLabel: rule.label };
      }
    }
  }

  const parseLineAmounts = (line) => {
    const out = [];
    amountRe.lastIndex = 0;
    let m = amountRe.exec(line);
    while (m !== null) {
      const cur = m;
      m = amountRe.exec(line);
      const val = normalizeAmountToken(cur[1]);
      if (val === null) continue;
      out.push({ value: val, idx: cur.index || 0, raw: cur[0] || '' });
    }
    return out;
  };

  const pickLabeledAmount = (line, normalized, amounts) => {
    if (!amounts.length) return null;

    const labelHints = [
      { key: 'grand total', label: 'Grand Total' },
      { key: 'total amount', label: 'Total Amount' },
      { key: 'total payable', label: 'Total Payable' },
      { key: 'total due', label: 'Total Due' },
      { key: 'amount payable', label: 'Amount Payable' },
      { key: 'amount due', label: 'Amount Due' },
      { key: 'balance due', label: 'Balance Due' },
      { key: 'net amount', label: 'Net Amount' },
      { key: 'net payable', label: 'Net Payable' },
      { key: 'bill amount', label: 'Bill Amount' },
      { key: 'final amount', label: 'Final Amount' },
      { key: 'to pay', label: 'To Pay' },
    ];

    let labelIdx = -1;
    let matchedLabel = '';
    for (const hint of labelHints) {
      const idx = normalized.indexOf(hint.key);
      if (idx !== -1 && (labelIdx === -1 || idx < labelIdx)) {
        labelIdx = idx;
        matchedLabel = hint.label;
      }
    }

    // Prefer amounts that appear after the label and closest to it.
    if (labelIdx !== -1) {
      const afterLabel = amounts
        .filter((a) => a.idx >= labelIdx)
        .sort((a, b) => a.idx - b.idx);
      if (afterLabel.length) {
        return { amount: afterLabel[0], sourceLabel: matchedLabel };
      }
    }

    // Otherwise prefer right-most amount (typical for bill totals).
    return { amount: [...amounts].sort((a, b) => b.idx - a.idx)[0], sourceLabel: matchedLabel };
  };

  const candidates = [];

  // Pass 1: prioritize explicitly labeled payable/total lines.
  lines.forEach((line, lineIndex) => {
    const normalized = normalizeLine(line);
    const hasStrong = strongPositive.some((k) => normalized.includes(k));
    const hasMild = mildPositive.some((k) => normalized.includes(k));
    const hasNegative = strongNegative.some((k) => normalized.includes(k));

    if (!hasStrong && !hasMild) return;
    if (hasNegative) return;

    const amounts = parseLineAmounts(line).filter((a) => a.value >= 1 && a.value <= 1000000);
    if (amounts.length) {
      const picked = pickLabeledAmount(line, normalized, amounts);
      if (!picked?.amount) return;
      candidates.push({
        value: picked.amount.value,
        score: (hasStrong ? 65 : 42) + (lineIndex >= Math.floor(lines.length * 0.35) ? 6 : 0),
        lineIndex,
        pos: picked.amount.idx,
        sourceLabel: picked.sourceLabel || 'Labeled Total',
      });
      return;
    }

    // Some receipts place the amount on the next line after label.
    const next = lines[lineIndex + 1];
    if (!next) return;
    const nextNorm = normalizeLine(next);
    if (strongNegative.some((k) => nextNorm.includes(k))) return;

    const nextAmounts = parseLineAmounts(next).filter((a) => a.value >= 1 && a.value <= 1000000);
    if (!nextAmounts.length) return;

    const pickedNext = pickLabeledAmount(next, nextNorm, nextAmounts);
    if (!pickedNext?.amount) return;
    candidates.push({
      value: pickedNext.amount.value,
      score: (hasStrong ? 58 : 38) + 4,
      lineIndex: lineIndex + 1,
      pos: pickedNext.amount.idx,
      sourceLabel: pickedNext.sourceLabel || 'Labeled Total',
    });
  });

  // Pass 2: fallback heuristic scoring across all numeric candidates.
  lines.forEach((line, lineIndex) => {
    const normalized = normalizeLine(line);
    const baseScore =
      (strongPositive.some((k) => normalized.includes(k)) ? 16 : 0) +
      (mildPositive.some((k) => normalized.includes(k)) ? 4 : 0) -
      (strongNegative.some((k) => normalized.includes(k)) ? 12 : 0) -
      (mildNegative.some((k) => normalized.includes(k)) ? 4 : 0);

    amountRe.lastIndex = 0;
    let m = amountRe.exec(line);
    while (m !== null) {
      const current = m;
      m = amountRe.exec(line);

      const value = normalizeAmountToken(current[1]);
      if (value === null) continue;
      if (value < 1 || value > 1000000) continue;

      const raw = current[0] || '';
      const digitsOnly = raw.replace(/\D/g, '');
      if (!current[2] && digitsOnly.length >= 8) continue;

      // Avoid dates like 21/03/2026 and times near matched token.
      const left = line.slice(Math.max(0, current.index - 8), current.index + 2);
      const right = line.slice(current.index, Math.min(line.length, current.index + raw.length + 8));
      if (/\d{1,2}[/-]\d{1,2}/.test(left + right) || /\d{1,2}:\d{2}/.test(left + right)) continue;

      let score = baseScore;

      if (/[₹]|\binr\b|\brs\b/i.test(line)) score += 4;
      if ((current.index || 0) > line.length * 0.45) score += 3;
      if (lineIndex >= Math.floor(lines.length * 0.45)) score += 2;
      if (value >= 20 && value <= 75000) score += 2;
      if (value > 200 && value < 2000) score -= 25;
      // ❌ prevent tiny values like 3, 2, 1
      if (value < 10) score -= 30;

      // ❌ prevent large noise
      if (value > 1000) score -= 10;
      // Penalize large values heavily
      if (value > 500) score -= 25;
      // reject absurd large values compared to others
      if (value > 1000) score -= 20;
      if (value > 200000) score -= 8;

      if (/(subtotal|discount|save|cashback)/i.test(normalized)) {
      score -= 15;
    }

      if (value < 5 && /(saved|save|discount|cashback|round off)/i.test(normalized)) score -= 20;
      if (/(net amount)/i.test(normalized)) score += 100;
      else if (/(grand total|amount payable|final amount|bill amount)/i.test(normalized)) score += 40;

      const numericChunks = (line.match(/\d+(?:[.,]\d+)?/g) || []).length;
      if (/(qty|quantity|rate|mrp|unit|price|sales return|tax invoice)/i.test(normalized) && numericChunks >= 3) {
        score -= 28;
      }

      candidates.push({ value, score, lineIndex, pos: current.index || 0, sourceLabel: '' });
    }
  });

if (!candidates.length) return null;

// ✅ Step 1: Prefer strongly labeled totals
let finalPool = candidates.filter(c =>
  /(net amount|amount payable|final amount|grand total)/i.test(c.sourceLabel || '')
);

if (!finalPool.length) {
  finalPool = candidates.filter(c => c.sourceLabel); // fallback
}

if (!finalPool.length) {
  finalPool = candidates;
}

// ✅ Step 2: Focus on bottom of receipt
const maxLine = Math.max(...finalPool.map(c => c.lineIndex));
finalPool = finalPool.filter(c => c.lineIndex >= maxLine - 4);

// ✅ Step 3: Remove tiny values (IMPORTANT FIX)
finalPool = finalPool.filter(c => c.value >= 10);

// ✅ Step 4: Remove unrealistic large values
finalPool = finalPool.filter(c => c.value <= 10000);

// ✅ Step 5: Sort by score first
finalPool.sort((a, b) => b.score - a.score);

// ✅ Step 6: From top candidates → pick smallest reasonable
const topScore = finalPool[0].score;
const topCandidates = finalPool.filter(c => c.score >= topScore - 5);

topCandidates.sort((a, b) => a.value - b.value);

return {
  value: topCandidates[0].value,
  sourceLabel: topCandidates[0].sourceLabel || '',
};

}

function extractMerchant(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.length < 3) continue;
    if (/^\d[\d\W]*$/.test(line)) continue;
    if (/invoice|receipt|bill|tax|gst|date|time/i.test(line)) continue;
    return line.replace(/[^a-zA-Z0-9&'. -]/g, '').trim() || line;
  }
  return 'Unknown Merchant';
}

function extractDate(text) {
  const dateMask = /\b((?:19|20)\d\d[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.](?:19|20)?\d\d)\b/gi;
  const match = text.match(dateMask);
  if (match && match.length) {
    const raw = match[0].replace(/[/.]/g, '-');
    const parts = raw.split('-');
    if (parts.length === 3) {
      try {
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          const p3 = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          const p2 = parseInt(parts[1], 10);
          if (p2 > 12) {
            return `${p3}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          } else {
            return `${p3}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      } catch {
        // ignore invalid date parses from OCR noise
      }
    }
  }
  return new Date().toISOString().split('T')[0];
}

// ── OCR on image ──────────────────────────────────────────────────────────────
async function ocrImage(source, onProgress) {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress(Math.round(m.progress * 100), `Reading text… ${Math.round(m.progress * 100)}%`);
      } else {
        onProgress(null, m.status);
      }
    },
  });
  onProgress(null, 'Analysing image…');
  const { data } = await worker.recognize(source);

  let ocrData = data;
  if (data.orientation && data.orientation.deg !== 0) {
    const { data: rotated } = await worker.recognize(source, {
      rotateAuto: true,
    });
    ocrData = rotated;
  }

  await worker.terminate();
  return ocrData;
}

const ReceiptScanner = () => {
  usePageTitle('Receipt');
  const navigate = useNavigate();
  const { currencySymbol } = useSettings();

  // shared
  const [isScanning, setIsScanning]   = useState(false);
  const [progress, setProgress]       = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [dragActive, setDragActive]   = useState(false);
  const [uploadPulse, setUploadPulse] = useState(false);
  const [scanResults, setScanResults] = useState([]); // array of results (multi-image)
  const [activeResult, setActiveResult] = useState(0);
  const [recentScans, setRecentScans] = useState([]);
  const [resultSearch, _setResultSearch] = useState('');
  const [resultSort, _setResultSort] = useState('newest');

  // multi-image upload
  const [files, setFiles]             = useState([]); // array of {file, preview}

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_SCANS_KEY);
      if (raw) setRecentScans(JSON.parse(raw));
    } catch {
      setRecentScans([]);
    }
  }, []);

  // ── OCR runner ───────────────────────────────────────────────────────────────
  const progressCb = (pct, msg) => {
    if (pct !== null) setProgress(pct);
    setProgressMsg(msg);
  };

  const runOCROnFiles = async () => {
    if (!files.length) return;
    setIsScanning(true);
    setProgress(0);
    setProgressMsg('Starting…');
    const results = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setProgressMsg(`Processing image ${i + 1} of ${files.length}…`);
        const source = files[i].isDataUrl ? files[i].preview : files[i].file;
        const data = await ocrImage(source, progressCb);
        const text = data?.text || '';
        const amountMeta = extractAmount(text);
        const amount = amountMeta?.value ?? null;
        const merchant = extractMerchant(text);
        const date     = extractDate(text);
        const suggestedCategory = suggestCategoryFromMerchant(merchant);
        const recurring = detectRecurring(text, merchant);
        results.push({
          imageIndex: i,
          merchant,
          date,
          total: amount ?? 0,
          found: amount !== null,
          amountSourceLabel: amountMeta?.sourceLabel || '',
          confidence: Number(data?.confidence || 0),
          suggestedCategory,
          recurring,
          rawText: text,
          preview: files[i].preview,
        });
      }
      setScanResults(results);
      setActiveResult(0);
      const stamped = results.map((r) => ({
        merchant: r.merchant,
        total: r.total,
        date: r.date,
        confidence: r.confidence,
        amountSourceLabel: r.amountSourceLabel,
        suggestedCategory: r.suggestedCategory,
        preview: r.preview,
        scannedAt: new Date().toISOString(),
      }));
      const updated = [...stamped, ...recentScans].slice(0, 18);
      setRecentScans(updated);
      localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updated));
    } catch (err) {
      alert('OCR failed: ' + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  // ── File management ───────────────────────────────────────────────────────────
  const addFiles = (newFiles) => {
    const asArray = Array.from(newFiles);
    const tooBig = asArray.find((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (tooBig) {
      alert(`"${tooBig.name}" is larger than ${MAX_FILE_SIZE_MB}MB. Please choose a smaller image.`);
      return;
    }

    const added = asArray.map(f => ({
      id: Date.now() + Math.random(),
      file: f,
      preview: URL.createObjectURL(f),
      isDataUrl: false,
    }));
    setFiles(prev => [...prev, ...added]);
    setScanResults([]);
    setUploadPulse(true);
    setTimeout(() => setUploadPulse(false), 900);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setScanResults([]);
  };

  const updateActiveResult = (patch) => {
    setScanResults((prev) => prev.map((r, i) => (i === activeResult ? { ...r, ...patch } : r)));
  };

  const _managedResults = useMemo(() => {
    const q = resultSearch.trim().toLowerCase();
    let arr = [...scanResults];
    if (q) {
      arr = arr.filter((r) => `${r.merchant} ${r.date} ${r.suggestedCategory}`.toLowerCase().includes(q));
    }
    if (resultSort === 'amount_desc') arr.sort((a, b) => b.total - a.total);
    if (resultSort === 'amount_asc') arr.sort((a, b) => a.total - b.total);
    if (resultSort === 'confidence') arr.sort((a, b) => b.confidence - a.confidence);
    return arr;
  }, [scanResults, resultSearch, resultSort]);

  // ── UI pieces ────────────────────────────────────────────────────────────────
  const ScanningUI = () => (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'1.1rem', padding:'3rem 1.5rem' }}>
      <div style={{ width:'52px', height:'52px', border:'3px solid rgba(59,130,246,0.25)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
      <h3 style={{ fontSize:'1.1rem', fontWeight:700 }}>Receipt</h3>
      <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', textAlign:'center' }}>{progressMsg}</p>
      <div style={{ width:'100%', maxWidth:'320px', background:'var(--surface-soft)', borderRadius:'99px', height:'5px', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,var(--primary),var(--accent))', transition:'width 0.3s ease', borderRadius:'99px' }}/>
      </div>
      <p style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>100% on-device · No internet needed</p>
    </div>
  );

  const currentResult = scanResults[activeResult];

  const scanHistoryClick = () => {
    if (!recentScans.length) {
      alert('No scan history yet.');
      return;
    }
    alert(`Saved scans: ${recentScans.length}`);
  };

  const panelStyle = {
    border: '1px solid var(--glass-border)',
    borderRadius: '14px',
    background: 'var(--surface-1)',
    padding: '1rem',
  };

  const inputBorder = dragActive ? 'var(--primary)' : 'rgba(100,116,139,0.28)';

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth:'1020px', margin:'0 auto' }}>
      <div className="page-header page-header-desktop" style={{ marginBottom:'0.7rem' }}>
        <div>
          <h1>Receipt scanner</h1>
          <p>Upload receipt images - OCR auto-fills your expense form.</p>
        </div>
        <button type="button" onClick={scanHistoryClick} style={{ border:'1px solid var(--glass-border)', background:'var(--chip-bg)', borderRadius:'10px', padding:'0.55rem 0.85rem', color:'var(--text-main)', display:'inline-flex', alignItems:'center', gap:'0.4rem', fontSize:'0.95rem' }}>
          <History size={15} /> Scan history
        </button>
      </div>

      <div style={{ display:'inline-flex', alignItems:'center', gap:'0.45rem', marginBottom:'0.8rem', background:'rgba(34,197,94,0.14)', color:'#3d7f1d', border:'1px solid rgba(34,197,94,0.25)', borderRadius:'999px', padding:'0.25rem 0.75rem', fontSize:'0.82rem', fontWeight:600 }}>
        <ShieldCheck size={15} /> On-device OCR - no data sent to server
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:'0.6rem', marginBottom:'0.85rem' }}>
        {[
          ['💡', 'Flat, well-lit receipts work best'],
          [<Minimize2 key="a" size={18} color="#7c6fb1" />, 'Keep text fully in frame'],
          [<Search key="b" size={18} color="#7c6fb1" />, 'Minimum 300px for accuracy'],
          [<FileText key="c" size={18} color="#7c6fb1" />, 'PDF, PNG, JPG, WEBP supported'],
        ].map(([icon, text], i) => (
          <div key={i} style={{ ...panelStyle, textAlign:'center', padding:'0.85rem 0.75rem' }}>
            <div style={{ fontSize:'1.1rem', marginBottom:'0.45rem' }}>{icon}</div>
            <p style={{ fontSize:'0.96rem', color:'var(--text-sub)' }}>{text}</p>
          </div>
        ))}
      </div>

      <input type="file" id="multi-upload" style={{ display:'none' }} multiple accept="image/*,.pdf"
        onChange={e => { if (e.target.files.length) { addFiles(e.target.files); e.target.value=''; } }} />
      <div className="responsive-grid-equal" style={{ alignItems:'stretch', gap:'0.8rem' }}>
        <section style={panelStyle}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
            onClick={() => document.getElementById('multi-upload').click()}
            style={{ border:`2px dashed ${inputBorder}`, borderRadius:'12px', background:'var(--surface-soft)', padding:'2.2rem 1rem', textAlign:'center', cursor:'pointer', transition:'var(--transition)' }}
          >
            {isScanning ? (
              <ScanningUI />
            ) : (
              <>
                <div style={{ width:'48px', height:'48px', borderRadius:'12px', background:'rgba(139,92,246,0.12)', color:'#7c6fb1', display:'grid', placeItems:'center', margin:'0 auto 0.7rem', transform: uploadPulse ? 'scale(1.08)' : 'scale(1)', transition:'transform 0.28s' }}>
                  <FileText size={24} />
                </div>
                <h3 style={{ fontSize:'2rem', lineHeight:1.12, marginBottom:'0.35rem', fontWeight:500 }}>Drag & drop receipts here</h3>
                <p style={{ fontSize:'1.02rem', color:'var(--text-sub)', marginBottom:'0.95rem' }}>Or click anywhere to browse - select multiple at once</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem', maxWidth:'420px', margin:'0 auto 0.85rem' }}>
                  <button type="button" onClick={(e) => { e.stopPropagation(); document.getElementById('multi-upload').click(); }} style={{ border:'1px solid var(--glass-border)', background:'var(--chip-bg-strong)', borderRadius:'12px', padding:'0.65rem 0.6rem', fontSize:'1rem', color:'var(--text-main)', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'0.35rem' }}>
                    <UploadCloud size={16} /> Browse files
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); document.getElementById('multi-upload').click(); }} style={{ border:'1px solid var(--glass-border)', background:'var(--chip-bg-strong)', borderRadius:'12px', padding:'0.65rem 0.6rem', fontSize:'1rem', color:'var(--text-main)', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'0.35rem' }}>
                    <Image size={16} /> Open gallery
                  </button>
                </div>
                <div style={{ display:'flex', gap:'0.4rem', justifyContent:'center', flexWrap:'wrap' }}>
                  {['PNG', 'JPG', 'JPEG', 'WEBP', 'PDF'].map((t) => (
                    <span key={t} style={{ border:'1px solid var(--glass-border)', background:'var(--chip-bg)', borderRadius:'999px', padding:'0.12rem 0.55rem', fontSize:'0.76rem', color:'var(--text-muted)' }}>{t}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {files.length > 0 && !isScanning && (
            <div style={{ marginTop:'0.8rem' }}>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.45rem', marginBottom:'0.65rem' }}>
                {files.slice(0, 8).map((f) => (
                  <div key={f.id} style={{ width:'70px', height:'70px', borderRadius:'10px', overflow:'hidden', border:'1px solid var(--glass-border)', position:'relative', background:'var(--chip-bg)' }}>
                    <img src={f.preview} alt="receipt" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    <button type="button" onClick={() => removeFile(f.id)} style={{ position:'absolute', right:'4px', top:'4px', width:'18px', height:'18px', borderRadius:'999px', border:'none', background:'rgba(0,0,0,0.65)', color:'white', display:'grid', placeItems:'center' }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                <Button size="sm" icon={<Scan size={14} />} onClick={runOCROnFiles}>Scan now</Button>
                <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => document.getElementById('multi-upload').click()}>Add more</Button>
              </div>
            </div>
          )}
        </section>

        <section style={{ ...panelStyle, display:'flex', alignItems:'center', justifyContent:'center', minHeight:'380px' }}>
          {!currentResult ? (
            <div style={{ textAlign:'center', maxWidth:'360px' }}>
              <div style={{ width:'64px', height:'64px', borderRadius:'16px', background:'rgba(59,130,246,0.14)', color:'#3655a4', display:'grid', placeItems:'center', margin:'0 auto 0.8rem' }}>
                <Search size={34} />
              </div>
              <h3 style={{ fontSize:'2rem', lineHeight:1.15, fontWeight:500, marginBottom:'0.45rem' }}>Scan results appear here</h3>
              <p style={{ color:'var(--text-sub)', fontSize:'1.02rem' }}>Upload a receipt on the left and OCR will auto-extract the merchant name, amount, date, and category.</p>
            </div>
          ) : (
            <div style={{ width:'100%' }}>
              {scanResults.length > 1 && (
                <div style={{ display:'flex', gap:'0.42rem', flexWrap:'wrap', marginBottom:'0.75rem' }}>
                  {scanResults.map((r, i) => (
                    <button key={i} type="button" onClick={() => setActiveResult(i)} style={{ border:'1px solid var(--glass-border)', borderRadius:'999px', padding:'0.24rem 0.6rem', background:i === activeResult ? '#1561ad' : 'var(--chip-bg)', color:i === activeResult ? 'white' : 'var(--text-main)', fontSize:'0.8rem' }}>
                      Receipt {i + 1}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.65rem', marginBottom:'0.72rem' }}>
                <div style={{ border:'1px solid var(--glass-border)', borderRadius:'10px', overflow:'hidden', background:'var(--surface-soft)', minHeight:'170px', display:'grid', placeItems:'center' }}>
                  {currentResult.preview ? (
                    <img src={currentResult.preview} alt="Receipt preview" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  ) : (
                    <FileText size={44} style={{ color:'var(--text-muted)' }} />
                  )}
                </div>
                <div style={{ border:'1px solid var(--glass-border)', borderRadius:'10px', background:'var(--surface-soft)', padding:'0.6rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.42rem', marginBottom:'0.45rem' }}>
                    {currentResult.found ? <CheckCircle2 size={18} color="#16a34a" /> : <AlertCircle size={18} color="#d97706" />}
                    <strong style={{ fontSize:'0.92rem' }}>{currentResult.found ? 'Amount detected' : 'Amount not detected'}</strong>
                  </div>
                  <p style={{ fontSize:'2rem', lineHeight:1.05, marginBottom:'0.4rem', color: currentResult.found ? '#15803d' : 'var(--text-main)' }}>
                    {currencySymbol}{Number(currentResult.total || 0).toFixed(2)}
                  </p>
                  <div style={{ marginBottom:'0.45rem' }}>
                    <label style={{ display:'block', fontSize:'0.76rem', color:'var(--text-muted)', marginBottom:'0.18rem' }}>
                      Correct amount (if needed)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={Number(currentResult.total || 0)}
                      onChange={(e) => {
                        const val = Number(e.target.value || 0);
                        updateActiveResult({ total: Number.isFinite(val) ? val : 0, found: true, amountSourceLabel: 'Manual edit' });
                      }}
                      style={{ width:'100%', padding:'0.45rem 0.58rem', borderRadius:'8px', border:'1px solid var(--glass-border)', background:'var(--surface-2)', color:'var(--text-main)', outline:'none' }}
                    />
                  </div>
                  {currentResult.amountSourceLabel && (
                    <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'0.35rem' }}>
                      Detected from: <strong style={{ color:'var(--text-sub)' }}>{currentResult.amountSourceLabel}</strong>
                    </p>
                  )}
                  <p style={{ fontSize:'0.82rem', color:'var(--text-sub)', marginBottom:'0.2rem' }}>Merchant: <strong style={{ color:'var(--text-main)' }}>{currentResult.merchant}</strong></p>
                  <p style={{ fontSize:'0.82rem', color:'var(--text-sub)', marginBottom:'0.2rem' }}>Date: <strong style={{ color:'var(--text-main)' }}>{currentResult.date}</strong></p>
                  <p style={{ fontSize:'0.82rem', color:'var(--text-sub)' }}>Category: <strong style={{ color:'var(--text-main)' }}>{currentResult.suggestedCategory}</strong></p>
                </div>
              </div>

              <div style={{ display:'flex', gap:'0.55rem', flexWrap:'wrap' }}>
                <Button variant="secondary" size="sm" onClick={() => { setScanResults([]); }}>Back</Button>
                <Button size="sm" icon={<ArrowRight size={14} />} onClick={() => navigate('/add-expense', { state: { scanResult: currentResult } })}>Add expense</Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ReceiptScanner;