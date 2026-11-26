# SmartStock

**Estoque, custódia e rastreabilidade de ativos**
Projeto de portfólio de Pedro Henrique Gonçalves.

[Conhecer o projeto](https://pedropr2906.github.io/smartstock-portfolio/) · [Abrir a demonstração](https://pedropr2906.github.io/smartstock-portfolio/demo.html)

![Ilustração do painel com indicadores de estoque e dados fictícios](preview.png)

## Teste os fluxos

1. Abra a demonstração e carregue o cenário fictício no painel.
2. Consulte rastreadores, chips e tags, ou cadastre uma entrada em **Lotes e transferências**.
3. Envie um rastreador entre unidades e confirme ou recuse o recebimento. Confira o local e o histórico após a conferência.
4. Explore os indicadores, os protocolos, os saldos de insumos e a logística reversa.

## Ambiente de demonstração

Aplicação estática em HTML, CSS e JavaScript. O cenário fictício é gerado no navegador. As alterações feitas durante a demonstração ficam no navegador usado no teste. Os perfis representam a interface de acesso. Autenticação, sincronização entre dispositivos e controle de permissões no servidor exigem infraestrutura própria.

Para executar localmente, sirva a raiz do repositório com `python3 -m http.server 8000` e abra `http://localhost:8000`.
