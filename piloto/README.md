# Piloto empresarial de estoque

O piloto oferece cadastro de SKU, mínimos, consulta, entradas, saídas, transferências e histórico com responsável. Cada instalação atende uma empresa com banco SQLite próprio. A demonstração pública do GitHub Pages continua com dados fictícios. O servidor do piloto precisa de hospedagem com disco persistente.

## Execução de avaliação

Use Python 3. Configure SMARTSTOCK_DB com o caminho absoluto do banco em diretório privado e persistente. Configure SMARTSTOCK_USERS no ambiente do processo com um objeto JSON que associe cada login a senha e perfil. Exemplo de formato: `{"ana":{"senha":"<substitua por um segredo individual>","perfil":"gestor"}}`. Guarde a configuração fora do repositório. Os perfis aceitos são gestor, operador e consulta. Apenas gestor cadastra produtos. Gestor e operador movimentam estoque.

Na raiz do projeto, execute `python3 piloto/app.py` e abra http://127.0.0.1:8080. O navegador solicita as credenciais. Para uso remoto, sirva a aplicação WSGI através de servidor de aplicação com HTTPS e limitação de tentativas de autenticação no proxy. Restrinja acesso ao banco e aos segredos ao processo do serviço. O servidor de avaliação escuta somente em loopback.

## Escopo de avaliação

As alterações são gravadas em transação. A consulta exibe até 100 eventos recentes. Use Atualizar saldos para buscar alterações de outros usuários. A operação de ativos serializados do portfólio permanece separada. Antes de receber dados reais, validar hospedagem, restauração de backup, gestão de credenciais e operação com uma empresa piloto.

Para repetir os testes de integração, a partir da raiz execute `python3 piloto/teste_integracao.py` com a porta local 8080 livre. O teste cria usuários e banco temporários, simula movimentações, reinicia o servidor e abre uma cópia restaurada. Nenhum cadastro de cliente é necessário.
