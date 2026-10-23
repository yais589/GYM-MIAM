// Generador de PDF para los informes administrativos.
// Reutiliza el lenguaje visual de los planes (planPdf.js): cabecera oscura,
// tarjetas de métricas, tablas con filas alternas y pie de página numerado.

import PDFDocument from 'pdfkit';

const COLORS = {
  ink: '#173b43',
  teal: '#2d8b87',
  mint: '#e9f7f3',
  orange: '#d88b51',
  text: '#334e52',
  muted: '#6b7f82',
  line: '#d8e8e4',
  white: '#ffffff'
};

const PAGE = { width: 595.28, height: 841.89, margin: 38 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const CONTENT_TOP = 124;
const CONTENT_BOTTOM = PAGE.height - 52;
const METRIC_HEIGHT = 48;
const METRIC_GAP = 7;

const LABELS = {
  es: {
    brand: 'TITAN GYM · INFORME ADMINISTRATIVO',
    period: 'Periodo',
    generated: 'Generado',
    page: 'Página',
    noData: 'Sin datos en este periodo.',
    notes: 'Notas'
  },
  en: {
    brand: 'TITAN GYM · ADMIN REPORT',
    period: 'Period',
    generated: 'Generated',
    page: 'Page',
    noData: 'No data for this period.',
    notes: 'Notes'
  }
};

const value = (input) => String(input ?? '—');

function roundedBox(doc, x, y, width, height, color, radius = 8) {
  doc.save().roundedRect(x, y, width, height, radius).fillColor(color).fill().restore();
}

function drawHeader(doc, report, labels) {
  doc.rect(0, 0, PAGE.width, 104).fillColor(COLORS.ink).fill();
  doc.circle(PAGE.width - 56, 44, 28).fillColor(COLORS.teal).fill();
  doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.white).text('TITAN', PAGE.margin, 22);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#f0bf67').text(labels.brand, PAGE.margin + 2, 44);
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.white)
    .text(value(report.title), PAGE.margin, 62, { width: CONTENT_WIDTH - 60, height: 18, ellipsis: true });
  doc.font('Helvetica').fontSize(7.5).fillColor('#b8d8d3')
    .text(`${value(report.subtitle)} · ${labels.period}: ${value(report.range?.label)}`, PAGE.margin, 84, {
      width: CONTENT_WIDTH - 60,
      height: 12,
      ellipsis: true
    });
}

function drawFooter(doc, pageNumber, labels, report) {
  const y = PAGE.height - 34;
  doc.moveTo(PAGE.margin, y - 8).lineTo(PAGE.width - PAGE.margin, y - 8)
    .strokeColor(COLORS.line).lineWidth(0.6).stroke();
  const generated = report.generatedAt
    ? new Date(report.generatedAt).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
    : '';
  doc.font('Helvetica').fontSize(7).fillColor(COLORS.muted)
    .text(`${labels.generated}: ${generated}`, PAGE.margin, y, { width: 260, height: 10 });
  doc.font('Helvetica').fontSize(7).fillColor(COLORS.muted)
    .text(`${labels.page} ${pageNumber}`, PAGE.width - PAGE.margin - 80, y, { width: 80, align: 'right', height: 10 });
}

function drawSectionTitle(doc, title) {
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.ink)
    .text(value(title), PAGE.margin, doc.y, { width: CONTENT_WIDTH, height: 14, ellipsis: true });
  doc.moveTo(PAGE.margin, doc.y + 3).lineTo(PAGE.margin + 42, doc.y + 3)
    .strokeColor(COLORS.orange).lineWidth(2).stroke();
  doc.y += 12;
}

function drawMetrics(doc, metrics, nextPage) {
  const list = (metrics || []).slice(0, 9);
  if (!list.length) return;
  const perRow = 3;
  const width = (CONTENT_WIDTH - METRIC_GAP * (perRow - 1)) / perRow;
  const rows = Math.ceil(list.length / perRow);
  const needed = rows * (METRIC_HEIGHT + METRIC_GAP) + 6;
  if (doc.y + needed > CONTENT_BOTTOM) nextPage();

  const top = doc.y;
  list.forEach((metric, index) => {
    const row = Math.floor(index / perRow);
    const column = index % perRow;
    const x = PAGE.margin + column * (width + METRIC_GAP);
    const y = top + row * (METRIC_HEIGHT + METRIC_GAP);
    roundedBox(doc, x, y, width, METRIC_HEIGHT, metric.accent ? '#fff1e4' : COLORS.mint);
    doc.font('Helvetica-Bold').fontSize(12.5).fillColor(COLORS.teal)
      .text(value(metric.value), x + 8, y + 9, { width: width - 16, height: 16, ellipsis: true });
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.text)
      .text(value(metric.label), x + 8, y + 29, { width: width - 16, height: 11, ellipsis: true });
  });
  doc.y = top + rows * (METRIC_HEIGHT + METRIC_GAP) + 8;
}

function drawTableHeader(doc, columns, y, height) {
  roundedBox(doc, PAGE.margin, y, CONTENT_WIDTH, height, COLORS.ink, 4);
  let x = PAGE.margin;
  for (const column of columns) {
    doc.font('Helvetica-Bold').fontSize(6.8).fillColor(COLORS.white)
      .text(value(column.label), x + 4, y + 7, {
        width: column.width - 8,
        height: 9,
        ellipsis: true,
        align: column.align || 'left'
      });
    x += column.width;
  }
  return y + height;
}

function drawTable(doc, section, labels, nextPage) {
  const columns = Array.isArray(section.columns) ? section.columns : [];
  const rows = Array.isArray(section.rows) ? section.rows : [];
  const rowHeight = section.rowHeight || 18;
  const headerHeight = 20;

  if (!rows.length) {
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLORS.muted)
      .text(labels.noData, PAGE.margin, doc.y, { width: CONTENT_WIDTH, height: 12 });
    doc.y += 16;
    return;
  }

  if (doc.y + headerHeight + rowHeight > CONTENT_BOTTOM) nextPage();
  let y = drawTableHeader(doc, columns, doc.y, headerHeight);

  rows.forEach((row, index) => {
    if (y + rowHeight > CONTENT_BOTTOM) {
      nextPage();
      y = drawTableHeader(doc, columns, doc.y, headerHeight);
    }
    doc.lineWidth(0.3).rect(PAGE.margin, y, CONTENT_WIDTH, rowHeight)
      .fillAndStroke(index % 2 ? COLORS.white : '#f4faf8', COLORS.line);
    let x = PAGE.margin;
    for (const column of columns) {
      doc.font('Helvetica').fontSize(column.fontSize || 7).fillColor(COLORS.text)
        .text(value(row[column.key]), x + 4, y + (rowHeight - 8) / 2, {
          width: column.width - 8,
          height: rowHeight - 5,
          ellipsis: true,
          align: column.align || 'left'
        });
      x += column.width;
    }
    y += rowHeight;
  });

  doc.y = y + 12;
}

function drawNotes(doc, notes, labels, nextPage) {
  const list = (notes || []).filter(Boolean);
  if (!list.length) return;
  doc.font('Helvetica').fontSize(7.5);
  const needed = list.reduce((sum, note) => sum + doc.heightOfString(note, { width: CONTENT_WIDTH - 18 }) + 5, 16);
  if (doc.y + Math.min(needed, 140) > CONTENT_BOTTOM) nextPage();

  drawSectionTitle(doc, labels.notes);
  for (const note of list) {
    const height = doc.heightOfString(note, { width: CONTENT_WIDTH - 18 });
    if (doc.y + height > CONTENT_BOTTOM) nextPage();
    const top = doc.y;
    roundedBox(doc, PAGE.margin, top, CONTENT_WIDTH, height + 10, '#f7f4ef', 5);
    doc.rect(PAGE.margin, top, 3, height + 10).fillColor(COLORS.orange).fill();
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.text)
      .text(note, PAGE.margin + 10, top + 5, { width: CONTENT_WIDTH - 20, height: height, ellipsis: true });
    doc.y = top + height + 15;
  }
}

function renderReport(doc, report, labels) {
  let pageNumber = 0;
  const nextPage = () => {
    doc.addPage();
    pageNumber += 1;
    drawHeader(doc, report, labels);
    drawFooter(doc, pageNumber, labels, report);
    doc.y = CONTENT_TOP;
  };

  nextPage();
  drawMetrics(doc, report.metrics, nextPage);

  for (const section of report.sections || []) {
    if (doc.y + 26 > CONTENT_BOTTOM) nextPage();
    drawSectionTitle(doc, section.title);
    drawTable(doc, section, labels, nextPage);
    if (section.note) {
      doc.font('Helvetica-Oblique').fontSize(7).fillColor(COLORS.muted)
        .text(section.note, PAGE.margin, doc.y, { width: CONTENT_WIDTH, height: 20, ellipsis: true });
      doc.y += 12;
    }
  }

  drawNotes(doc, report.notes, labels, nextPage);
}

/**
 * Construye el PDF de un informe ya agregado.
 * @param {object} report modelo devuelto por buildReport()
 * @param {'es'|'en'} language
 * @returns {Promise<Buffer>}
 */
export function createReportPdf(report, language = 'es') {
  const labels = LABELS[language === 'en' ? 'en' : 'es'];
  const doc = new PDFDocument({
    size: 'A4',
    margin: PAGE.margin,
    autoFirstPage: false,
    bufferPages: true,
    info: {
      Title: `TITAN GYM · ${value(report.title)}`,
      Author: 'TITAN GYM',
      Subject: value(report.range?.label)
    }
  });
  const chunks = [];
  const done = new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  renderReport(doc, report, labels);
  doc.end();
  return done;
}

export default createReportPdf;
