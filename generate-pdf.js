#!/usr/bin/env node

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generatePDF() {
  let browser;
  try {
    console.log('Iniciando navegador...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Configurar tamaño de página para impresión
    await page.setViewport({ width: 1200, height: 1600 });

    // Cargar archivo HTML
    const htmlPath = path.join(__dirname, 'GUIA_REGISTRO_ETAPA2.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    
    console.log('Cargando HTML...');
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Generar PDF en carpeta public
    const pdfPath = path.join(__dirname, 'public', 'GUIA_REGISTRO_ETAPA2.pdf');
    console.log(`Generando PDF: ${pdfPath}`);
    
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      scale: 0.8
    });

    console.log('✓ PDF generado exitosamente');
    console.log(`Archivo: ${pdfPath}`);

    await browser.close();
  } catch (error) {
    console.error('Error generando PDF:', error);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

generatePDF();
