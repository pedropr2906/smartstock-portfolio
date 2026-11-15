# SmartStock v0.28 — PWA Mobile

Demonstração pública independente. Esta versão mantém o HTML e os dados do v0.27 e acrescenta um Web App Manifest, ícones e Service Worker para instalação e abertura offline da interface.

## Publicação GitHub Pages

Envie **todos** os arquivos e a pasta `icons/` para a raiz do repositório `smartstock-portfolio` na branch `main` (mantendo `index.html` na raiz). Preserve `.nojekyll`. Aguarde o Pages concluir a publicação. No celular, abra `https://pedropr2906.github.io/smartstock-portfolio/` usando HTTPS.

Android Chrome: menu ⋮ > **Instalar app** ou **Adicionar à tela inicial**. iPhone Safari: Compartilhar > **Adicionar à Tela de Início**. Os nomes das opções variam por navegador e sistema.

## Limitações

A PWA **não** acrescenta autenticação, backend, sincronização, segurança de dados ou backup automático. O armazenamento continua em `localStorage`, por origem e navegador. A interface pode abrir offline após ter sido carregada, mas dados não sincronizam entre aparelhos. Não insira dados operacionais reais no portfólio público.

## Próxima etapa: SAVCAR

Aplicar o padrão PWA/mobile na versão empresarial **sobre o HTML completo da SAVCAR**, sem substituir módulos, marca, integrações ou dados existentes. Avaliar autenticação e armazenamento seguro antes de uso real.
