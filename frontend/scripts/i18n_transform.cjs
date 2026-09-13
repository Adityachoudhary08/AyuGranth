const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const TARGET_FILES = [
  'src/components/passport/ActionPlanSection.jsx',
  'src/components/passport/BiodiversitySection.jsx',
  'src/components/passport/EvidenceBlock.jsx',
  'src/components/passport/IntelligenceOverview.jsx',
  'src/components/passport/InternationalSection.jsx',
  'src/components/passport/IPSection.jsx',
  'src/components/passport/PassportDisclaimer.jsx',
  'src/components/passport/PassportHeader.jsx',
  'src/components/passport/PassportTimeline.jsx',
  'src/components/passport/PassportVerification.jsx',
  'src/components/passport/ProductPassportCard.jsx',
  'src/components/passport/ProductProfileSection.jsx',
  'src/components/passport/RegulatorySection.jsx',
  'src/components/passport/WhyThisResultModal.jsx'
];

// Ignore these JSX attributes when searching for strings
const IGNORE_ATTRS = new Set([
  'className', 'id', 'name', 'type', 'href', 'to', 'key', 'color', 
  'icon', 'src', 'alt', 'method', 'action', 'target', 'rel', 
  'style', 'cx', 'cy', 'r', 'd', 'viewBox', 'fill', 'stroke',
  'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'value'
]);

let globalExtractedKeys = {};

function generateKey(text, filePath) {
  const cleanText = text.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const words = cleanText.split(' ').slice(0, 4).join('');
  const baseName = path.basename(filePath, '.jsx').toLowerCase();
  
  if (!words) return `${baseName}.str_${Math.random().toString(36).substring(2, 6)}`;
  
  const camelCase = words.charAt(0).toLowerCase() + words.slice(1);
  return `${baseName}.${camelCase}`;
}

function processFile(filePath) {
  const absolutePath = path.resolve(__dirname, '..', filePath);
  if (!fs.existsSync(absolutePath)) {
    console.warn(`File not found: ${absolutePath}`);
    return;
  }
  
  const code = fs.readFileSync(absolutePath, 'utf8');
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });

  let needsTranslationImport = false;
  let hasTranslationImport = false;
  
  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === 'react-i18next') {
        hasTranslationImport = true;
      }
    },
    
    JSXText(path) {
      const text = path.node.value.trim();
      if (!text || text.length < 2 || !/[a-zA-Z]/.test(text)) return;
      
      const key = generateKey(text, filePath);
      globalExtractedKeys[key] = text;
      needsTranslationImport = true;
      
      const tCall = t.callExpression(t.identifier('t'), [
        t.stringLiteral(key),
        t.stringLiteral(text)
      ]);
      path.replaceWith(t.jsxExpressionContainer(tCall));
    },
    
    JSXAttribute(path) {
      if (IGNORE_ATTRS.has(path.node.name.name)) return;
      
      if (path.node.value && path.node.value.type === 'StringLiteral') {
        const text = path.node.value.value.trim();
        if (!text || text.length < 2 || !/[a-zA-Z]/.test(text)) return;
        
        const key = generateKey(text, filePath);
        globalExtractedKeys[key] = text;
        needsTranslationImport = true;
        
        const tCall = t.callExpression(t.identifier('t'), [
          t.stringLiteral(key),
          t.stringLiteral(text)
        ]);
        path.node.value = t.jsxExpressionContainer(tCall);
      }
    }
  });

  if (needsTranslationImport && !hasTranslationImport) {
    const importDecl = t.importDeclaration(
      [t.importSpecifier(t.identifier('useTranslation'), t.identifier('useTranslation'))],
      t.stringLiteral('react-i18next')
    );
    ast.program.body.unshift(importDecl);
    
    traverse(ast, {
      ExportDefaultDeclaration(expPath) {
        if (expPath.node.declaration.type === 'FunctionDeclaration') {
          const body = expPath.node.declaration.body;
          if (body.type === 'BlockStatement') {
            const useTransDecl = t.variableDeclaration('const', [
              t.variableDeclarator(
                t.objectPattern([
                  t.objectProperty(t.identifier('t'), t.identifier('t'), false, true)
                ]),
                t.callExpression(t.identifier('useTranslation'), [])
              )
            ]);
            body.body.unshift(useTransDecl);
          }
        }
      }
    });
  }

  let output = generate(ast, {}, code).code;
  output = output.replace(/pt-28/g, 'pt-[140px]');
  
  fs.writeFileSync(absolutePath, output, 'utf8');
  console.log(`Processed ${filePath}`);
}

TARGET_FILES.forEach(processFile);

fs.writeFileSync(
  path.resolve(__dirname, '..', 'src/i18n/extracted_keys.json'), 
  JSON.stringify(globalExtractedKeys, null, 2), 
  'utf8'
);
console.log('Extracted keys saved to extracted_keys.json');
