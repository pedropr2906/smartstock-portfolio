# Aplicativo móvel SmartStock

Cliente Flutter para Android e iOS. Abre a instalação HTTPS configurada para a edição e oferece pesquisa por código de barras ou QR usando a câmera do aparelho. A leitura apenas preenche a consulta. O aplicativo não inclui dados operacionais, credenciais ou destinatários SMTP.

Com Flutter estável compatível com os plugins, Android SDK e, para iOS, macOS com Xcode, execute:

    python3 mobile/preparar.py /caminho/novo --org PREFIXO_DO_TITULAR --projeto NOME_INTERNO --nome "NOME NA TELA"
    cd /caminho/novo
    flutter analyze lib
    flutter run --dart-define=APP_NAME="NOME NA TELA" --dart-define=APP_URL="URL_HTTPS_DA_EDICAO"

Use uma URL individual de entrada da edição, dentro do diretório exclusivo do produto. Para testar o leitor, abra a consulta e leia o código de um produto já cadastrado. Valide câmera permitida e negada, login e encerramento de sessão, navegação, rede interrompida, retrato e paisagem em aparelhos reais. Use identificadores estáveis e distintos nas contas dos respectivos titulares. Configure ícones finais e assinatura de distribuição de cada plataforma. Use flutter build appbundle ou flutter build ipa com os mesmos defines. Para iOS configure o time no Xcode e o perfil de distribuição. Publique somente após homologação e preenchimento das fichas, privacidade e acesso de revisão no Play Console e App Store Connect.
