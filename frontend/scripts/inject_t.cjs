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

function processFile(filePath) {
  const absolutePath = path.resolve(__dirname, '..', filePath);
  if (!fs.existsSync(absolutePath)) return;
  
  const code = fs.readFileSync(absolutePath, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    });
  } catch(e) {
    console.error("Error parsing", filePath, e);
    return;
  }

  let modified = false;

  traverse(ast, {
    // Check all FunctionDeclarations and ArrowFunctionExpressions
    Function(path) {
      // Check if it's a React component (heuristic: Name starts with uppercase)
      let isComponent = false;
      if (path.node.type === 'FunctionDeclaration' && path.node.id && /^[A-Z]/.test(path.node.id.name)) {
        isComponent = true;
      } else if (path.node.type === 'ArrowFunctionExpression' || path.node.type === 'FunctionExpression') {
        if (path.parent.type === 'VariableDeclarator' && /^[A-Z]/.test(path.parent.id.name)) {
          isComponent = true;
        }
      }

      if (isComponent && path.node.body.type === 'BlockStatement') {
        let hasTCall = false;
        let hasTDecl = false;

        // Traverse inside this function specifically
        path.traverse({
          CallExpression(innerPath) {
            if (innerPath.node.callee.name === 't') {
              hasTCall = true;
            }
          },
          VariableDeclarator(innerPath) {
            // Check if const { t } = useTranslation() exists
            if (innerPath.node.id.type === 'ObjectPattern') {
              for (const prop of innerPath.node.id.properties) {
                if (prop.key && prop.key.name === 't') {
                  hasTDecl = true;
                }
              }
            }
          }
        });

        if (hasTCall && !hasTDecl) {
          const useTransDecl = t.variableDeclaration('const', [
            t.variableDeclarator(
              t.objectPattern([
                t.objectProperty(t.identifier('t'), t.identifier('t'), false, true)
              ]),
              t.callExpression(t.identifier('useTranslation'), [])
            )
          ]);
          path.node.body.body.unshift(useTransDecl);
          modified = true;
          console.log(`Added useTranslation to component in ${filePath}`);
        }
      }
    }
  });

  if (modified) {
    let output = generate(ast, {}, code).code;
    fs.writeFileSync(absolutePath, output, 'utf8');
  }
}

TARGET_FILES.forEach(processFile);
console.log('Done injecting useTranslation');
