/**
 * Generate static chart images for MGA members for bulletin email
 * Run with: npx tsx scripts/generate-mga-charts.ts
 *
 * Outputs to: public/bulletin/feb-2026/mga-countries.svg and mga-lob.svg
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const sharp = require('sharp');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}
const adminDb = admin.firestore();

// Lines of business display names
const LOB_LABELS: Record<string, string> = {
  accident_health: 'Accident & Health',
  aviation: 'Aviation',
  bloodstock: 'Bloodstock',
  casualty: 'Casualty',
  construction: 'Construction',
  cyber: 'Cyber',
  energy: 'Energy',
  event_cancellation: 'Event Cancellation',
  fine_art_specie: 'Fine Art & Specie',
  legal_expenses: 'Legal Expenses',
  life: 'Life',
  livestock: 'Livestock',
  marine: 'Marine',
  management_liability: 'Management Liability',
  motor_commercial: 'Motor, commercial',
  motor_personal: 'Motor, personal',
  pet: 'Pet',
  political_risk: 'Political Risk',
  professional_indemnity: 'Professional Indemnity',
  property_commercial: 'Property, commercial',
  property_personal: 'Property, personal',
  surety: 'Surety',
  trade_credit: 'Trade Credit',
  travel: 'Travel',
  warranty_indemnity: 'Warranty & Indemnity',
  other: 'Other',
  other_2: 'Other #2',
  other_3: 'Other #3',
};

function getLineOfBusinessDisplay(key: string): string {
  return LOB_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Escape special characters for SVG/XML
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Country code to name mapping
const countryNames: Record<string, string> = {
  'AT': 'Austria', 'BE': 'Belgium', 'BG': 'Bulgaria', 'HR': 'Croatia',
  'CY': 'Cyprus', 'CZ': 'Czech Republic', 'DK': 'Denmark', 'EE': 'Estonia',
  'FI': 'Finland', 'FR': 'France', 'DE': 'Germany', 'GR': 'Greece',
  'HU': 'Hungary', 'IE': 'Ireland', 'IT': 'Italy', 'LV': 'Latvia',
  'LT': 'Lithuania', 'LU': 'Luxembourg', 'MT': 'Malta', 'NL': 'Netherlands',
  'PL': 'Poland', 'PT': 'Portugal', 'RO': 'Romania', 'SK': 'Slovakia',
  'SI': 'Slovenia', 'ES': 'Spain', 'SE': 'Sweden', 'GB': 'United Kingdom',
  'CH': 'Switzerland', 'NO': 'Norway', 'IS': 'Iceland', 'LI': 'Liechtenstein'
};

// Chart colors matching FASE report style
const CHART_COLORS = [
  '#2D5574', '#3B7A9E', '#4A9BB5', '#5AABB8', '#6ABFC4',
  '#D4A84B', '#E2B85A', '#F0C86A', '#F5D87A', '#F8E8A0',
];

interface MgaStats {
  mgaCount: number;
  countryCount: number;
  linesOfBusinessCount: number;
  byCountry: Record<string, number>;
  byLinesOfBusiness: Record<string, number>;
}

async function fetchMgaStats(): Promise<MgaStats> {
  console.log('Fetching MGA data from Firestore...');

  const snapshot = await adminDb.collection('accounts').get();

  const byCountry: Record<string, number> = {};
  const byLinesOfBusiness: Record<string, number> = {};
  let mgaCount = 0;

  snapshot.docs.forEach((doc: any) => {
    const data = doc.data();

    // Only count active MGAs (exclude flagged and rejected)
    if (data.organizationType === 'MGA' && data.status !== 'flagged' && data.status !== 'rejected') {
      mgaCount++;

      // Get country
      const country = data.businessAddress?.country || data.registeredAddress?.country;
      if (country) {
        const countryName = countryNames[country] || country;
        byCountry[countryName] = (byCountry[countryName] || 0) + 1;
      }

      // Get lines of business
      if (data.portfolio?.linesOfBusiness) {
        data.portfolio.linesOfBusiness.forEach((lob: string) => {
          const label = getLineOfBusinessDisplay(lob);
          byLinesOfBusiness[label] = (byLinesOfBusiness[label] || 0) + 1;
        });
      }
    }
  });

  return {
    mgaCount,
    countryCount: Object.keys(byCountry).length,
    linesOfBusinessCount: Object.keys(byLinesOfBusiness).length,
    byCountry,
    byLinesOfBusiness
  };
}

function generateDonutChartSVG(data: Record<string, number>, centerLabel: string, size = 300): string {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);

  if (sorted.length === 0 || total === 0) {
    return '<svg></svg>';
  }

  const radius = size / 2 - 20;
  const innerRadius = radius * 0.6;
  const center = size / 2;

  let currentAngle = -90;
  const segments: string[] = [];
  const legend: string[] = [];

  sorted.forEach(([label, count], index) => {
    const percentage = (count / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);
    const x3 = center + innerRadius * Math.cos(endRad);
    const y3 = center + innerRadius * Math.sin(endRad);
    const x4 = center + innerRadius * Math.cos(startRad);
    const y4 = center + innerRadius * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;
    const color = CHART_COLORS[index % CHART_COLORS.length];

    segments.push(`
      <path
        d="M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z"
        fill="${color}"
      />
    `);

    // Legend item
    legend.push(`
      <g transform="translate(${size + 20}, ${30 + index * 28})">
        <rect width="16" height="16" fill="${color}" rx="2" />
        <text x="24" y="13" font-family="'Trebuchet MS', Helvetica, sans-serif" font-size="13" fill="#444444">${escapeXml(label)} (${count})</text>
      </g>
    `);
  });

  const totalWidth = size + 200;

  return `
    <svg width="${totalWidth}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${totalWidth}" height="${size}" fill="#f8f8f8" rx="12" />
      ${segments.join('')}
      <text x="${center}" y="${center - 8}" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="#14252f">${total}</text>
      <text x="${center}" y="${center + 18}" text-anchor="middle" font-family="'Trebuchet MS', Helvetica, sans-serif" font-size="14" fill="#666666">${centerLabel}</text>
      ${legend.join('')}
    </svg>
  `;
}

function generateBarChartSVG(data: Record<string, number>, total: number, maxItems = 8): string {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, maxItems);

  if (sorted.length === 0) {
    return '<svg></svg>';
  }

  const barHeight = 28;
  const gap = 8;
  const labelWidth = 220;
  const chartWidth = 500;
  const chartAreaWidth = chartWidth - labelWidth - 60;
  const height = sorted.length * (barHeight + gap) + 40;
  const maxValue = Math.max(...sorted.map(([, v]) => v));

  const bars: string[] = [];

  sorted.forEach(([label, count], index) => {
    const y = 20 + index * (barHeight + gap);
    const barWidth = (count / maxValue) * chartAreaWidth;
    const percentage = Math.round((count / total) * 100);
    const color = CHART_COLORS[index % CHART_COLORS.length];

    bars.push(`
      <g transform="translate(0, ${y})">
        <text x="${labelWidth - 8}" y="${barHeight / 2 + 5}" text-anchor="end" font-family="'Trebuchet MS', Helvetica, sans-serif" font-size="13" fill="#444444">${escapeXml(label)}</text>
        <rect x="${labelWidth}" y="0" width="${barWidth}" height="${barHeight}" fill="${color}" rx="4" />
        <text x="${labelWidth + barWidth + 8}" y="${barHeight / 2 + 5}" font-family="'Trebuchet MS', Helvetica, sans-serif" font-size="12" fill="#666666">${percentage}%</text>
      </g>
    `);
  });


  return `
    <svg width="${chartWidth}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${chartWidth}" height="${height}" fill="#f8f8f8" rx="12" />
      ${bars.join('')}
    </svg>
  `;
}

async function main() {
  try {
    const stats = await fetchMgaStats();

    console.log('\n📊 MGA Statistics:');
    console.log(`   MGAs: ${stats.mgaCount}`);
    console.log(`   Countries: ${stats.countryCount}`);
    console.log(`   Lines of Business: ${stats.linesOfBusinessCount}`);
    console.log('\n   By Country:', stats.byCountry);
    console.log('\n   By Lines of Business:', stats.byLinesOfBusiness);

    // Generate SVG charts
    const donutSvg = generateDonutChartSVG(stats.byCountry, 'MGAs');
    const barSvg = generateBarChartSVG(stats.byLinesOfBusiness, stats.mgaCount);

    // Output directory
    const outputDir = path.join(process.cwd(), 'public', 'bulletin', 'feb-2026');

    // Write SVG files
    const donutSvgPath = path.join(outputDir, 'mga-countries.svg');
    const barSvgPath = path.join(outputDir, 'mga-lob.svg');
    fs.writeFileSync(donutSvgPath, donutSvg);
    fs.writeFileSync(barSvgPath, barSvg);

    // Convert to PNG using sharp
    console.log('\nConverting to PNG...');

    await sharp(Buffer.from(donutSvg))
      .png()
      .toFile(path.join(outputDir, 'mga-countries.png'));

    await sharp(Buffer.from(barSvg))
      .png()
      .toFile(path.join(outputDir, 'mga-lob.png'));

    console.log('\n✅ Charts generated:');
    console.log(`   ${outputDir}/mga-countries.png`);
    console.log(`   ${outputDir}/mga-lob.png`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
